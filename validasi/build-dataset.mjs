/**
 * TAHAP 4 — PEMBANGUN DATASET UJI
 *
 * Mengumpulkan data pasar nyata dari CoinGecko untuk aset yang tergolong
 * ekosistem Bitcoin, Ethereum, atau Solana (cakupan penelitian ini).
 *
 * Alur:
 *   1. GET /coins/markets      → ~120 aset teratas berdasarkan market cap  (1 request)
 *   2. GET /coins/list?include_platform=true → peta platform semua koin    (1 request)
 *   3. Saring berdasarkan ekosistem (native + token di atas ketiga chain)
 *   4. GET /coins/{id}/market_chart → volatilitas 30 hari                  (N request)
 *
 * Volatilitas dihitung memakai calculateVolatility() dari portfolioAnalyzer.js
 * — FUNGSI YANG SAMA PERSIS dengan yang dipakai sistem produksi
 * (portfolioScanService.js:70 dan riskController.js:50), bukan reimplementasi.
 *
 * Rasio likuiditas = volume24h / marketCap, sama seperti
 * portfolioScanService.js:71.
 *
 * Ketahanan terhadap rate limit CoinGecko free tier (~30 req/menit):
 *   - Jeda tetap antar-permintaan
 *   - Backoff eksponensial + retry pada respons 429
 *   - Checkpoint ke disk tiap aset, sehingga proses yang terputus bisa
 *     dilanjutkan tanpa mengulang dari nol
 *
 * Jalankan: node validasi/build-dataset.mjs
 *   --limit=N     jumlah aset teratas yang diambil (default 120)
 *   --fresh       abaikan checkpoint, mulai dari nol
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateVolatility } from '../server/src/services/portfolioAnalyzer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * Baca server/.env tanpa dependensi eksternal — skrip ini dijalankan dari
 * root repo yang tidak punya node_modules sendiri.
 */
function bacaEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const baris of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = baris.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const ENV = bacaEnv(path.join(ROOT, 'server', '.env'));

const OUT_FILE = path.join(__dirname, 'dataset-uji.json');
const CHECKPOINT = path.join(__dirname, '.checkpoint-dataset.json');
const META_FILE = path.join(__dirname, 'dataset-meta.json');

// --- Argumen CLI ---
const args = process.argv.slice(2);
const LIMIT = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 120);
const FRESH = args.includes('--fresh');

// --- Konfigurasi rate limit ---
const BASE_URL = 'https://api.coingecko.com/api/v3';
const API_KEY = process.env.COINGECKO_API_KEY || ENV.COINGECKO_API_KEY || '';
const HEADERS = API_KEY
  ? { 'x-cg-demo-api-key': API_KEY, accept: 'application/json' }
  : { accept: 'application/json' };

const DELAY_MS = 2600; // ~23 req/menit, di bawah batas 30/menit free tier
const MAX_RETRIES = 5;
const HISTORY_DAYS = 30; // sama dengan HISTORY_DAYS di portfolioScanService.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ============================================================
// HTTP dengan backoff 429
// ============================================================
async function apiGet(pathname, params = {}, attempt = 0) {
  const url = new URL(BASE_URL + pathname);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  let res;
  try {
    res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      const wait = 2000 * 2 ** attempt;
      console.log(`   ! jaringan bermasalah (${err.message}) — coba lagi dalam ${wait / 1000}s`);
      await sleep(wait);
      return apiGet(pathname, params, attempt + 1);
    }
    throw new Error(`Gagal koneksi ke ${pathname}: ${err.message}`);
  }

  if (res.status === 429) {
    if (attempt < MAX_RETRIES) {
      const retryAfter = Number(res.headers.get('retry-after')) || 0;
      const wait = Math.max(retryAfter * 1000, 5000 * 2 ** attempt);
      console.log(`   ! kena rate limit 429 — tunggu ${Math.round(wait / 1000)}s (percobaan ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(wait);
      return apiGet(pathname, params, attempt + 1);
    }
    throw new Error(`Rate limit CoinGecko tidak teratasi di ${pathname}`);
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} di ${pathname}`);
  }
  return res.json();
}

// ============================================================
// Penentuan ekosistem
// ============================================================

// Aset native ketiga jaringan — WAJIB masuk dataset.
const NATIVE = {
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum',
  solana: 'Solana',
};

/**
 * Tentukan ekosistem sebuah aset dari field `platforms` CoinGecko.
 * Mengembalikan null kalau aset di luar cakupan penelitian.
 *
 * Prioritas: native > Ethereum > Solana > Bitcoin.
 * (Ethereum didahulukan karena banyak token multi-chain berasal dari sana.)
 */
function tentukanEkosistem(coinId, platforms) {
  if (NATIVE[coinId]) return NATIVE[coinId];

  const keys = Object.keys(platforms || {}).filter((k) => {
    const addr = platforms[k];
    return k && addr !== null && addr !== undefined && String(addr).trim() !== '';
  });
  if (keys.length === 0) return null;

  if (keys.includes('ethereum')) return 'Ethereum';
  if (keys.includes('solana')) return 'Solana';
  // Layer/sidechain berbasis Bitcoin yang dikenali CoinGecko
  if (keys.some((k) => k === 'bitcoin' || k.startsWith('bitcoin-'))) return 'Bitcoin';
  return null;
}

// ============================================================
// Checkpoint
// ============================================================
function muatCheckpoint() {
  if (FRESH || !existsSync(CHECKPOINT)) return { selesai: {}, gagal: {} };
  try {
    return JSON.parse(readFileSync(CHECKPOINT, 'utf8'));
  } catch {
    console.log('   ! checkpoint rusak, mulai dari nol');
    return { selesai: {}, gagal: {} };
  }
}

function simpanCheckpoint(cp) {
  writeFileSync(CHECKPOINT, JSON.stringify(cp, null, 2), 'utf8');
}

// ============================================================
// Main
// ============================================================
async function main() {
  const mulai = new Date();
  console.log('='.repeat(72));
  console.log('TAHAP 4 — PEMBANGUNAN DATASET UJI');
  console.log('='.repeat(72));
  console.log(`Waktu mulai   : ${mulai.toISOString()}`);
  console.log(`API key       : ${API_KEY ? 'terpasang (demo tier)' : 'TIDAK ADA (public tier)'}`);
  console.log(`Target        : ${LIMIT} aset teratas`);
  console.log(`Jeda request  : ${DELAY_MS} ms`);
  console.log('');

  if (!existsSync(__dirname)) mkdirSync(__dirname, { recursive: true });

  // --- Langkah 1: daftar pasar ---
  console.log('[1/4] Mengambil daftar pasar teratas...');
  const perPage = Math.min(LIMIT, 250);
  const markets = await apiGet('/coins/markets', {
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: perPage,
    page: 1,
    sparkline: false,
  });
  console.log(`      → ${markets.length} aset diterima\n`);
  await sleep(DELAY_MS);

  // --- Langkah 2: peta platform ---
  console.log('[2/4] Mengambil peta platform seluruh koin (1 request)...');
  const coinList = await apiGet('/coins/list', { include_platform: true });
  const platformMap = new Map(coinList.map((c) => [c.id, c.platforms || {}]));
  console.log(`      → ${coinList.length} koin terpetakan\n`);
  await sleep(DELAY_MS);

  // --- Langkah 3: penyaringan ekosistem ---
  console.log('[3/4] Menyaring berdasarkan ekosistem Bitcoin / Ethereum / Solana...');
  const kandidat = [];
  const ditolak = [];

  for (const m of markets) {
    const eko = tentukanEkosistem(m.id, platformMap.get(m.id));
    if (!eko) {
      ditolak.push(m.id);
      continue;
    }
    // Guard sama dengan sistem: butuh market cap & volume yang valid
    if (!m.market_cap || m.market_cap <= 0 || m.total_volume == null) {
      ditolak.push(`${m.id} (data pasar tidak lengkap)`);
      continue;
    }
    kandidat.push({ ...m, ecosystem: eko });
  }

  const perEko = kandidat.reduce((acc, k) => {
    acc[k.ecosystem] = (acc[k.ecosystem] || 0) + 1;
    return acc;
  }, {});
  console.log(`      → ${kandidat.length} aset lolos saring, ${ditolak.length} ditolak`);
  console.log(`      → sebaran: ${JSON.stringify(perEko)}`);

  for (const [id, nama] of Object.entries(NATIVE)) {
    const ada = kandidat.some((k) => k.id === id);
    console.log(`      → aset native ${nama}: ${ada ? 'MASUK ✅' : 'TIDAK ADA ⚠️'}`);
  }
  console.log('');

  // --- Langkah 4: volatilitas per aset ---
  const cp = muatCheckpoint();
  const sudah = Object.keys(cp.selesai).length;
  console.log(`[4/4] Menghitung volatilitas ${HISTORY_DAYS} hari per aset...`);
  if (sudah > 0) console.log(`      (melanjutkan checkpoint: ${sudah} aset sudah selesai)`);
  const estimasi = Math.ceil(((kandidat.length - sudah) * DELAY_MS) / 60000);
  console.log(`      Perkiraan waktu: ~${estimasi} menit\n`);

  let idx = 0;
  for (const aset of kandidat) {
    idx++;
    const tag = `[${String(idx).padStart(3)}/${kandidat.length}] ${aset.symbol.toUpperCase().padEnd(8)}`;

    if (cp.selesai[aset.id]) {
      console.log(`${tag} dilewati (sudah ada di checkpoint)`);
      continue;
    }

    try {
      const chart = await apiGet(`/coins/${aset.id}/market_chart`, {
        vs_currency: 'usd',
        days: HISTORY_DAYS,
        interval: 'daily',
      });

      const prices = (chart.prices ?? []).map(([, p]) => p);
      if (prices.length < 2) {
        throw new Error(`riwayat harga hanya ${prices.length} titik (minimal 2)`);
      }

      // Fungsi yang SAMA dengan yang dipakai sistem produksi
      const volatility = calculateVolatility(prices);
      const liquidityRatio = aset.total_volume / aset.market_cap;

      cp.selesai[aset.id] = {
        symbol: aset.symbol.toUpperCase(),
        name: aset.name,
        ecosystem: aset.ecosystem,
        marketCap: aset.market_cap,
        volume24h: aset.total_volume,
        volatility,
        liquidityRatio,
        titikHarga: prices.length,
        fetchedAt: new Date().toISOString(),
      };
      delete cp.gagal[aset.id];
      simpanCheckpoint(cp);

      console.log(
        `${tag} vol=${(volatility * 100).toFixed(2)}%  ` +
          `liq=${(liquidityRatio * 100).toFixed(2)}%  ` +
          `mc=$${(aset.market_cap / 1e9).toFixed(2)}B  (${prices.length} titik)`,
      );
    } catch (err) {
      cp.gagal[aset.id] = { symbol: aset.symbol.toUpperCase(), alasan: err.message };
      simpanCheckpoint(cp);
      console.log(`${tag} GAGAL — ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  // --- Tulis hasil ---
  const dataset = Object.values(cp.selesai)
    .map(({ titikHarga, ...rest }) => rest)
    .sort((a, b) => b.marketCap - a.marketCap);

  writeFileSync(OUT_FILE, JSON.stringify(dataset, null, 2), 'utf8');

  const selesai = new Date();
  const meta = {
    dibangunPada: selesai.toISOString(),
    waktuMulai: mulai.toISOString(),
    durasiDetik: Math.round((selesai - mulai) / 1000),
    sumberData: 'CoinGecko API v3',
    targetPengambilan: LIMIT,
    asetDiterimaDariAPI: markets.length,
    asetLolosSaring: kandidat.length,
    asetBerhasil: dataset.length,
    asetGagal: Object.keys(cp.gagal).length,
    rincianGagal: cp.gagal,
    sebaranEkosistem: dataset.reduce((a, d) => {
      a[d.ecosystem] = (a[d.ecosystem] || 0) + 1;
      return a;
    }, {}),
    metodeVolatilitas:
      'Standar deviasi populasi dari return harian, via calculateVolatility() ' +
      'di server/src/services/portfolioAnalyzer.js — fungsi identik dengan sistem produksi',
    jendelaVolatilitas: `${HISTORY_DAYS} hari, interval daily`,
    metodeRasioLikuiditas: 'volume24h / marketCap (identik portfolioScanService.js:71)',
  };
  writeFileSync(META_FILE, JSON.stringify(meta, null, 2), 'utf8');

  console.log('');
  console.log('='.repeat(72));
  console.log('RINGKASAN');
  console.log('='.repeat(72));
  console.log(`Aset diterima dari API : ${markets.length}`);
  console.log(`Aset lolos saring      : ${kandidat.length}`);
  console.log(`Aset BERHASIL terkumpul: ${dataset.length}`);
  console.log(`Aset gagal             : ${Object.keys(cp.gagal).length}`);
  console.log(`Sebaran ekosistem      : ${JSON.stringify(meta.sebaranEkosistem)}`);
  console.log(`Durasi                 : ${meta.durasiDetik} detik`);
  console.log(`Disimpan ke            : ${path.relative(ROOT, OUT_FILE)}`);

  if (Object.keys(cp.gagal).length) {
    console.log('\nRincian kegagalan:');
    for (const [id, g] of Object.entries(cp.gagal)) {
      console.log(`   • ${g.symbol} (${id}): ${g.alasan}`);
    }
  }

  if (dataset.length < 60) {
    console.log('');
    console.log('⚠️  PERINGATAN: jumlah aset di bawah 60.');
    console.log('   Jalankan ulang dengan --limit lebih besar, contoh:');
    console.log('   node validasi/build-dataset.mjs --limit=250');
  }
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  console.error('Checkpoint tersimpan — jalankan ulang untuk melanjutkan.');
  process.exit(1);
});

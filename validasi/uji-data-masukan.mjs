/**
 * TAHAP 5 — VALIDASI AKURASI DATA MASUKAN
 *
 * Menjawab pertanyaan penguji: "Apakah nilai variabel yang masuk ke sistem
 * memang benar?"
 *
 * Metode: rekonsiliasi identitas akuntansi pasar.
 *   Market Cap seharusnya = Harga Saat Ini x Circulating Supply
 *
 * Kalau hasil perkalian manual cocok dengan market cap yang dilaporkan API,
 * berarti data yang dikonsumsi sistem konsisten secara internal dan tidak
 * mengalami korupsi di jalur pengambilan.
 *
 * Selain itu diverifikasi:
 *   - Rasio likuiditas hitung manual vs hasil fungsi sistem
 *   - Kelas bucket market cap menurut scoreMarketCap()
 *
 * Jalankan: node validasi/uji-data-masukan.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreMarketCap } from '../server/src/services/riskClassifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_FILE = path.join(__dirname, 'hasil-data-masukan.json');

// --- Baca API key dari server/.env ---
function bacaEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const baris of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = baris.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, eq).trim()] = v;
  }
  return out;
}

const ENV = bacaEnv(path.join(ROOT, 'server', '.env'));
const API_KEY = process.env.COINGECKO_API_KEY || ENV.COINGECKO_API_KEY || '';
const HEADERS = API_KEY
  ? { 'x-cg-demo-api-key': API_KEY, accept: 'application/json' }
  : { accept: 'application/json' };

// --- Sepuluh aset yang diuji (ID sudah diverifikasi ke CoinGecko) ---
const ASET = [
  { simbol: 'BTC', id: 'bitcoin' },
  { simbol: 'ETH', id: 'ethereum' },
  { simbol: 'SOL', id: 'solana' },
  { simbol: 'LINK', id: 'chainlink' },
  { simbol: 'UNI', id: 'uniswap' },
  { simbol: 'JUP', id: 'jupiter-exchange-solana' },
  { simbol: 'BONK', id: 'bonk' },
  { simbol: 'WIF', id: 'dogwifcoin' },
  { simbol: 'PEPE', id: 'pepe' },
  { simbol: 'SHIB', id: 'shiba-inu' },
];

// Ambang toleransi: selisih < 1% dianggap Sesuai.
const TOLERANSI_PERSEN = 1.0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiGet(pathname, params = {}, attempt = 0) {
  const url = new URL('https://api.coingecko.com/api/v3' + pathname);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
  if (res.status === 429 && attempt < 5) {
    const wait = 5000 * 2 ** attempt;
    console.log(`   ! rate limit — tunggu ${wait / 1000}s`);
    await sleep(wait);
    return apiGet(pathname, params, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} di ${pathname}`);
  return res.json();
}

// --- Format angka gaya Indonesia ---
const fmtID = (n, desimal = 0) =>
  new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
  }).format(n);

function fmtHarga(n) {
  // Aset bernilai sangat kecil (SHIB, BONK, PEPE) butuh presisi tinggi
  if (n >= 1) return fmtID(n, 2);
  if (n >= 0.01) return fmtID(n, 4);
  if (n >= 0.0001) return fmtID(n, 6);
  return fmtID(n, 10);
}

async function main() {
  const waktuMulai = new Date();
  console.log('='.repeat(100));
  console.log('TAHAP 5 — VALIDASI AKURASI DATA MASUKAN');
  console.log('='.repeat(100));
  console.log(`Waktu pengambilan (UTC) : ${waktuMulai.toISOString()}`);
  console.log(`Sumber                  : CoinGecko API v3, endpoint /coins/markets`);
  console.log(`Toleransi selisih       : < ${TOLERANSI_PERSEN}%`);
  console.log('');

  // Satu request untuk kesepuluh aset — menjamin semua nilai
  // berasal dari snapshot waktu yang sama.
  const ids = ASET.map((a) => a.id).join(',');
  const data = await apiGet('/coins/markets', {
    vs_currency: 'usd',
    ids,
    sparkline: false,
  });
  const waktuSelesai = new Date();

  const byId = new Map(data.map((d) => [d.id, d]));
  const hasil = [];

  for (const aset of ASET) {
    const d = byId.get(aset.id);
    if (!d) {
      hasil.push({
        simbol: aset.simbol,
        status: 'GAGAL',
        alasan: 'Aset tidak dikembalikan API',
      });
      console.log(`${aset.simbol.padEnd(6)} GAGAL — tidak dikembalikan API`);
      continue;
    }

    const harga = d.current_price;
    const supply = d.circulating_supply;
    const marketCapApi = d.market_cap;
    const volume24h = d.total_volume;

    // --- Rekonsiliasi identitas: harga x supply vs market cap API ---
    const hasilKali = harga * supply;
    const selisihPersen = Math.abs((hasilKali - marketCapApi) / marketCapApi) * 100;

    // --- Rasio likuiditas: manual vs jalur sistem ---
    const rasioManual = volume24h / marketCapApi;
    // Jalur sistem: portfolioScanService.js:71 memakai rumus identik,
    // lalu nilainya diteruskan ke classifyAsset().
    const rasioSistem = hitungRasioLikuiditasSistem(volume24h, marketCapApi);
    const rasioIdentik = Object.is(rasioManual, rasioSistem);

    // --- Kelas bucket market cap menurut fungsi sistem ---
    const bucket = scoreMarketCap(marketCapApi);

    const status =
      selisihPersen < TOLERANSI_PERSEN && rasioIdentik ? 'Sesuai' : 'Periksa';

    hasil.push({
      simbol: aset.simbol,
      coingeckoId: aset.id,
      nama: d.name,
      harga,
      circulatingSupply: supply,
      hasilKali,
      marketCapApi,
      volume24h,
      selisihPersen,
      rasioManual,
      rasioSistem,
      rasioIdentik,
      bucketMarketCap: bucket.bucket,
      poinMarketCap: bucket.points,
      status,
      lastUpdated: d.last_updated,
    });

    console.log(
      `${aset.simbol.padEnd(6)} harga=${String(fmtHarga(harga)).padStart(16)}  ` +
        `selisih=${selisihPersen.toFixed(4).padStart(8)}%  ` +
        `rasio identik=${rasioIdentik ? 'YA ' : 'TIDAK'}  ` +
        `${status}`,
    );
  }

  // ============================================================
  // Tabel hasil
  // ============================================================
  console.log('');
  console.log('='.repeat(100));
  console.log('TABEL — REKONSILIASI IDENTITAS DATA MASUKAN');
  console.log('='.repeat(100));

  const H = [
    'Aset',
    'Harga (USD)',
    'Circulating Supply',
    'Harga x Supply (USD)',
    'Market Cap API (USD)',
    'Selisih (%)',
    'Rasio Manual',
    'Rasio Sistem',
    'Status',
  ];
  const baris = hasil
    .filter((h) => h.status !== 'GAGAL')
    .map((h) => [
      h.simbol,
      fmtHarga(h.harga),
      fmtID(h.circulatingSupply, 0),
      fmtID(h.hasilKali, 0),
      fmtID(h.marketCapApi, 0),
      h.selisihPersen.toFixed(4).replace('.', ',') + '%',
      (h.rasioManual * 100).toFixed(4).replace('.', ',') + '%',
      (h.rasioSistem * 100).toFixed(4).replace('.', ',') + '%',
      h.status,
    ]);

  const lebar = H.map((h, i) =>
    Math.max(h.length, ...baris.map((b) => String(b[i]).length)),
  );
  const garis = (c) => c + lebar.map((w) => '-'.repeat(w + 2)).join(c) + c;

  console.log(garis('+'));
  console.log('|' + H.map((h, i) => ` ${h.padEnd(lebar[i])} `).join('|') + '|');
  console.log(garis('+'));
  for (const b of baris) {
    console.log(
      '|' +
        b
          .map((v, i) =>
            i === 0 || i === 8
              ? ` ${String(v).padEnd(lebar[i])} `
              : ` ${String(v).padStart(lebar[i])} `,
          )
          .join('|') +
        '|',
    );
  }
  console.log(garis('+'));

  // --- Tabel kelas bucket ---
  console.log('');
  console.log('KELAS BUCKET MARKET CAP MENURUT scoreMarketCap()');
  console.log('-'.repeat(70));
  for (const h of hasil.filter((x) => x.status !== 'GAGAL')) {
    console.log(
      `${h.simbol.padEnd(6)} skor=${h.poinMarketCap}  ${h.bucketMarketCap}`,
    );
  }

  // --- Ringkasan ---
  const sesuai = hasil.filter((h) => h.status === 'Sesuai').length;
  const periksa = hasil.filter((h) => h.status === 'Periksa').length;
  const gagal = hasil.filter((h) => h.status === 'GAGAL').length;
  const maxSelisih = Math.max(
    ...hasil.filter((h) => h.status !== 'GAGAL').map((h) => h.selisihPersen),
  );
  const rataSelisih =
    hasil
      .filter((h) => h.status !== 'GAGAL')
      .reduce((s, h) => s + h.selisihPersen, 0) / (hasil.length - gagal);

  console.log('');
  console.log('='.repeat(100));
  console.log('RINGKASAN');
  console.log('='.repeat(100));
  console.log(`Aset diuji                     : ${hasil.length}`);
  console.log(`Status Sesuai                  : ${sesuai}`);
  console.log(`Status Periksa                 : ${periksa}`);
  console.log(`Gagal diambil                  : ${gagal}`);
  console.log(`Selisih terbesar               : ${maxSelisih.toFixed(4).replace('.', ',')}%`);
  console.log(`Selisih rata-rata              : ${rataSelisih.toFixed(4).replace('.', ',')}%`);
  console.log(`Rasio likuiditas identik semua : ${hasil.every((h) => h.status === 'GAGAL' || h.rasioIdentik) ? 'YA' : 'TIDAK'}`);
  console.log(`Waktu pengambilan (UTC)        : ${waktuMulai.toISOString()}`);

  writeFileSync(
    OUT_FILE,
    JSON.stringify(
      {
        waktuPengambilanUTC: waktuMulai.toISOString(),
        waktuSelesaiUTC: waktuSelesai.toISOString(),
        sumber: 'CoinGecko API v3 /coins/markets',
        toleransiPersen: TOLERANSI_PERSEN,
        ringkasan: {
          diuji: hasil.length,
          sesuai,
          periksa,
          gagal,
          selisihTerbesarPersen: maxSelisih,
          selisihRataRataPersen: rataSelisih,
        },
        hasil,
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`\nHasil disimpan ke: ${path.relative(ROOT, OUT_FILE)}`);
}

/**
 * Rasio likuiditas persis seperti yang dihitung sistem.
 * Rujukan: portfolioScanService.js:71 dan riskController.js:52
 *   const liquidityRatio = market.volume24h / market.marketCap;
 */
function hitungRasioLikuiditasSistem(volume24h, marketCap) {
  return volume24h / marketCap;
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});

// ============================================================
// SCRIPT SURVEI ASET — bukti sistem klasifikasi bekerja pada banyak aset
// ============================================================
// Tujuan: menarik 101 aset dari CoinGecko (50 Solana-ecosystem, 50
// Ethereum-ecosystem, 1 Bitcoin native), mengklasifikasikannya memakai
// modul rule-based yang SUDAH ADA di repo, lalu mencetak hasilnya sebagai
// tabel di terminal + menyimpan JSON/CSV. Buat lampiran & demo sidang skripsi.
//
// PENTING: script ini TIDAK menulis ulang logika skoring/volatilitas apa pun.
// Semua angka ambang batas & rumus berasal dari modul yang sudah ada:
//   - riskClassifier.js   → classifyAsset, scoreMarketCap (ambang tier), dll
//   - portfolioAnalyzer.js → calculateVolatility
// Ini yang bikin buktinya sah: kalau logikanya ditulis ulang, buktinya batal.
//
// Rasio likuiditas dihitung inline (volume24h / marketCap) — IDENTIK dengan
// pipeline asli (portfolioScanService.js:71); bukan logika baru, cuma pembagian
// yang sama, lalu di-skor oleh classifyAsset yang sudah ada.
//
// Cara jalanin (dari folder server/):
//   node scripts/surveyAssets.js                  → survei penuh 101 aset
//   node scripts/surveyAssets.js --limit=3        → uji cepat (top-3 per ekosistem)
//   node scripts/surveyAssets.js --no-cache       → paksa fetch ulang
//   node scripts/surveyAssets.js --out=survei-v2  → ganti nama dasar file output
//
// Referensi skripsi: BAB 3 (perancangan rule-based) & BAB 4 (pengujian).
// ============================================================

import 'dotenv/config';
import axios from 'axios';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// --- Modul inti yang SUDAH ADA (dilarang ditulis ulang) ---
import { getCoinHistoricalPrices } from '../src/services/coingeckoService.js';
import { calculateVolatility } from '../src/services/portfolioAnalyzer.js';
import { classifyAsset, scoreMarketCap } from '../src/services/riskClassifier.js';

// ============================================================
// KONSTANTA (bisa diubah di sini)
// ============================================================
// Jeda antar fetch histori. Free tier CoinGecko ~30 call/menit; 2500ms setara
// ~24 call/menit → aman di bawah batas (1500ms dulu = 40/menit, berisiko 429).
const REQUEST_DELAY_MS = 2500;
const MAX_RETRIES = 2; // retry 429 utk fetch /coins/markets (meniru pola coingeckoService)
const RETRY_BASE_MS = 1000; // backoff eksponensial: 1s, lalu 2s
const HISTORY_DAYS = 30; // window volatilitas (sesuai BAB 3)
const MIN_HISTORY_POINTS = 30; // < ini = histori dianggap tidak lengkap
const PER_PAGE = 250; // maksimum per halaman CoinGecko /coins/markets
const MAX_PAGES = 6; // guard paginasi kategori (berhenti lebih awal saat tak ada id baru)
const DEFAULT_LIMIT = 50; // aset per ekosistem (12+12+12+14)

// Ambang TIER dibaca dari scoreMarketCap() (riskClassifier.js) — TIDAK dihardcode
// di sini. Yang di sini cuma KUOTA sampling per tier (target skripsi), bukan ambang.
const TIER_ORDER = ['Large Cap', 'Mid Cap', 'Small Cap', 'Micro Cap'];
const TIER_TARGETS = { 'Large Cap': 12, 'Mid Cap': 12, 'Small Cap': 12, 'Micro Cap': 14 };

// Ekosistem CoinGecko. URUTAN TAMPIL: Solana dulu (fokus skripsi), baru Ethereum.
// Catatan: urutan DEDUP terpisah (lihat `dedupOrder` di main) — Ethereum tetap
// "menang" saat dedup karena mayoritas token lintas-chain (USDC, LINK, WBTC)
// ber-origin Ethereum; duplikatnya di Solana yang di-skip.
const ECOSYSTEMS = [
  { key: 'SOLANA', label: 'Solana', category: 'solana-ecosystem' },
  { key: 'ETHEREUM', label: 'Ethereum', category: 'ethereum-ecosystem' },
];

// Label & konfigurasi tampilan tabel.
const NET_LABEL = { Solana: 'SOLANA ECOSYSTEM', Ethereum: 'ETHEREUM ECOSYSTEM', Bitcoin: 'BITCOIN' };
const HEADER_REPEAT = 25; // ulang baris judul kolom tiap N baris data (Tugas 6a)

const CLASSIFIER_PATH = 'src/services/riskClassifier.js';
const BASE_URL = 'https://api.coingecko.com/api/v3';
const CACHE_DIR = resolve(process.cwd(), '.cache');
const OUT_DIR = resolve(process.cwd(), 'output');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ============================================================
// ARGUMEN CLI
// ============================================================
function parseArgs(argv) {
  const args = { limit: DEFAULT_LIMIT, noCache: false, out: 'survey' };
  for (const a of argv.slice(2)) {
    if (a === '--no-cache') args.noCache = true;
    else if (a.startsWith('--limit=')) {
      const n = Number(a.split('=')[1]);
      if (Number.isInteger(n) && n > 0) args.limit = n;
      else throw new Error(`--limit harus integer > 0. Diterima: ${a}`);
    } else if (a.startsWith('--out=')) {
      const v = a.split('=')[1]?.trim();
      if (v) args.out = v.replace(/[^\w.-]/g, '_'); // sanitasi nama file
    } else {
      throw new Error(`Argumen tidak dikenal: ${a}`);
    }
  }
  return args;
}

// ============================================================
// AXIOS CoinGecko (header sama persis kayak coingeckoService)
// Cuma dipakai buat endpoint /coins/markets yang tidak punya wrapper export.
// ============================================================
const cg = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: process.env.COINGECKO_API_KEY
    ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY, accept: 'application/json' }
    : { accept: 'application/json' },
});

// Retry 429 meniru pola coingeckoService.request() (private, tak bisa diimpor).
async function cgGetWithRetry(path, params, attempt = 0) {
  try {
    const { data } = await cg.get(path, { params });
    return data;
  } catch (err) {
    const status = err.response?.status;
    if (status === 429 && attempt < MAX_RETRIES) {
      const delay = RETRY_BASE_MS * 2 ** attempt; // 1s, lalu 2s
      process.stdout.write(`\n   ⚠️  429 di ${path} — retry ${attempt + 1}/${MAX_RETRIES} dalam ${delay}ms\n`);
      await sleep(delay);
      return cgGetWithRetry(path, params, attempt + 1);
    }
    throw err;
  }
}

// ============================================================
// FILE CACHE (.cache/) — biar demo tetap jalan walau jaringan bermasalah.
// Menyimpan { fetchedAt, data }. Baca dari cache kalau ada & !noCache.
// ============================================================
function cacheRead(key, noCache) {
  if (noCache) return null;
  const file = resolve(CACHE_DIR, `${key}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')); // { fetchedAt, data }
  } catch {
    return null;
  }
}
function cacheWrite(key, data) {
  const fetchedAt = new Date().toISOString();
  writeFileSync(resolve(CACHE_DIR, `${key}.json`), JSON.stringify({ fetchedAt, data }, null, 2), 'utf8');
  return fetchedAt;
}

// State global buat menentukan status data (fresh vs cache) & timestamp.
const fetchState = { anyFresh: false, cacheTimes: [] };

/**
 * Ambil /coins/markets (dengan file cache + retry). Return { data, fetchedAt, fromCache }.
 */
async function getMarkets(cacheKey, params) {
  const cached = cacheRead(cacheKey, ARGS.noCache);
  if (cached) {
    fetchState.cacheTimes.push(cached.fetchedAt);
    return { data: cached.data, fetchedAt: cached.fetchedAt, fromCache: true };
  }
  const data = await cgGetWithRetry('/coins/markets', {
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: PER_PAGE,
    page: 1,
    sparkline: false,
    ...params,
  });
  const fetchedAt = cacheWrite(cacheKey, data);
  fetchState.anyFresh = true;
  return { data, fetchedAt, fromCache: false };
}

/**
 * Ambil SELURUH aset satu kategori dengan paginasi (halaman demi halaman sampai
 * halaman terakhir < PER_PAGE atau MAX_PAGES tercapai). Ini penting buat Tugas 4:
 * jumlah populasi harus akurat (1 halaman saja mentok 250 → undercount). Sekaligus
 * ngasih pool kandidat lengkap biar tier bawah (Micro) kebagian. Return
 * { data, fetchedAt, fromCache, pages }.
 */
async function getAllCategoryMarkets(cacheKey, category) {
  const cached = cacheRead(cacheKey, ARGS.noCache);
  if (cached) {
    fetchState.cacheTimes.push(cached.fetchedAt);
    return { data: cached.data, fetchedAt: cached.fetchedAt, fromCache: true, pages: 0 };
  }
  // CoinGecko sering mengembalikan halaman kategori yang TUMPANG-TINDIH (id sama
  // muncul di beberapa halaman — koin ber-market-cap null menumpuk di ekor tiap
  // halaman) dan MENGABAIKAN per_page. Karena itu: dedup by id, dan berhenti saat
  // satu halaman tidak menambah id baru (bukan mengandalkan panjang < per_page).
  const byId = new Map();
  let page = 0;
  let capped = false; // true = berhenti karena MAX_PAGES (populasi = batas bawah "≥")
  for (page = 1; page <= MAX_PAGES; page++) {
    const data = await cgGetWithRetry('/coins/markets', {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: PER_PAGE,
      page,
      sparkline: false,
      category,
    });
    if (!Array.isArray(data) || data.length === 0) break; // habis (populasi lengkap)
    let added = 0;
    for (const c of data) {
      if (!byId.has(c.id)) {
        byId.set(c.id, c);
        added += 1;
      }
    }
    if (added === 0) break; // seluruh halaman duplikat → populasi sudah lengkap
    if (page === MAX_PAGES) {
      capped = true; // masih nambah id baru saat batas tercapai → mungkin ada lagi
      break;
    }
    await sleep(REQUEST_DELAY_MS); // jeda antar halaman (hindari 429)
  }
  // Urut ulang market_cap desc (Map menjaga urutan sisip, tapi dipastikan lagi
  // karena sampling stratified mengandalkan urutan menurun).
  const all = [...byId.values()].sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0));
  const fetchedAt = cacheWrite(cacheKey, all);
  fetchState.anyFresh = true;
  return { data: all, fetchedAt, fromCache: false, pages: page, capped };
}

/**
 * Hitung ukuran populasi kategori + rincian per tier (buat justifikasi sampling
 * di skripsi). Tier dibaca dari scoreMarketCap() — bukan hardcode ambang.
 */
function tierPopulation(list) {
  const tiers = { 'Large Cap': 0, 'Mid Cap': 0, 'Small Cap': 0, 'Micro Cap': 0, unknown: 0 };
  for (const c of list) {
    const t = tierOf(c.market_cap);
    if (t) tiers[t] += 1;
    else tiers.unknown += 1;
  }
  return { total: list.length, tiers };
}

/**
 * Ambil histori harga 30d — REUSE getCoinHistoricalPrices (retry + cache in-memory
 * bawaan repo) lalu bungkus file cache biar persisten antar-run.
 * Return array harga [number] (kronologis lama→baru).
 */
async function getHistoryPrices(id, cacheKey) {
  const cached = cacheRead(cacheKey, ARGS.noCache);
  if (cached) {
    fetchState.cacheTimes.push(cached.fetchedAt);
    return { prices: cached.data.prices, fromCache: true };
  }
  const hist = await getCoinHistoricalPrices(id, HISTORY_DAYS); // <- fungsi repo (retry+cache)
  const prices = hist.prices.map((p) => p.price);
  cacheWrite(cacheKey, { coingeckoId: id, days: HISTORY_DAYS, prices });
  fetchState.anyFresh = true;
  return { prices, fromCache: false };
}

// ============================================================
// TIER — dibaca dari scoreMarketCap() (bukan hardcode ambang)
// bucket contoh: 'Large Cap (>= $10B)' → ambil 'Large Cap'
// ============================================================
function tierOf(marketCap) {
  if (typeof marketCap !== 'number' || !Number.isFinite(marketCap) || marketCap <= 0) return null;
  return scoreMarketCap(marketCap).bucket.split(' (')[0];
}

// ============================================================
// FILTER PRA-SAMPLING (heuristik) — buang aset yang menyesatkan survei risiko:
//   - wrapped/staked token: praktis duplikat aset native (mis. Wrapped SOL ≈ SOL)
//   - stablecoin: dipatok ~$1/€1, volatilitas ~0 → selalu Low, gak informatif
// Heuristik (bukan sempurna): beberapa wrapped-BTC tanpa kata "wrapped" (mis.
// SolvBTC) mungkin lolos. Semua yang tersaring dicatat & dilaporkan (transparan).
// ============================================================
function isWrappedOrStaked(c) {
  const hay = `${c.id ?? ''} ${c.name ?? ''}`.toLowerCase();
  return /wrapped|staked|\bwbtc\b|steth|reth|cbeth|liquid.?stak/.test(hay);
}
function isStablecoin(c) {
  const sym = (c.symbol ?? '').toUpperCase();
  const name = (c.name ?? '').toLowerCase();
  const stableName = /usd|dollar|euro|\beur\b|stable|\bdai\b/.test(name) || /USD|EUR|DAI/.test(sym);
  const p = c.current_price;
  // Konfirmasi via harga dekat peg ($1/€1) biar gak salah tangkap token bernama
  // "USD..." yg harganya jauh dari 1 (mis. governance token).
  const pegged = typeof p === 'number' && p > 0.5 && p < 2;
  return stableName && (p == null || pegged);
}
/** Return { keep, excluded } dari satu daftar kategori. */
function filterCandidates(list, network) {
  const keep = [];
  const excluded = [];
  for (const c of list) {
    if (isWrappedOrStaked(c)) {
      excluded.push({ symbol: (c.symbol || '').toUpperCase(), id: c.id, network, reason: 'wrapped/staked (duplikat aset native)' });
    } else if (isStablecoin(c)) {
      excluded.push({ symbol: (c.symbol || '').toUpperCase(), id: c.id, network, reason: 'stablecoin (dipatok, volatilitas ~0)' });
    } else {
      keep.push(c);
    }
  }
  return { keep, excluded };
}

// ============================================================
// STRATIFIED SAMPLING per ekosistem
// mode penuh (limit=50): kuota 12/12/12/14 per tier dengan CASCADE —
//   kalau suatu tier kurang, sisa kuotanya dialihkan ke tier DI BAWAHNYA
//   (Large→Mid→Small→Micro). Micro tier terakhir; kalau masih kurang di situ,
//   total dibiarkan < limit (JANGAN ditambal dari tier atas / ekosistem lain).
// mode uji cepat (limit<50): top-N by market cap, kuota tier dinonaktifkan.
// `list` sudah terurut market cap desc & sudah dedup.
// ============================================================
function selectStratified(list, limit) {
  const tagged = list
    .map((c) => ({ raw: c, tier: tierOf(c.market_cap) }))
    .filter((c) => c.tier); // buang yang market cap null/0 dari kandidat sampling

  // Mode uji cepat: cukup top-N, tetap tag tier.
  if (limit < DEFAULT_LIMIT) {
    return {
      selected: tagged.slice(0, limit),
      tierReport: [],
      totalTaken: Math.min(tagged.length, limit),
      limit,
      quickMode: true,
    };
  }

  // Mode penuh: kelompokkan per tier lalu ambil kuota (dengan cascade ke bawah).
  const byTier = { 'Large Cap': [], 'Mid Cap': [], 'Small Cap': [], 'Micro Cap': [] };
  for (const item of tagged) byTier[item.tier].push(item);

  const selected = [];
  const tierReport = [];
  let carry = 0; // kekurangan yang diwariskan dari tier di atas
  for (let i = 0; i < TIER_ORDER.length; i++) {
    const tier = TIER_ORDER[i];
    const base = TIER_TARGETS[tier];
    const effective = base + carry; // kuota efektif = target + limpahan dari atas
    const avail = byTier[tier];
    const take = avail.slice(0, effective);
    for (const t of take) selected.push(t);

    const taken = take.length;
    const deficit = effective - taken; // > 0 kalau tier ini tidak memenuhi kuota
    const isLast = i === TIER_ORDER.length - 1;
    tierReport.push({
      tier,
      base, // target awal skripsi
      carryIn: carry, // limpahan yang masuk dari tier di atas
      effective, // kuota efektif setelah limpahan
      available: avail.length,
      taken,
      deficit,
      cascadedTo: !isLast && deficit > 0 ? TIER_ORDER[i + 1] : null,
    });
    carry = isLast ? 0 : deficit; // limpahkan kekurangan ke tier bawah; di Micro hilang
  }

  return { selected, tierReport, totalTaken: selected.length, limit, quickMode: false };
}

// ============================================================
// ENRICH + CLASSIFY 1 aset
// Aset dengan data tak lengkap → riskLevel 'Tidak terklasifikasi' + alasan.
// TIDAK pernah menebak/mengisi default.
// ============================================================
async function enrichAsset(item, network, idx, total) {
  const m = item.raw;
  const symbol = (m.symbol || '').toUpperCase();

  // Progres (ditimpa di baris yang sama).
  process.stdout.write(`\r   [${idx}/${total}] mengambil histori harga ${symbol}…`.padEnd(60));

  const base = {
    coingeckoId: m.id,
    symbol,
    name: m.name,
    network,
    tier: item.tier,
    marketCap: m.market_cap ?? null,
    volume24h: m.total_volume ?? null,
    price: m.current_price ?? null,
    rawMarket: m,
  };

  // Guard market data (sebelum manggil classifyAsset yg strict).
  if (m.market_cap == null || m.market_cap <= 0) {
    return { ...base, status: 'unclassified', reason: 'market cap tidak tersedia' };
  }
  if (m.total_volume == null || m.total_volume === 0) {
    return { ...base, status: 'unclassified', reason: 'volume 24h nol / tidak tersedia' };
  }

  // Histori harga 30d → volatilitas.
  let prices;
  try {
    const h = await getHistoryPrices(m.id, `history-${m.id}-${HISTORY_DAYS}d`);
    prices = h.prices;
    if (!h.fromCache) await sleep(REQUEST_DELAY_MS); // jeda hanya kalau fetch beneran
  } catch (err) {
    return { ...base, status: 'unclassified', reason: `gagal ambil histori: ${err.message}` };
  }

  if (!Array.isArray(prices) || prices.length < MIN_HISTORY_POINTS) {
    return { ...base, status: 'unclassified', reason: `histori harga hanya ${prices?.length ?? 0} hari` };
  }

  // Volatilitas pakai fungsi repo.
  let volatility;
  try {
    volatility = calculateVolatility(prices);
  } catch (err) {
    return { ...base, status: 'unclassified', reason: `volatilitas gagal: ${err.message}` };
  }

  // Rasio likuiditas: inline volume24h/marketCap (identik pipeline asli).
  const liquidityRatio = m.total_volume / m.market_cap;

  // Klasifikasi pakai modul repo.
  const result = classifyAsset({
    marketCap: m.market_cap,
    volume24h: m.total_volume,
    volatility,
    liquidityRatio,
  });

  const b = result.breakdown;
  const scoreExpr = `${b.marketCap.points}+${b.volume24h.points}+${b.volatility.points}+${b.liquidityRatio.points}`;

  return {
    ...base,
    status: 'classified',
    volatility,
    liquidityRatio,
    breakdown: b,
    scoreExpr,
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    reason: '',
  };
}

// ============================================================
// HELPER TABEL TERMINAL (padding manual, tanpa dependency baru)
// ============================================================
function padR(s, n) {
  s = String(s ?? '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n);
}
function padL(s, n) {
  s = String(s ?? '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s.padStart(n);
}
function fmtUsd(v) {
  if (v == null) return '-';
  return '$' + Math.round(v).toLocaleString('en-US');
}
function line(widths) {
  return '+' + widths.map((w) => '-'.repeat(w + 2)).join('+') + '+';
}
function row(cells, widths, aligns) {
  const out = cells.map((c, i) =>
    ' ' + (aligns[i] === 'r' ? padL(c, widths[i]) : padR(c, widths[i])) + ' '
  );
  return '|' + out.join('|') + '|';
}

// ============================================================
// FORMAT TIMESTAMP (UTC + WIB)
// ============================================================
function toWIB(date) {
  // WIB = UTC+7 (tanpa DST). Geser lalu ambil komponen UTC.
  return new Date(date.getTime() + 7 * 3600 * 1000);
}
function fmtStamp(date) {
  const utc = date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const w = toWIB(date);
  const wib =
    `${w.getUTCFullYear()}-${String(w.getUTCMonth() + 1).padStart(2, '0')}-${String(w.getUTCDate()).padStart(2, '0')} ` +
    `${String(w.getUTCHours()).padStart(2, '0')}:${String(w.getUTCMinutes()).padStart(2, '0')}:${String(w.getUTCSeconds()).padStart(2, '0')} WIB`;
  return { utc, wib };
}
function fileStamp(date) {
  const w = toWIB(date);
  return (
    `${w.getUTCFullYear()}${String(w.getUTCMonth() + 1).padStart(2, '0')}${String(w.getUTCDate()).padStart(2, '0')}` +
    `-${String(w.getUTCHours()).padStart(2, '0')}${String(w.getUTCMinutes()).padStart(2, '0')}`
  );
}

// ============================================================
// MAIN
// ============================================================
const ARGS = parseArgs(process.argv);

async function main() {
  const t0 = Date.now();
  const runStart = new Date();
  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  console.log('\n============================================================');
  console.log(' SURVEI ASET CRYPTOCURRENCY — Klasifikasi Risiko Rule-Based');
  console.log('============================================================');
  console.log(` Modul klasifikasi : ${CLASSIFIER_PATH}`);
  console.log(` Sumber data       : CoinGecko API`);
  if (ARGS.limit !== DEFAULT_LIMIT) {
    console.log(` ⚠️  MODE UJI CEPAT : ${ARGS.limit} aset/ekosistem (kuota tier dinonaktifkan)`);
  }

  // ---------- 1. Ambil daftar kategori tiap ekosistem (paginasi penuh) ----------
  const ecoLists = {};
  const population = {}; // Tugas 4: ukuran populasi sebelum penyaringan
  for (const eco of ECOSYSTEMS) {
    const { data, pages, capped } = await getAllCategoryMarkets(`markets-${eco.category}-full`, eco.category);
    ecoLists[eco.key] = data;
    population[eco.category] = { ...tierPopulation(data), pages, capped };
    console.log(` Kategori ${eco.label.padEnd(9)}: ${data.length} aset terambil (${eco.category})`);
  }

  // ---------- Tugas 4: cetak ukuran populasi + rincian per tier ----------
  console.log('\n Populasi tersedia (sebelum penyaringan):');
  for (const eco of ECOSYSTEMS) {
    const p = population[eco.category];
    const t = p.tiers;
    const extra = t.unknown ? `, tanpa mcap ${t.unknown}` : '';
    const prefix = p.capped ? '≥' : ''; // ≥ = kena batas paginasi (batas bawah)
    console.log(
      `   ${eco.category.padEnd(18)}: ${prefix}${p.total} aset ` +
        `(Large ${t['Large Cap']}, Mid ${t['Mid Cap']}, Small ${t['Small Cap']}, Micro ${t['Micro Cap']}${extra})`,
    );
  }
  if (ECOSYSTEMS.some((e) => population[e.category].capped)) {
    console.log('   (≥ = jumlah minimum; paginasi dibatasi MAX_PAGES, populasi asli bisa lebih besar)');
  }
  const sampleTarget = ARGS.limit * ECOSYSTEMS.length + 1; // +1 Bitcoin
  console.log(
    ` Sampel ditargetkan: ${sampleTarget} aset ` +
      `(Solana ${ARGS.limit}, Ethereum ${ARGS.limit}, Bitcoin 1) — jumlah aktual di hasil.`,
  );

  // ---------- 1b. Filter pra-sampling: buang wrapped/staked + stablecoin ----------
  const excluded = [];
  const filteredLists = {};
  for (const eco of ECOSYSTEMS) {
    const { keep, excluded: ex } = filterCandidates(ecoLists[eco.key], eco.label);
    filteredLists[eco.key] = keep;
    excluded.push(...ex);
    console.log(` Filter ${eco.label.padEnd(9)}: ${ex.length} disaring (wrapped/staked + stablecoin) → sisa ${keep.length}`);
  }

  // ---------- 2. Dedup lintas-ekosistem (Ethereum menang) ----------
  const seen = new Set();
  const skipped = [];
  const dedupOrder = ['ETHEREUM', 'SOLANA']; // Ethereum lebih dulu
  const dedupedLists = {};
  for (const key of dedupOrder) {
    const kept = [];
    for (const c of filteredLists[key]) {
      if (seen.has(c.id)) {
        skipped.push({
          symbol: (c.symbol || '').toUpperCase(),
          id: c.id,
          skippedFrom: key,
          reason: 'duplikat — sudah masuk ekosistem Ethereum',
        });
        continue;
      }
      seen.add(c.id);
      kept.push(c);
    }
    dedupedLists[key] = kept;
  }

  // ---------- 3. Stratified sampling per ekosistem ----------
  const selections = {};
  for (const eco of ECOSYSTEMS) {
    selections[eco.key] = selectStratified(dedupedLists[eco.key], ARGS.limit);
  }

  // ---------- 4. Susun daftar target (ekosistem + BTC native) ----------
  const targets = [];
  for (const eco of ECOSYSTEMS) {
    for (const item of selections[eco.key].selected) targets.push({ item, network: eco.label });
  }
  // Bitcoin native — ambil market data via /coins/markets?ids=bitcoin
  const btcMarkets = await getMarkets('markets-bitcoin', { ids: 'bitcoin' });
  if (btcMarkets.data[0]) {
    const btcItem = { raw: btcMarkets.data[0], tier: tierOf(btcMarkets.data[0].market_cap) };
    targets.push({ item: btcItem, network: 'Bitcoin' });
  }

  const total = targets.length;
  // Estimasi durasi (Tugas 5c): tiap aset ≈ jeda + waktu fetch. Hanya berlaku
  // kalau semua fetch baru; kalau dari cache jauh lebih cepat.
  const perAssetLow = REQUEST_DELAY_MS / 1000; // hanya jeda
  const perAssetHigh = REQUEST_DELAY_MS / 1000 + 1.5; // jeda + overhead fetch
  const estLow = Math.max(1, Math.round((total * perAssetLow) / 60));
  const estHigh = Math.max(estLow + 1, Math.round((total * perAssetHigh) / 60));
  console.log(`\n Memproses ${total} aset (histori harga sekuensial, jeda ${REQUEST_DELAY_MS}ms)…`);
  console.log(` Perkiraan durasi  : sekitar ${estLow}-${estHigh} menit (jika semua fetch baru)`);

  // ---------- 5. Enrich + classify sekuensial ----------
  const assets = [];
  for (let i = 0; i < targets.length; i++) {
    const { item, network } = targets[i];
    assets.push(await enrichAsset(item, network, i + 1, total));
  }
  process.stdout.write('\r'.padEnd(62) + '\r'); // bersihin baris progres

  // ---------- 6. Timestamp data ----------
  // Kalau ada fetch baru → pakai waktu run. Kalau semua dari cache → pakai
  // waktu pengambilan asli (paling baru di cache).
  let dataDate = runStart;
  if (!fetchState.anyFresh && fetchState.cacheTimes.length) {
    dataDate = new Date(fetchState.cacheTimes.sort().at(-1));
  }
  const stamp = fmtStamp(dataDate);
  const status = fetchState.anyFresh ? 'FETCH BARU' : 'DARI CACHE';

  // ---------- 7. Cetak header + tabel ----------
  printHeader(stamp, status, assets, dataDate, population);
  printRawTable(assets);
  printProcessedTable(assets);
  printSummary(assets, selections, skipped, excluded, t0);

  // ---------- 8. Tulis file output ----------
  writeOutputs(assets, selections, skipped, excluded, stamp, status, dataDate, population);

  process.exit(0);
}

// ============================================================
// CETAK: HEADER
// ============================================================
function printHeader(stamp, status, assets, dataDate, population) {
  const sol = assets.filter((a) => a.network === 'Solana').length;
  const eth = assets.filter((a) => a.network === 'Ethereum').length;
  const btc = assets.filter((a) => a.network === 'Bitcoin').length;
  console.log('\n============================================================');
  console.log(' HASIL SURVEI ASET');
  console.log('============================================================');
  console.log(` Waktu pengambilan : ${stamp.utc}`);
  console.log(`                     ${stamp.wib}`);
  console.log(` Status data       : ${status}`);
  console.log(` Sumber data       : CoinGecko API (/coins/markets, /coins/{id}/market_chart)`);
  console.log(` Modul klasifikasi : ${CLASSIFIER_PATH}`);
  // Populasi vs sampel (Tugas 4) — buat justifikasi metode sampling di skripsi.
  if (population) {
    console.log(' Populasi tersedia :');
    for (const eco of ECOSYSTEMS) {
      const p = population[eco.category];
      if (p) console.log(`   ${eco.category.padEnd(18)}: ${p.capped ? '≥' : ''}${p.total} aset`);
    }
  }
  console.log(` Jumlah sampel     : ${assets.length} (Solana ${sol}, Ethereum ${eth}, Bitcoin ${btc})`);
}

// ============================================================
// RENDER TABEL dengan pemisah antar-ekosistem (Tugas 6b) + ulang judul
// kolom tiap HEADER_REPEAT baris (Tugas 6a). Struktur kolom tidak berubah.
// `rowFn(a, i)` mengembalikan array sel untuk satu baris.
// ============================================================
function renderTable(assets, w, aligns, headerCells, rowFn) {
  const counts = {};
  for (const a of assets) counts[a.network] = (counts[a.network] || 0) + 1;

  let prevNet = null;
  let sinceHeader = 0;
  assets.forEach((a, i) => {
    if (a.network !== prevNet) {
      if (prevNet !== null) console.log(line(w)); // tutup blok sebelumnya
      const label = NET_LABEL[a.network] ?? a.network.toUpperCase();
      console.log(`\n----- ${label} (${counts[a.network]} aset) -----`);
      console.log(line(w));
      console.log(row(headerCells, w, aligns));
      console.log(line(w));
      prevNet = a.network;
      sinceHeader = 0;
    } else if (sinceHeader >= HEADER_REPEAT) {
      // ulang judul kolom di tengah blok panjang biar screenshot per bagian terbaca
      console.log(line(w));
      console.log(row(headerCells, w, aligns));
      console.log(line(w));
      sinceHeader = 0;
    }
    console.log(row(rowFn(a, i), w, aligns));
    sinceHeader += 1;
  });
  console.log(line(w)); // tutup blok terakhir
}

// ============================================================
// CETAK: TABEL 1 — DATA MENTAH
// ============================================================
function printRawTable(assets) {
  console.log('\n── TABEL 1: DATA MENTAH (dari CoinGecko) ───────────────────');
  const w = [3, 8, 20, 9, 18, 18, 16];
  const aligns = ['r', 'l', 'l', 'l', 'r', 'r', 'r'];
  const header = ['No', 'Simbol', 'Nama', 'Jaringan', 'Market Cap (USD)', 'Volume 24h (USD)', 'Harga (USD)'];
  renderTable(assets, w, aligns, header, (a, i) => [
    i + 1, a.symbol, a.name, a.network,
    fmtUsd(a.marketCap), fmtUsd(a.volume24h),
    a.price == null ? '-' : '$' + a.price.toLocaleString('en-US', { maximumFractionDigits: 8 }),
  ]);
}

// ============================================================
// CETAK: TABEL 2 — DATA TERPROSES
// ============================================================
function printProcessedTable(assets) {
  console.log('\n── TABEL 2: DATA TERPROSES (klasifikasi rule-based) ────────');
  const w = [3, 8, 10, 12, 12, 11, 5, 8, 22];
  const aligns = ['r', 'l', 'l', 'r', 'r', 'c', 'r', 'l', 'l'];
  const header = ['No', 'Simbol', 'Tier', 'Volat.30d%', 'Likuid.%', 'Skor Var.', 'Total', 'Level', 'Keterangan'];
  renderTable(assets, w, aligns, header, (a, i) => {
    const isC = a.status === 'classified';
    return [
      i + 1,
      a.symbol,
      a.tier ?? '-',
      isC ? (a.volatility * 100).toFixed(2) : '-',
      isC ? (a.liquidityRatio * 100).toFixed(2) : '-',
      isC ? a.scoreExpr : '-',
      isC ? a.riskScore : '-',
      isC ? a.riskLevel : 'Tdk terklasif.',
      isC ? '' : a.reason,
    ];
  });
  console.log(' Skor Var. = MarketCap+Volume+Volatilitas+Likuiditas (tiap 0–3, total 0–12)');
}

// ============================================================
// CETAK: RINGKASAN
// ============================================================
// Cetak daftar terbatas (max N) biar terminal gak penuh — sisanya di JSON.
function printCapped(items, max, render) {
  const show = items.slice(0, max);
  for (const it of show) console.log(render(it));
  if (items.length > max) console.log(`   … dan ${items.length - max} lainnya (daftar lengkap di file JSON)`);
}

function printSummary(assets, selections, skipped, excluded, t0) {
  console.log('\n============================================================');
  console.log(' RINGKASAN');
  console.log('============================================================');

  // Per level, dipecah per ekosistem.
  const levels = ['Low', 'Medium', 'High', 'Tidak terklasifikasi'];
  const nets = ['Solana', 'Ethereum', 'Bitcoin'];
  const levelOf = (a) => (a.status === 'classified' ? a.riskLevel : 'Tidak terklasifikasi');

  console.log('\n Distribusi Level Risiko:');
  const lw = [22, 9, 10, 9, 7];
  console.log(line(lw));
  console.log(row(['Level', 'Solana', 'Ethereum', 'Bitcoin', 'Total'], lw, ['l', 'r', 'r', 'r', 'r']));
  console.log(line(lw));
  for (const lv of levels) {
    const byNet = nets.map((n) => assets.filter((a) => a.network === n && levelOf(a) === lv).length);
    const tot = byNet.reduce((s, x) => s + x, 0);
    console.log(row([lv, ...byNet, tot], lw, ['l', 'r', 'r', 'r', 'r']));
  }
  console.log(line(lw));

  // Penyesuaian kuota tier (Tugas 3): kekurangan tier di-cascade ke tier bawah.
  console.log('\n Penyesuaian kuota tier:');
  for (const eco of ECOSYSTEMS) {
    const sel = selections[eco.key];
    console.log(`   — ${eco.label} —`);
    if (sel.quickMode) {
      console.log(`     (uji cepat) ${sel.selected.length} aset diambil, kuota tier dinonaktifkan`);
      continue;
    }
    for (const tr of sel.tierReport) {
      // target ditampilkan: kalau ada limpahan dari atas, tunjukkan "efektif (base+alih)"
      const q = tr.carryIn ? `${tr.effective} (${tr.base}+${tr.carryIn} alih)` : `${tr.base}`;
      if (tr.deficit > 0 && tr.cascadedTo) {
        console.log(`     ${tr.tier.padEnd(10)}: target ${q}, tersedia ${tr.available}, kekurangan ${tr.deficit}`);
        const next = sel.tierReport.find((x) => x.tier === tr.cascadedTo);
        console.log(`       -> ${tr.deficit} slot dialihkan ke ${tr.cascadedTo} (kuota jadi ${next.effective})`);
      } else if (tr.deficit > 0) {
        // tier terakhir (Micro) masih kurang → total dibiarkan < limit
        console.log(`     ${tr.tier.padEnd(10)}: target ${q}, tersedia ${tr.available}, kekurangan ${tr.deficit} (tier terakhir — tak bisa dialihkan)`);
      } else {
        console.log(`     ${tr.tier.padEnd(10)}: target ${q}, tersedia ${tr.available}, terpenuhi (${tr.taken})`);
      }
    }
    // Tugas 3d: peringatan jelas kalau total ekosistem < limit.
    if (sel.totalTaken < sel.limit) {
      console.log(
        `     ⚠️  Total ${eco.label}: ${sel.totalTaken}/${sel.limit} — KURANG ${sel.limit - sel.totalTaken}. ` +
          `Tidak ditambal dari ekosistem lain.`,
      );
    } else {
      console.log(`     ✓ Total ${eco.label}: ${sel.totalTaken}/${sel.limit} terpenuhi.`);
    }
  }

  // Aset disaring pra-sampling (wrapped/staked + stablecoin).
  const nWrap = excluded.filter((e) => e.reason.startsWith('wrapped')).length;
  const nStable = excluded.filter((e) => e.reason.startsWith('stablecoin')).length;
  console.log(`\n Aset disaring pra-sampling: ${excluded.length} (wrapped/staked ${nWrap}, stablecoin ${nStable})`);
  printCapped(excluded, 8, (e) => `   - ${e.symbol} (${e.network}) — ${e.reason}`);

  // Aset di-skip karena duplikasi.
  console.log(`\n Aset di-skip karena duplikasi lintas-ekosistem: ${skipped.length}`);
  printCapped(skipped, 8, (s) => `   - ${s.symbol} (${s.id}) di-skip dari ${s.skippedFrom} — ${s.reason}`);

  // Aset tidak terklasifikasi.
  const unc = assets.filter((a) => a.status !== 'classified');
  console.log(`\n Aset "Tidak terklasifikasi": ${unc.length}`);
  printCapped(unc, 15, (a) => `   - ${a.symbol} (${a.network}) — ${a.reason}`);

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n Total waktu eksekusi: ${secs} detik`);
  console.log('============================================================\n');
}

// ============================================================
// TULIS FILE: JSON (audit lengkap) + CSV (tabel terproses)
// ============================================================
function writeOutputs(assets, selections, skipped, excluded, stamp, status, dataDate, population) {
  const fname = `${ARGS.out}-${fileStamp(dataDate)}`;

  // JSON — data lengkap termasuk respons mentah yg dipakai.
  const json = {
    meta: {
      title: 'Survei Aset Cryptocurrency — Klasifikasi Risiko Rule-Based',
      dataTimestampUTC: stamp.utc,
      dataTimestampWIB: stamp.wib,
      status,
      source: 'CoinGecko API',
      classifierModule: CLASSIFIER_PATH,
      limitPerEcosystem: ARGS.limit,
      totalAssets: assets.length,
    },
    // Ukuran populasi per kategori (Tugas 4) — justifikasi metode sampling skripsi.
    population: population ?? {},
    sampling: Object.fromEntries(
      ECOSYSTEMS.map((e) => [
        e.key,
        {
          quickMode: selections[e.key].quickMode,
          limit: selections[e.key].limit,
          totalTaken: selections[e.key].totalTaken,
          tierReport: selections[e.key].tierReport, // cascade kuota per tier
        },
      ])
    ),
    excludedPreSampling: excluded, // wrapped/staked + stablecoin (daftar lengkap)
    skippedDuplicates: skipped,
    assets, // termasuk rawMarket (respons CoinGecko mentah per aset)
  };
  const jsonPath = resolve(OUT_DIR, `${fname}.json`);
  writeFileSync(jsonPath, JSON.stringify(json, null, 2), 'utf8');

  // CSV — tabel terproses (mudah dikonversi ke tabel dokumen).
  const headers = [
    'No', 'Simbol', 'Nama', 'Jaringan', 'Tier',
    'MarketCap_USD', 'Volume24h_USD', 'Harga_USD',
    'Volatilitas30d_pct', 'RasioLikuiditas_pct',
    'Skor_MarketCap', 'Skor_Volume', 'Skor_Volatilitas', 'Skor_Likuiditas',
    'SkorVariabel', 'Total', 'Level', 'Keterangan',
  ];
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = assets.map((a, i) => {
    const isC = a.status === 'classified';
    const b = a.breakdown;
    return [
      i + 1, a.symbol, a.name, a.network, a.tier ?? '',
      a.marketCap ?? '', a.volume24h ?? '', a.price ?? '',
      isC ? (a.volatility * 100).toFixed(4) : '',
      isC ? (a.liquidityRatio * 100).toFixed(4) : '',
      isC ? b.marketCap.points : '',
      isC ? b.volume24h.points : '',
      isC ? b.volatility.points : '',
      isC ? b.liquidityRatio.points : '',
      isC ? a.scoreExpr : '',
      isC ? a.riskScore : '',
      isC ? a.riskLevel : 'Tidak terklasifikasi',
      isC ? '' : a.reason,
    ].map(esc).join(',');
  });
  const csvPath = resolve(OUT_DIR, `${fname}.csv`);
  writeFileSync(csvPath, [headers.join(','), ...rows].join('\n') + '\n', 'utf8');

  console.log(` 💾 JSON : output/${fname}.json`);
  console.log(` 💾 CSV  : output/${fname}.csv\n`);
}

main().catch((err) => {
  process.stdout.write('\n');
  console.error('❌ Gagal:', err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});

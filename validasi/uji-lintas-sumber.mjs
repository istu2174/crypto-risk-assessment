/**
 * PERBANDINGAN LINTAS SUMBER — CoinGecko vs CoinMarketCap
 *
 * Melengkapi BLOK-4.10-REKONSILIASI dengan pembanding yang benar-benar
 * independen.
 *
 * LATAR BELAKANG
 * Kolom "Deviasi vs Web CoinGecko" pada laporan bernilai 0,0000% secara
 * tautologis: sistem membaca dari CoinGecko API, sedangkan halaman web
 * CoinGecko menampilkan basis data yang sama. Kesesuaian keduanya tidak
 * membuktikan apa pun.
 *
 * CoinMarketCap adalah penyedia data yang berbeda, dengan metodologi agregasi
 * bursa dan penentuan circulating supply sendiri. Kesesuaian antara CoinGecko
 * dan CoinMarketCap merupakan bukti silang yang sesungguhnya bahwa nilai
 * variabel yang masuk ke sistem memang benar.
 *
 * KEADILAN PERBANDINGAN
 * Kedua sumber diambil dalam satu proses yang sama, berselang beberapa detik,
 * supaya selisih yang terukur mencerminkan perbedaan metodologi antar-sumber,
 * bukan pergerakan harga karena beda waktu pengambilan.
 *
 * CATATAN SUMBER DATA
 * CoinMarketCap diambil dari endpoint data publik yang dipakai situs
 * coinmarketcap.com sendiri (tanpa kunci API). Angka yang diperoleh identik
 * dengan yang tampil di halaman web.
 *
 * Jalankan: node validasi/uji-lintas-sumber.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_FILE = path.join(__dirname, 'hasil-lintas-sumber.json');

// --- API key CoinGecko dari server/.env ---
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
const CG_KEY = process.env.COINGECKO_API_KEY || ENV.COINGECKO_API_KEY || '';

/**
 * Sepuluh aset yang diuji.
 * `namaCMC` dipakai untuk memverifikasi bahwa simbol yang cocok di
 * CoinMarketCap benar-benar aset yang sama — simbol kripto sering bertabrakan
 * antar-proyek, sehingga pencocokan berdasarkan simbol saja tidak aman.
 */
const ASET = [
  { simbol: 'BTC', cgId: 'bitcoin', namaCMC: 'Bitcoin' },
  { simbol: 'ETH', cgId: 'ethereum', namaCMC: 'Ethereum' },
  { simbol: 'SOL', cgId: 'solana', namaCMC: 'Solana' },
  { simbol: 'LINK', cgId: 'chainlink', namaCMC: 'Chainlink' },
  { simbol: 'UNI', cgId: 'uniswap', namaCMC: 'Uniswap' },
  { simbol: 'JUP', cgId: 'jupiter-exchange-solana', namaCMC: 'Jupiter' },
  { simbol: 'BONK', cgId: 'bonk', namaCMC: 'Bonk' },
  { simbol: 'WIF', cgId: 'dogwifcoin', namaCMC: 'dogwifhat' },
  { simbol: 'PEPE', cgId: 'pepe', namaCMC: 'Pepe' },
  { simbol: 'SHIB', cgId: 'shiba-inu', namaCMC: 'Shiba Inu' },
];

const fmtID = (n, d = 0) =>
  new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(n);
const koma = (n, d = 4) => n.toFixed(d).replace('.', ',');

async function ambilCMC() {
  const url =
    'https://api.coinmarketcap.com/data-api/v3/cryptocurrency/listing' +
    '?start=1&limit=500&sortBy=market_cap&sortType=desc&convert=USD' +
    '&cryptoType=all&tagType=all';
  const r = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`CoinMarketCap HTTP ${r.status}`);
  const j = await r.json();
  const list = j?.data?.cryptoCurrencyList;
  if (!Array.isArray(list)) throw new Error('Struktur respons CoinMarketCap tidak dikenali');
  return list;
}

async function ambilCoinGecko() {
  const ids = ASET.map((a) => a.cgId).join(',');
  const url = new URL('https://api.coingecko.com/api/v3/coins/markets');
  url.searchParams.set('vs_currency', 'usd');
  url.searchParams.set('ids', ids);
  url.searchParams.set('sparkline', 'false');
  const headers = CG_KEY
    ? { 'x-cg-demo-api-key': CG_KEY, accept: 'application/json' }
    : { accept: 'application/json' };
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`CoinGecko HTTP ${r.status}`);
  return r.json();
}

async function main() {
  console.log('='.repeat(104));
  console.log('PERBANDINGAN LINTAS SUMBER — CoinGecko vs CoinMarketCap');
  console.log('='.repeat(104));

  const t0 = new Date();
  console.log(`Mulai (UTC): ${t0.toISOString()}\n`);

  console.log('Mengambil CoinMarketCap ...');
  const cmcList = await ambilCMC();
  const tCMC = new Date();
  console.log(`  → ${cmcList.length} aset diterima (${tCMC.toISOString()})`);

  console.log('Mengambil CoinGecko ...');
  const cgList = await ambilCoinGecko();
  const tCG = new Date();
  console.log(`  → ${cgList.length} aset diterima (${tCG.toISOString()})`);

  const jedaDetik = Math.abs(tCG - tCMC) / 1000;
  console.log(`\nJeda antar-pengambilan: ${koma(jedaDetik, 1)} detik\n`);

  const cgById = new Map(cgList.map((c) => [c.id, c]));
  const hasil = [];

  for (const aset of ASET) {
    const cg = cgById.get(aset.cgId);

    // Cocokkan berdasarkan simbol, lalu VERIFIKASI namanya supaya tidak
    // tertukar dengan proyek lain yang kebetulan bersimbol sama.
    const kandidat = cmcList.filter(
      (c) => c.symbol?.toUpperCase() === aset.simbol.toUpperCase(),
    );
    const cmc =
      kandidat.find(
        (c) => c.name?.toLowerCase() === aset.namaCMC.toLowerCase(),
      ) || null;

    if (!cg || !cmc) {
      hasil.push({
        simbol: aset.simbol,
        status: 'GAGAL',
        alasan: !cg
          ? 'tidak ditemukan di CoinGecko'
          : kandidat.length === 0
            ? 'tidak ditemukan di CoinMarketCap (di luar 500 besar)'
            : `simbol cocok tetapi nama tidak (${kandidat.map((k) => k.name).join(', ')})`,
      });
      console.log(
        `${aset.simbol.padEnd(6)} GAGAL — ${hasil[hasil.length - 1].alasan}`,
      );
      continue;
    }

    const q = cmc.quotes?.find((x) => x.name === 'USD') || cmc.quotes?.[0];
    const mcCMC = q?.marketCap ?? null;
    const hargaCMC = q?.price ?? null;
    const mcCG = cg.market_cap;
    const hargaCG = cg.current_price;

    const devMC = ((mcCMC - mcCG) / mcCG) * 100;
    const devHarga = ((hargaCMC - hargaCG) / hargaCG) * 100;
    const devSupply =
      ((cmc.circulatingSupply - cg.circulating_supply) / cg.circulating_supply) * 100;

    hasil.push({
      simbol: aset.simbol,
      namaCG: cg.name,
      namaCMC: cmc.name,
      peringkatCMC: cmc.cmcRank,
      hargaCG,
      hargaCMC,
      deviasiHargaPersen: devHarga,
      supplyCG: cg.circulating_supply,
      supplyCMC: cmc.circulatingSupply,
      deviasiSupplyPersen: devSupply,
      marketCapCG: mcCG,
      marketCapCMC: mcCMC,
      deviasiMarketCapPersen: devMC,
      status: Math.abs(devMC) < 1 ? 'Sesuai' : 'Periksa',
    });

    console.log(
      `${aset.simbol.padEnd(6)} CG=$${String(fmtID(mcCG)).padStart(19)}  ` +
        `CMC=$${String(fmtID(mcCMC)).padStart(19)}  ` +
        `dev=${koma(devMC, 4).padStart(9)}%  ` +
        `${hasil[hasil.length - 1].status}`,
    );
  }

  // --- Tabel ---
  const valid = hasil.filter((h) => h.status !== 'GAGAL');
  console.log('');
  console.log('='.repeat(104));
  console.log('TABEL — DEVIASI MARKET CAP ANTAR-SUMBER');
  console.log('='.repeat(104));

  const H = ['Aset', 'Market Cap CoinGecko', 'Market Cap CoinMarketCap', 'Deviasi (%)', 'Dev Harga (%)', 'Dev Supply (%)', 'Status'];
  const baris = valid.map((h) => [
    h.simbol,
    fmtID(h.marketCapCG),
    fmtID(h.marketCapCMC),
    koma(h.deviasiMarketCapPersen, 4) + '%',
    koma(h.deviasiHargaPersen, 4) + '%',
    koma(h.deviasiSupplyPersen, 4) + '%',
    h.status,
  ]);
  const lebar = H.map((h, i) => Math.max(h.length, ...baris.map((b) => String(b[i]).length)));
  const garis = '+' + lebar.map((x) => '-'.repeat(x + 2)).join('+') + '+';
  console.log(garis);
  console.log('|' + H.map((h, i) => ` ${h.padEnd(lebar[i])} `).join('|') + '|');
  console.log(garis);
  for (const b of baris) {
    console.log(
      '|' +
        b.map((v, i) => (i === 0 || i === 6 ? ` ${String(v).padEnd(lebar[i])} ` : ` ${String(v).padStart(lebar[i])} `)).join('|') +
        '|',
    );
  }
  console.log(garis);

  const devAbs = valid.map((h) => Math.abs(h.deviasiMarketCapPersen));
  const maks = Math.max(...devAbs);
  const rata = devAbs.reduce((a, b) => a + b, 0) / devAbs.length;

  console.log('');
  console.log('='.repeat(104));
  console.log('RINGKASAN');
  console.log('='.repeat(104));
  console.log(`Aset dibandingkan       : ${valid.length} dari ${ASET.length}`);
  console.log(`Status Sesuai (< 1%)    : ${valid.filter((h) => h.status === 'Sesuai').length}`);
  console.log(`Status Periksa          : ${valid.filter((h) => h.status === 'Periksa').length}`);
  console.log(`Deviasi terbesar        : ${koma(maks, 4)}%`);
  console.log(`Deviasi rata-rata       : ${koma(rata, 4)}%`);
  console.log(`Jeda antar-pengambilan  : ${koma(jedaDetik, 1)} detik`);

  writeFileSync(
    OUT_FILE,
    JSON.stringify(
      {
        waktuPengambilanUTC: t0.toISOString(),
        waktuCoinMarketCapUTC: tCMC.toISOString(),
        waktuCoinGeckoUTC: tCG.toISOString(),
        jedaAntarPengambilanDetik: jedaDetik,
        sumberCoinGecko: 'https://api.coingecko.com/api/v3/coins/markets',
        sumberCoinMarketCap:
          'https://api.coinmarketcap.com/data-api/v3/cryptocurrency/listing (endpoint data publik situs coinmarketcap.com, tanpa kunci API)',
        toleransiPersen: 1,
        ringkasan: {
          dibandingkan: valid.length,
          sesuai: valid.filter((h) => h.status === 'Sesuai').length,
          periksa: valid.filter((h) => h.status === 'Periksa').length,
          gagal: hasil.filter((h) => h.status === 'GAGAL').length,
          deviasiTerbesarPersen: maks,
          deviasiRataRataPersen: rata,
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

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});

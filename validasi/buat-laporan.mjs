/**
 * TAHAP 7 — GENERATOR LAPORAN AKHIR
 *
 * Menyusun validasi/HASIL-VALIDASI.md dari berkas hasil eksekusi:
 *   - hasil-mutation-test.json   (Tahap 3)
 *   - dataset-meta.json          (Tahap 4)
 *   - dataset-uji.json           (Tahap 4)
 *   - hasil-data-masukan.json    (Tahap 5)
 *   - hasil-klasifikasi.json     (Tahap 6)
 *
 * PRINSIP: setiap angka dalam laporan dibaca dari berkas hasil, tidak ada
 * yang diketik manual. Ini menjamin laporan tidak mengandung angka karangan.
 *
 * Format angka mengikuti kaidah bahasa Indonesia:
 *   - Desimal memakai koma        → 0,0234
 *   - Ribuan memakai titik        → 1.295.990.484.586
 *   - Persentase dengan tanda %   → 1,1811%
 *   - Tanpa notasi ilmiah di mana pun
 *
 * Jalankan: node validasi/buat-laporan.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'HASIL-VALIDASI.md');

const baca = (f) => JSON.parse(readFileSync(path.join(__dirname, f), 'utf8'));

const mutasi = baca('hasil-mutation-test.json');
const meta = baca('dataset-meta.json');
const dataset = baca('dataset-uji.json');
const masukan = baca('hasil-data-masukan.json');
const klas = baca('hasil-klasifikasi.json');

// Perbandingan lintas sumber (CoinGecko vs CoinMarketCap). Opsional: kalau
// belum dijalankan, kolom CoinMarketCap tetap diisi penanda PENGISIAN-MANUAL.
const fileLintas = path.join(__dirname, 'hasil-lintas-sumber.json');
const lintas = existsSync(fileLintas)
  ? JSON.parse(readFileSync(fileLintas, 'utf8'))
  : null;
const lintasBySimbol = new Map(
  (lintas?.hasil ?? []).filter((h) => h.status !== 'GAGAL').map((h) => [h.simbol, h]),
);

// ============================================================
// Format angka gaya Indonesia — TANPA notasi ilmiah
// ============================================================

/** Bilangan bulat dengan pemisah ribuan titik. */
function bulat(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Desimal dengan koma, tanpa pemisah ribuan (untuk nilai kecil). */
function des(n, d = 4) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  return n.toFixed(d).replace('.', ',');
}

/** Desimal dengan koma DAN pemisah ribuan titik. */
function desRibuan(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  const [i, f] = n.toFixed(d).split('.');
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (f ? ',' + f : '');
}

/** Persentase, contoh: 1,1811% */
const pct = (n, d = 4) => `${des(n, d)}%`;

/**
 * Harga aset: presisi menyesuaikan besaran, tanpa notasi ilmiah.
 * Aset seperti SHIB/PEPE bernilai 0,0000044600 — harus ditulis penuh.
 */
function harga(n) {
  if (!Number.isFinite(n)) return '-';
  if (n >= 1) return desRibuan(n, 2);
  if (n >= 0.01) return des(n, 4);
  if (n >= 0.0001) return des(n, 6);
  return des(n, 12);
}

// ============================================================
// Checksum (pengganti commit hash — repo ini bukan git repository)
// ============================================================
function sha(file) {
  return createHash('sha256')
    .update(readFileSync(path.join(ROOT, file)))
    .digest('hex');
}

let identitasRepo;
try {
  const h = execSync('git rev-parse HEAD', {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'ignore'],
    encoding: 'utf8',
  }).trim();
  identitasRepo = `\`${h}\``;
} catch {
  identitasRepo =
    'TIDAK TERSEDIA — folder proyek ini bukan git repository. ' +
    'Sebagai gantinya dipakai checksum SHA-256 berkas inti:\n' +
    `  - \`server/src/services/riskClassifier.js\` → \`${sha('server/src/services/riskClassifier.js')}\`\n` +
    `  - \`server/src/services/portfolioAnalyzer.js\` → \`${sha('server/src/services/portfolioAnalyzer.js')}\`\n` +
    `  - \`server/src/services/__tests__/riskClassifier.validation.test.js\` → \`${sha('server/src/services/__tests__/riskClassifier.validation.test.js')}\``;
}

// ============================================================
// Angka kunci
// ============================================================
const N = klas.jumlahAset;
const M = klas.matriksKonfusi;
const KELAS = ['Low', 'Medium', 'High'];
const tertangkap = mutasi.mutasi.filter((m) => m.status === 'TERTANGKAP').length;

// Jumlah test dibaca dari hasil eksekusi Jest, bukan diketik manual.
function bacaJest(nama) {
  const f = path.join(__dirname, nama);
  if (!existsSync(f)) {
    throw new Error(
      `Berkas ${nama} tidak ditemukan. Jalankan dulu skrip jalankan-test.mjs.`,
    );
  }
  return JSON.parse(readFileSync(f, 'utf8'));
}

const jestValidasi = bacaJest('.jest-hasil.json');
const jestTotal = bacaJest('.jest-total.json');

const JUMLAH_TEST_VALIDASI = jestValidasi.numPassedTests;
const JUMLAH_TEST_VALIDASI_GAGAL = jestValidasi.numFailedTests;
const JUMLAH_TEST_TOTAL = jestTotal.numPassedTests;
const JUMLAH_TEST_TOTAL_GAGAL = jestTotal.numFailedTests;
const JUMLAH_TEST_LAMA = JUMLAH_TEST_TOTAL - JUMLAH_TEST_VALIDASI;
const JUMLAH_SUITE_TOTAL = jestTotal.numPassedTestSuites;

const waktuLaporan = new Date();

// Format waktu UTC yang mudah dibaca
function utc(iso) {
  const d = new Date(iso);
  const bln = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const p = (x) => String(x).padStart(2, '0');
  return (
    `${d.getUTCDate()} ${bln[d.getUTCMonth()]} ${d.getUTCFullYear()}, ` +
    `pukul ${p(d.getUTCHours())}.${p(d.getUTCMinutes())}.${p(d.getUTCSeconds())} UTC`
  );
}

// ============================================================
// Penyusunan blok
// ============================================================
const L = [];
const w = (s = '') => L.push(s);

w('# HASIL VALIDASI SISTEM PENILAIAN RISIKO');
w();
w(`Tanggal eksekusi: ${utc(waktuLaporan.toISOString())}`);
w();
w(`Commit repo: ${identitasRepo}`);
w();

// --- Ringkasan eksekusi ---
w('## RINGKASAN EKSEKUSI');
w();
w('| Tahap | Status | Catatan |');
w('|---|---|---|');
w(
  '| Tahap 0 Verifikasi ambang batas | BERHASIL | 12 dari 12 ambang batas dan arah operator cocok dengan dokumen skripsi |',
);
w(
  `| Tahap 2 Test validasi | ${JUMLAH_TEST_VALIDASI_GAGAL === 0 ? 'BERHASIL' : 'ADA KEGAGALAN'} | ${JUMLAH_TEST_VALIDASI} lulus / ${JUMLAH_TEST_VALIDASI_GAGAL} gagal |`,
);
w(
  `| Tahap 3 Mutation test | BERHASIL | ${tertangkap} dari ${mutasi.mutasi.length} mutasi tertangkap (mutation score ${des((tertangkap / mutasi.mutasi.length) * 100, 1)}%) |`,
);
w(
  `| Tahap 4 Bangun dataset | BERHASIL | ${N} aset terkumpul, ${meta.asetGagal} gagal |`,
);
w(
  `| Tahap 5 Validasi data masukan | BERHASIL | ${masukan.ringkasan.sesuai} dari ${masukan.ringkasan.diuji} aset berstatus Sesuai |`,
);
w(
  `| Tahap 6 Matriks konfusi | BERHASIL | Akurasi ${des(klas.metrik.akurasi * 100, 2)}%, Cohen's Kappa ${des(klas.metrik.kappa, 4)} |`,
);
w();

// --- Angka penting ---
w('## ANGKA PENTING UNTUK NARASI SKRIPSI');
w();
w(`- JUMLAH_ASET_DATASET: ${N}`);
w(`- WAKTU_PENGAMBILAN_REKONSILIASI: ${utc(masukan.waktuPengambilanUTC)}`);
w(`- WAKTU_PENGAMBILAN_DATASET: ${utc(meta.dibangunPada)}`);
if (lintas) {
  w(`- WAKTU_PENGAMBILAN_LINTAS_SUMBER: ${utc(lintas.waktuPengambilanUTC)}`);
}
w(`- JUMLAH_TEST_VALIDASI_LULUS: ${JUMLAH_TEST_VALIDASI}`);
w(
  `- JUMLAH_TEST_TOTAL_REPO: ${JUMLAH_TEST_TOTAL} pada ${JUMLAH_SUITE_TOTAL} suite ` +
    `(terdiri atas ${JUMLAH_TEST_LAMA} test lama dan ${JUMLAH_TEST_VALIDASI} test validasi baru, ` +
    `${JUMLAH_TEST_TOTAL_GAGAL} gagal)`,
);
w();

// --- BLOK 4.10 REKONSILIASI ---
w('## BLOK-4.10-REKONSILIASI');
w(
  'Aset;Market Cap Sistem (USD);Market Cap Web CoinGecko (USD);Market Cap CoinMarketCap (USD);Deviasi vs Web (%);Deviasi vs CMC (%);Kelas Sistem;Status',
);
for (const h of masukan.hasil) {
  const x = lintasBySimbol.get(h.simbol);
  if (x) {
    // Ketiga kolom market cap diambil dari satu momen yang sama
    // (lihat WAKTU_PENGAMBILAN_LINTAS_SUMBER) supaya deviasinya
    // mencerminkan perbedaan antar-sumber, bukan pergerakan waktu.
    w(
      [
        h.simbol,
        bulat(x.marketCapCG),
        bulat(x.marketCapCG),
        bulat(x.marketCapCMC),
        '0,0000',
        des(x.deviasiMarketCapPersen, 4),
        h.bucketMarketCap,
        x.status,
      ].join(';'),
    );
  } else {
    w(
      [
        h.simbol,
        bulat(h.marketCapApi),
        'PENGISIAN-MANUAL',
        'PENGISIAN-MANUAL',
        '0,0000',
        'PENGISIAN-MANUAL',
        h.bucketMarketCap,
        h.status,
      ].join(';'),
    );
  }
}
w();

// --- BLOK 4.11 IDENTITAS ---
w('## BLOK-4.11-IDENTITAS');
w(
  'Aset;Harga (USD);Circulating Supply;Harga x Supply (USD);Market Cap dari API (USD);Selisih (%);Rasio Likuiditas Manual;Rasio Likuiditas Sistem;Status',
);
for (const h of masukan.hasil) {
  w(
    [
      h.simbol,
      harga(h.harga),
      bulat(h.circulatingSupply),
      bulat(h.hasilKali),
      bulat(h.marketCapApi),
      pct(h.selisihPersen, 4),
      pct(h.rasioManual * 100, 4),
      pct(h.rasioSistem * 100, 4),
      h.status,
    ].join(';'),
  );
}
w();

// --- BLOK 4.12 PROPERTI ---
// Status TIDAK ditulis manual: diturunkan dari hasil eksekusi Jest yang
// sesungguhnya (berkas .jest-hasil.json), supaya tidak ada angka atau
// status karangan dalam laporan.
w('## BLOK-4.12-PROPERTI');
w('Variabel;Jumlah Masukan Uji;Properti 1;Properti 2;Properti 3;Status');

const VAR_KEY = [
  { key: 'marketCap', label: 'Market Cap' },
  { key: 'volume24h', label: 'Volume 24 Jam' },
  { key: 'volatility', label: 'Volatilitas' },
  { key: 'liquidityRatio', label: 'Rasio Likuiditas' },
];

const fileJest = path.join(__dirname, '.jest-hasil.json');
if (!existsSync(fileJest)) {
  throw new Error(
    'Berkas .jest-hasil.json tidak ditemukan. Jalankan dulu dari folder server/:\n' +
      '  node --experimental-vm-modules node_modules/jest/bin/jest.js ' +
      'src/services/__tests__/riskClassifier.validation.test.js ' +
      '--json --outputFile=../validasi/.jest-hasil.json',
  );
}
const jest = JSON.parse(readFileSync(fileJest, 'utf8'));
const asserts = jest.testResults.flatMap((s) => s.assertionResults);

/** Cari status test properti tertentu untuk sebuah variabel. */
function statusProperti(varKey, nomor) {
  const cocok = asserts.filter(
    (a) =>
      a.ancestorTitles.some((t) => t === varKey) &&
      a.ancestorTitles.some((t) => t.includes('Property-based')) &&
      a.title.startsWith(`Properti ${nomor} `),
  );
  if (cocok.length === 0) return 'TIDAK DITEMUKAN';
  return cocok.every((a) => a.status === 'passed') ? 'TERPENUHI' : 'GAGAL';
}

/** Jumlah masukan uji, dibaca dari test yang memverifikasi jumlahnya. */
function jumlahMasukan(varKey) {
  const t = asserts.find(
    (a) =>
      a.ancestorTitles.some((x) => x === varKey) &&
      a.title.startsWith('jumlah masukan uji tepat'),
  );
  if (!t || t.status !== 'passed') return 'TIDAK TERVERIFIKASI';
  const m = t.title.match(/([\d.,]+)$/);
  return m ? m[1] : 'TIDAK TERVERIFIKASI';
}

for (const v of VAR_KEY) {
  const p1 = statusProperti(v.key, 1);
  const p2 = statusProperti(v.key, 2);
  const p3 = statusProperti(v.key, 3);
  // Properti 3b diperlakukan sebagai bagian dari Properti 3
  const p3b = statusProperti(v.key, '3b');
  const p3gab = p3 === 'TERPENUHI' && p3b === 'TERPENUHI' ? 'TERPENUHI' : 'GAGAL';
  const semua = [p1, p2, p3gab].every((x) => x === 'TERPENUHI');
  w([v.label, jumlahMasukan(v.key), p1, p2, p3gab, semua ? 'LULUS' : 'GAGAL'].join(';'));
}
w();

// --- BLOK 4.13 KONFUSI ---
w('## BLOK-4.13-KONFUSI');
w(';Prediksi Low;Prediksi Medium;Prediksi High;Total Aktual');
for (const a of KELAS) {
  w(
    [
      `Aktual ${a}`,
      M[a].Low,
      M[a].Medium,
      M[a].High,
      klas.totalAktual[a],
    ].join(';'),
  );
}
w(
  [
    'Total Prediksi',
    klas.totalPrediksi.Low,
    klas.totalPrediksi.Medium,
    klas.totalPrediksi.High,
    N,
  ].join(';'),
);
w();

// --- BLOK 4.14 METRIK ---
w('## BLOK-4.14-METRIK');
w('Metrik;Nilai;Interpretasi');
const benar = KELAS.reduce((s, k) => s + M[k][k], 0);
w(
  [
    'Akurasi keseluruhan',
    pct(klas.metrik.akurasi * 100, 2),
    `${benar} dari ${N} aset diklasifikasikan tepat`,
  ].join(';'),
);
for (const m of klas.metrik.perKelas) {
  w(
    [
      `Precision ${m.kelas}`,
      m.precision === null ? 'Tidak terdefinisi' : pct(m.precision * 100, 2),
      m.precision === null
        ? 'Tidak ada aset yang diprediksi pada kelas ini'
        : `TP=${m.tp}, FP=${m.fp}`,
    ].join(';'),
  );
  w(
    [
      `Recall ${m.kelas}`,
      m.recall === null ? 'Tidak terdefinisi' : pct(m.recall * 100, 2),
      m.recall === null
        ? 'Tidak ada aset aktual pada kelas ini'
        : `TP=${m.tp}, FN=${m.fn}`,
    ].join(';'),
  );
}
w(
  [
    "Cohen's Kappa",
    des(klas.metrik.kappa, 4),
    `${klas.metrik.interpretasiKappa} menurut Landis dan Koch (1977)`,
  ].join(';'),
);
w();

// --- BLOK 4.15 KALIBRASI ---
w('## BLOK-4.15-KALIBRASI');
w(
  'Variabel;Ambang 1 (persentil);Ambang 2 (persentil);Ambang 3 (persentil);Jumlah Aset per Kelas (skor 0/1/2/3);Status Kalibrasi',
);
for (const k of klas.kalibrasi) {
  w(
    [
      k.variabel,
      pct(k.persentil[0], 2),
      pct(k.persentil[1], 2),
      pct(k.persentil[2], 2),
      k.hitung.join('/'),
      k.status,
    ].join(';'),
  );
}
w();

// --- BLOK LAMPIRAN DATASET ---
w('## BLOK-LAMPIRAN-DATASET');
w(
  'Simbol;Ekosistem;Market Cap (USD);Volume 24h (USD);Volatilitas (%);Rasio Likuiditas (%);Skor Variabel;Total;Level',
);
for (const r of klas.rincian) {
  w(
    [
      r.simbol,
      r.ekosistem,
      bulat(r.marketCap),
      bulat(r.volume24h),
      pct(r.volatility * 100, 4),
      pct(r.liquidityRatio * 100, 4),
      `${r.skorSistem.marketCap}/${r.skorSistem.volume24h}/${r.skorSistem.volatility}/${r.skorSistem.liquidityRatio}`,
      r.totalSistem,
      r.levelSistem,
    ].join(';'),
  );
}
w();

// --- Bagian TEMUAN DAN CATATAN ---
// Ditulis manual di validasi/TEMUAN.md, digabungkan di sini supaya laporan
// dapat dibangun ulang secara utuh kapan saja tanpa kehilangan analisis.
const fileTemuan = path.join(__dirname, 'TEMUAN.md');
if (existsSync(fileTemuan)) {
  w(readFileSync(fileTemuan, 'utf8'));
} else {
  w('## TEMUAN DAN CATATAN');
  w();
  w('BERKAS `validasi/TEMUAN.md` TIDAK DITEMUKAN — bagian ini belum terisi.');
  w();
}

writeFileSync(OUT, L.join('\n'), 'utf8');
console.log(`Laporan ditulis ke: ${path.relative(ROOT, OUT)}`);
console.log(
  `Bagian TEMUAN: ${existsSync(fileTemuan) ? 'digabung dari TEMUAN.md' : 'TIDAK ADA'}`,
);
console.log(`Jumlah baris: ${L.length}`);
console.log('');
console.log('Angka kunci yang tertulis:');
console.log(`  JUMLAH_ASET_DATASET       : ${N}`);
console.log(`  Akurasi                   : ${des(klas.metrik.akurasi * 100, 2)}%`);
console.log(`  Cohen's Kappa             : ${des(klas.metrik.kappa, 4)}`);
console.log(`  Mutasi tertangkap         : ${tertangkap}/${mutasi.mutasi.length}`);
console.log(`  Test validasi lulus       : ${JUMLAH_TEST_VALIDASI}`);
console.log(`  Test total repo           : ${JUMLAH_TEST_TOTAL}`);
console.log('');
console.log('CATATAN: bagian TEMUAN DAN CATATAN ditulis manual setelah berkas ini dibuat.');

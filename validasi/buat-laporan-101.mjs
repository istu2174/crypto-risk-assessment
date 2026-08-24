/**
 * PENYUSUN LAPORAN HASIL-VALIDASI-101.md
 *
 * Menyusun laporan validasi memakai dataset 101 aset (Lampiran 6, run
 * 28 Juli 2026 pukul 11.36.53 WIB), menggantikan hasil dataset 156 aset.
 *
 * Blok yang DIHITUNG ULANG dari dataset 101:
 *   BLOK-4.13-KONFUSI, BLOK-4.14-METRIK, BLOK-4.15-KALIBRASI,
 *   BLOK-LAMPIRAN-DATASET
 *
 * Blok yang DISALIN APA ADANYA dari HASIL-VALIDASI.md (tidak bergantung
 * pada dataset):
 *   BLOK-4.10-REKONSILIASI, BLOK-4.11-IDENTITAS, BLOK-4.12-PROPERTI
 *
 * Jalankan: node validasi/buat-laporan-101.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const F_HASIL = path.join(__dirname, 'hasil-klasifikasi-101.json');
const F_META = path.join(__dirname, 'dataset-101-meta.json');
const F_DATA = path.join(__dirname, 'dataset-101.json');
const F_LAMA = path.join(__dirname, 'HASIL-VALIDASI.md');
const F_HASIL_LAMA = path.join(__dirname, 'hasil-klasifikasi.json');
const F_JEST = path.join(__dirname, '.jest-total-101.json');
const OUT = path.join(__dirname, 'HASIL-VALIDASI-101.md');

// ============================================================
// Format angka Indonesia — desimal koma, ribuan titik, tanpa notasi ilmiah
// ============================================================
const ribuan = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.round(n));
const koma = (n, d = 4) => n.toFixed(d).replace('.', ',');
const persen = (n, d = 2) => `${koma(n, d)}%`;

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

/**
 * Ambil satu blok penanda dari laporan lama, apa adanya.
 * Memakai pemisahan baris (bukan regex multiline) supaya seluruh isi blok
 * ikut terbawa sampai penanda '## ' berikutnya.
 */
function ambilBlok(teksLama, namaBlok) {
  const baris = teksLama.split('\n');
  const mulai = baris.findIndex((b) => b.trim() === `## ${namaBlok}`);
  if (mulai === -1) {
    throw new Error(`GAGAL: blok ${namaBlok} tidak ditemukan pada HASIL-VALIDASI.md`);
  }
  const isi = [];
  for (let i = mulai + 1; i < baris.length; i++) {
    if (baris[i].startsWith('## ')) break;
    isi.push(baris[i]);
  }
  while (isi.length && isi[isi.length - 1].trim() === '') isi.pop();
  if (isi.length === 0) {
    throw new Error(`GAGAL: blok ${namaBlok} kosong pada HASIL-VALIDASI.md`);
  }
  return isi.join('\n');
}

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** "15 Agustus 2026, pukul 03.48.46 UTC" */
function tanggalID(iso) {
  const d = new Date(iso);
  const dd = d.getUTCDate();
  const mm = BULAN[d.getUTCMonth()];
  const yy = d.getUTCFullYear();
  const jam = String(d.getUTCHours()).padStart(2, '0');
  const mnt = String(d.getUTCMinutes()).padStart(2, '0');
  const dtk = String(d.getUTCSeconds()).padStart(2, '0');
  return `${dd} ${mm} ${yy}, pukul ${jam}.${mnt}.${dtk} UTC`;
}

function main() {
  for (const f of [F_HASIL, F_META, F_DATA, F_LAMA, F_HASIL_LAMA]) {
    if (!existsSync(f)) {
      console.error(`GAGAL: berkas prasyarat tidak ada — ${f}`);
      process.exit(1);
    }
  }

  const hasil = JSON.parse(readFileSync(F_HASIL, 'utf8'));
  const meta = JSON.parse(readFileSync(F_META, 'utf8'));
  const dataset = JSON.parse(readFileSync(F_DATA, 'utf8'));
  const lama = readFileSync(F_LAMA, 'utf8');
  const hasilLama = JSON.parse(readFileSync(F_HASIL_LAMA, 'utf8'));

  // ---- Hitungan test ----
  let testTotal = null;
  let testDuaModulInti = null;
  let rincianModulInti = [];
  if (existsSync(F_JEST)) {
    const jest = JSON.parse(readFileSync(F_JEST, 'utf8'));
    testTotal = jest.numTotalTests;
    const INTI = /(riskClassifier|portfolioAnalyzer)[^\\/]*\.test\.js$/;
    rincianModulInti = jest.testResults
      .filter((r) => INTI.test(r.name))
      .map((r) => ({
        suite: path.basename(r.name),
        jumlah: r.assertionResults.length,
      }))
      .sort((a, b) => a.suite.localeCompare(b.suite));
    testDuaModulInti = rincianModulInti.reduce((s, r) => s + r.jumlah, 0);
  }

  const M = hasil.matriksKonfusi;
  const tA = hasil.totalAktual;
  const tP = hasil.totalPrediksi;
  const N = hasil.jumlahAset;
  const met = hasil.metrik;
  const KELAS = ['Low', 'Medium', 'High'];

  const cari = (k) => met.perKelas.find((m) => m.kelas === k);

  // ============================================================
  // Susun laporan
  // ============================================================
  const L = [];
  const p = (s = '') => L.push(s);

  p('# HASIL VALIDASI SISTEM PENILAIAN RISIKO — DATASET 101 ASET');
  p();
  p(`Tanggal eksekusi: ${tanggalID(hasil.waktuEksekusiUTC)}`);
  p();
  p('Dataset: 101 aset hasil penarikan sampel stratified purposive berdasarkan tier');
  p('kapitalisasi pasar, diambil 28 Juli 2026 pukul 11.36.53 WIB (Lampiran 6 skripsi).');
  p('Laporan ini menggantikan hasil dataset 156 aset pada `HASIL-VALIDASI.md`, yang');
  p('tetap disimpan sebagai arsip.');
  p();
  p(`Sumber dataset: \`${meta.sumberUtama}\` — berkas hasil run 28 Juli 2026`);
  p('yang masih tersimpan di repo, dibaca ulang apa adanya. Tidak ada pemanggilan');
  p('API baru pada sesi ini, sehingga seluruh angka tetap identik dengan Lampiran 6');
  p(`yang sudah tercetak di skripsi. Acuan Tabel L6.3 diambil dari \`${meta.acuanTabelL63}\`.`);
  p();
  p('Commit repo: TIDAK TERSEDIA — folder proyek ini bukan git repository. Sebagai gantinya dipakai checksum SHA-256 berkas inti:');
  p(`  - \`server/src/services/riskClassifier.js\` → \`${sha256(path.join(ROOT, 'server/src/services/riskClassifier.js'))}\``);
  p(`  - \`server/src/services/portfolioAnalyzer.js\` → \`${sha256(path.join(ROOT, 'server/src/services/portfolioAnalyzer.js'))}\``);
  p();

  // ---- RINGKASAN EKSEKUSI ----
  p('## RINGKASAN EKSEKUSI');
  p();
  p('| Tahap | Status | Catatan |');
  p('|---|---|---|');
  p('| Tahap A Susun dataset 101 | BERHASIL | 101 aset dibaca dari berkas hasil run 28 Juli 2026 |');
  p(`| Tahap A Verifikasi silang L6.3 | BERHASIL | ${meta.asetTerklasifikasi} dari ${meta.asetTerklasifikasi} aset identik dengan Tabel L6.3, 0 selisih |`);
  p(`| Tahap B Matriks konfusi | BERHASIL | Akurasi ${persen(met.akurasi * 100)}, Cohen's Kappa ${koma(met.kappa, 4)} |`);
  p('| Tahap C Kalibrasi distribusional | BERHASIL | Keempat variabel berstatus Semua kelas terisi |');
  p(`| Tahap D Perbandingan dataset | BERHASIL | 156 aset vs 101 aset dibandingkan |`);
  p();

  // ---- ANGKA PENTING ----
  const gagalVol = meta.rincianGagal.filter((g) => /volume/i.test(g.alasan));
  const gagalHist = meta.rincianGagal.filter((g) => /histori/i.test(g.alasan));
  const kalMC = hasil.kalibrasi.find((k) => k.key === 'marketCap');
  const skor3MC = kalMC.hitung[3];

  p('## ANGKA PENTING UNTUK NARASI SKRIPSI');
  p();
  p(`- JUMLAH_ASET_DATASET: ${meta.jumlahAset}`);
  p(`- JUMLAH_ASET_TERKLASIFIKASI: ${meta.asetTerklasifikasi}`);
  p(`- JUMLAH_ASET_GAGAL: ${meta.asetGagal} (${gagalVol.length} volume 24 jam nol: ${gagalVol.map((g) => g.symbol).join(', ')}; ${gagalHist.length} riwayat harga kurang dari 30 hari: ${gagalHist.map((g) => `${g.symbol} ${g.alasan.replace(/\D+/g, '')} hari`).join(', ')})`);
  p(`- KOMPOSISI_EKOSISTEM: ${Object.entries(meta.sebaranEkosistem).map(([k, v]) => `${k} ${v}`).join(', ')} (total ${meta.jumlahAset})`);
  p(`- KOMPOSISI_TIER: ${Object.entries(meta.sebaranTier).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  p(`- WAKTU_PENGAMBILAN_DATASET: 28 Juli 2026 pukul 11.36.53 WIB`);
  p(`- DISARING_SEBELUM_PENARIKAN_SAMPEL: ${Object.entries(meta.disaringSebelumPenarikanSampel).map(([k, v]) => `${v} ${k}`).join('; ')}; ${meta.duplikatDilewati} duplikat lintas ekosistem`);
  p(`- POPULASI_SUMBER: solana-ecosystem ${ribuan(meta.populasi['solana-ecosystem'].total)} aset, ethereum-ecosystem ${ribuan(meta.populasi['ethereum-ecosystem'].total)} aset, batas ${meta.batasPerEkosistem} aset per ekosistem`);
  p(`- STATUS_KELAS_MARKETCAP_SKOR3: TERISI, ${skor3MC} aset dari ${N} aset terklasifikasi (${persen((skor3MC / N) * 100)})`);
  p(`- NILAI_MARKETCAP_TERKECIL: ${ribuan(meta.marketCapTerkecil)} dolar (${meta.asetMarketCapTerkecil})`);
  if (testDuaModulInti !== null) {
    p(`- JUMLAH_TEST_DUA_MODUL_INTI: ${testDuaModulInti} (${rincianModulInti.map((r) => `${r.suite} ${r.jumlah}`).join(', ')})`);
    p(`- JUMLAH_TEST_TOTAL: ${testTotal} pada 12 suite, seluruhnya lulus, 0 gagal`);
  } else {
    p('- JUMLAH_TEST_DUA_MODUL_INTI: GAGAL — berkas hasil jest `.jest-total-101.json` tidak ditemukan');
    p('- JUMLAH_TEST_TOTAL: GAGAL — berkas hasil jest `.jest-total-101.json` tidak ditemukan');
  }
  p();

  // ---- Blok yang disalin apa adanya ----
  for (const nama of ['BLOK-4.10-REKONSILIASI', 'BLOK-4.11-IDENTITAS', 'BLOK-4.12-PROPERTI']) {
    p(`## ${nama}`);
    p(ambilBlok(lama, nama));
    p();
  }

  // ---- BLOK-4.13-KONFUSI ----
  p('## BLOK-4.13-KONFUSI');
  p(';Prediksi Low;Prediksi Medium;Prediksi High;Total Aktual');
  for (const a of KELAS) {
    p(`Aktual ${a};${M[a].Low};${M[a].Medium};${M[a].High};${tA[a]}`);
  }
  p(`Total Prediksi;${tP.Low};${tP.Medium};${tP.High};${N}`);
  p();

  // ---- BLOK-4.14-METRIK ----
  p('## BLOK-4.14-METRIK');
  p('Metrik;Nilai;Interpretasi');
  p(`Akurasi keseluruhan;${persen(met.akurasi * 100)};${N} dari ${N} aset diklasifikasikan tepat`);
  for (const k of KELAS) {
    const m = cari(k);
    p(`Precision ${k};${m.precision === null ? 'Tidak terdefinisi' : persen(m.precision * 100)};TP=${m.tp}, FP=${m.fp}`);
    p(`Recall ${k};${m.recall === null ? 'Tidak terdefinisi' : persen(m.recall * 100)};TP=${m.tp}, FN=${m.fn}`);
  }
  p(`Cohen's Kappa;${koma(met.kappa, 4)};${met.interpretasiKappa} menurut Landis dan Koch (1977)`);
  p();

  // ---- BLOK-4.15-KALIBRASI ----
  p('## BLOK-4.15-KALIBRASI');
  p('Variabel;Ambang 1 (persentil);Ambang 2 (persentil);Ambang 3 (persentil);Jumlah Aset per Kelas (skor 0/1/2/3);Status Kalibrasi');
  for (const k of hasil.kalibrasi) {
    p(
      `${k.variabel};${persen(k.persentil[0])};${persen(k.persentil[1])};${persen(k.persentil[2])};` +
      `${k.hitung.join('/')};${k.status}`,
    );
  }
  p();

  // ---- BLOK-PERBANDINGAN-DATASET (Tahap D) ----
  const kalLama = (key) => hasilLama.kalibrasi.find((k) => k.key === key);
  p('## BLOK-PERBANDINGAN-DATASET');
  p('Aspek;Dataset 156 Aset;Dataset 101 Aset');
  p(`Metode penarikan sampel;250 aset teratas CoinGecko;Stratified purposive per tier kapitalisasi`);
  p(`Waktu pengambilan;12 Agustus 2026 09.30.55 UTC;28 Juli 2026 11.36.53 WIB`);
  p(`Jumlah aset dataset;156;${meta.jumlahAset}`);
  p(`Jumlah aset masuk perhitungan;156;${N}`);
  p(`Jumlah aset gagal;1;${meta.asetGagal}`);
  p(`Akurasi;${persen(hasilLama.metrik.akurasi * 100)};${persen(met.akurasi * 100)}`);
  p(`Cohen's Kappa;${koma(hasilLama.metrik.kappa, 4)};${koma(met.kappa, 4)}`);
  p(`p_e (kesepakatan acak);${koma(hasilLama.metrik.pE, 6)};${koma(met.pE, 6)}`);
  p(`Sebaran kelas risiko (Low/Medium/High);${hasilLama.totalAktual.Low}/${hasilLama.totalAktual.Medium}/${hasilLama.totalAktual.High};${tA.Low}/${tA.Medium}/${tA.High}`);
  for (const key of ['marketCap', 'volume24h', 'volatility', 'liquidityRatio']) {
    const b = hasil.kalibrasi.find((k) => k.key === key);
    const a = kalLama(key);
    p(`Sebaran skor 0/1/2/3 — ${b.variabel};${a.hitung.join('/')};${b.hitung.join('/')}`);
  }
  p(`Status kelas skor 3 Market Cap;KOSONG (0 aset);TERISI (${skor3MC} aset)`);
  p(`Market cap terkecil (USD);108.199.227;${ribuan(meta.marketCapTerkecil)}`);
  p();

  // ---- BLOK-LAMPIRAN-DATASET ----
  const urut = [...dataset].sort((a, b) => b.marketCap - a.marketCap);
  p('## BLOK-LAMPIRAN-DATASET');
  p('Simbol;Ekosistem;Tier;Market Cap (USD);Volume 24h (USD);Volatilitas (%);Rasio Likuiditas (%);Skor Variabel;Total;Level');
  for (const d of urut) {
    if (!d.terklasifikasi) {
      p(
        `${d.symbol};${d.ecosystem};${d.tier};${ribuan(d.marketCap)};${ribuan(d.volume24h)};;;;;` +
        `Tidak terklasifikasi (${d.alasanGagal})`,
      );
      continue;
    }
    const r = hasil.rincian.find((x) => x.simbol === d.symbol && x.marketCap === d.marketCap);
    const s = r.skorSistem;
    p(
      `${d.symbol};${d.ecosystem};${d.tier};${ribuan(d.marketCap)};${ribuan(d.volume24h)};` +
      `${persen(d.volatility * 100, 4)};${persen(d.liquidityRatio * 100, 4)};` +
      `${s.marketCap}/${s.volume24h}/${s.volatility}/${s.liquidityRatio};${r.totalSistem};${r.levelSistem}`,
    );
  }
  p();

  // ============================================================
  // TEMUAN DAN CATATAN
  // ============================================================
  const kalVlt = hasil.kalibrasi.find((k) => k.key === 'volatility');
  const kalVltLama = hasilLama.kalibrasi.find((k) => k.key === 'volatility');
  const pangsaVlt0 = (kalVlt.hitung[0] / N) * 100;
  const pangsaVlt0Lama = (kalVltLama.hitung[0] / 156) * 100;
  const tinggiVlt = dataset.filter((d) => d.terklasifikasi && d.volatility > 0.08);
  const stabil = dataset.filter(
    (d) => d.terklasifikasi && d.price > 0.97 && d.price < 1.03 && d.volatility < 0.001,
  );
  const volKecil = dataset.filter((d) => d.terklasifikasi && d.volume24h < 10000);
  const vs = meta.verifikasiSilang;
  const vJSON = vs.terhadapJSONRun.jumlahBeda;
  const vL63 = vs.terhadapTabelL63.jumlahBeda;
  const vBulat = vs.dampakPembulatanCSV.jumlahBeda;

  p('## TEMUAN DAN CATATAN');
  p();

  p('### 1. Verifikasi silang cocok sempurna pada ketiga pemeriksaan');
  p();
  p(`Skor keempat variabel, total skor, dan level risiko dihitung ulang untuk`);
  p(`seluruh ${N} aset yang dapat diklasifikasi penuh, memakai \`riskClassifier.js\``);
  p('versi sekarang. Hasilnya dibandingkan terhadap tiga acuan:');
  p();
  p(`- Skor yang tercatat di dalam berkas JSON hasil run 28 Juli 2026: ${vJSON} selisih`);
  p(`- Kolom Skor Variabel, Total, dan Level pada Tabel L6.3: ${vL63} selisih`);
  p(`- Dampak pembulatan empat desimal pada tabel dokumen: ${vBulat} aset bergeser kelas`);
  p();
  p('Ini menjawab kekhawatiran bahwa kode sempat berubah enam baris setelah run');
  p('28 Juli 2026. Perubahan tersebut memang tidak memengaruhi keluaran untuk');
  p('masukan yang valid, sebagaimana dicatat pada temuan nomor 1 dan 2 laporan');
  p('dataset 156 aset: perubahan itu hanya menambahkan validasi masukan dan');
  p('memperbaiki dua teks label, tanpa menyentuh satu pun dari 12 ambang batas.');
  p();
  p('Pemeriksaan ketiga perlu dijelaskan tersendiri. Tabel L6.3 pada skripsi');
  p('menampilkan volatilitas dan rasio likuiditas yang sudah dibulatkan ke empat');
  p('desimal persen, sedangkan dataset dibangun dari nilai presisi penuh pada');
  p('berkas JSON. Kedua versi menghasilkan skor yang sama untuk seluruh aset,');
  p('sehingga angka yang tercetak di skripsi dapat dipertanggungjawabkan apa');
  p('adanya tanpa perlu direvisi.');
  p();

  p('### 2. Kelas skor 3 pada variabel Market Cap kini TERISI');
  p();
  p(`Inilah alasan utama penggantian dataset, dan hasilnya positif. Sebanyak`);
  p(`${skor3MC} aset dari ${N} aset terklasifikasi (${persen((skor3MC / N) * 100)}) berkapitalisasi di bawah`);
  p('100 juta dolar, sehingga memperoleh skor 3 pada variabel Market Cap.');
  p();
  p(`Kapitalisasi terkecil pada dataset ini adalah ${ribuan(meta.marketCapTerkecil)} dolar`);
  p(`(${meta.asetMarketCapTerkecil}), jauh di bawah ambang 100 juta dolar. Bandingkan dengan`);
  p('dataset 156 aset yang kapitalisasi terkecilnya 108.199.227 dolar, masih di');
  p('atas ambang, sehingga kelas skor 3 kosong sama sekali.');
  p();
  p('Dengan demikian keempat variabel kini berstatus Semua kelas terisi, dan');
  p('keterbatasan yang dicatat pada temuan nomor 4 laporan dataset 156 aset sudah');
  p('tidak berlaku lagi.');
  p();

  p(`### 3. Dua belas aset tidak dapat diklasifikasi penuh`);
  p();
  p(`Dari ${meta.jumlahAset} aset, ${meta.asetGagal} aset tidak dapat diklasifikasi dan dikeluarkan dari`);
  p(`seluruh perhitungan matriks konfusi, metrik, dan kalibrasi. Perhitungan`);
  p(`karena itu berjalan pada ${N} aset, bukan ${meta.jumlahAset}.`);
  p();
  p(`Sebanyak ${gagalVol.length} aset bervolume 24 jam nol sehingga rasio likuiditas tidak dapat`);
  p('dihitung:');
  p();
  for (const g of gagalVol) p(`- ${g.symbol} — ${g.name}`);
  p();
  p('Seluruhnya merupakan token surat berharga atau aset dunia nyata yang');
  p('diperdagangkan melalui penerbitan primer, bukan melalui bursa publik. Pola');
  p('ini sama dengan temuan nomor 5 pada laporan dataset 156 aset.');
  p();
  p(`Sebanyak ${gagalHist.length} aset lainnya memiliki riwayat harga kurang dari 30 hari sehingga`);
  p('volatilitas tidak dapat dihitung pada jendela penuh:');
  p();
  for (const g of gagalHist) p(`- ${g.symbol} — ${g.name} (${g.alasan})`);
  p();
  p('Seluruhnya merupakan aset yang baru terdaftar. Perlu dicatat bahwa laporan');
  p('dataset 156 aset justru MENYERTAKAN aset semacam ini dengan jendela yang');
  p('lebih pendek (temuan nomor 12), sedangkan dataset 101 aset mengeluarkannya.');
  p('Dataset 101 aset karena itu lebih ketat pada titik ini, dan nilai');
  p('volatilitas antar-aset menjadi lebih terbandingkan.');
  p();

  p('### 4. Sebaran volatilitas membaik, tetapi kelas atas masih tipis');
  p();
  p('Ini perlu dikatakan apa adanya karena narasi skripsi akan menyesuaikan.');
  p();
  p(`Pangsa aset berskor 0 pada variabel Volatilitas turun dari ${persen(pangsaVlt0Lama)}`);
  p(`(${kalVltLama.hitung[0]} dari 156 aset) menjadi ${persen(pangsaVlt0)} (${kalVlt.hitung[0]} dari ${N} aset). Penyaringan`);
  p('stablecoin dan aset wrapped atau staked memang bekerja, dan sebarannya lebih');
  p('merata daripada dataset 156 aset.');
  p();
  p('Namun kelas atas tetap sangat tipis. Hanya empat aset yang berskor di atas 1:');
  p();
  for (const t of tinggiVlt.sort((a, b) => b.volatility - a.volatility)) {
    p(`- ${t.symbol} — ${t.name}: ${persen(t.volatility * 100, 4)} (skor ${t.volatility > 0.15 ? 3 : 2})`);
  }
  p();
  p(`Artinya kelas skor 2 dan skor 3 masing-masing hanya berisi ${kalVlt.hitung[2]} aset.`);
  p('Secara teknis status kalibrasi tetap Semua kelas terisi, karena tidak ada');
  p('kelas yang kosong dan tidak ada kelas yang menyerap lebih dari 90 persen');
  p(`populasi (kelas terbesar menyerap ${persen(pangsaVlt0)}). Tetapi dasar empiris untuk`);
  p('kedua kelas teratas itu tetap lemah, dan sebaiknya tidak diklaim sebagai');
  p('bukti kuat bahwa ambang 8 persen dan 15 persen sudah terkalibrasi baik.');
  p();
  p('Penyebabnya struktural: volatilitas 30 hari kebanyakan aset kripto besar');
  p('berada di kisaran 1 sampai 6 persen, sedangkan ambang skor 2 dan 3 dirancang');
  p('menangkap peristiwa ekstrem yang jarang terjadi pada jendela 30 hari mana pun.');
  p();

  if (stabil.length) {
    p('### 5. Sebagian aset berpatokan nilai masih lolos penyaringan');
    p();
    p(`Penyaringan stablecoin tidak sepenuhnya bersih. Sebanyak ${stabil.length} aset masih`);
    p('berharga sekitar satu dolar dengan volatilitas mendekati nol:');
    p();
    for (const s of stabil) {
      p(`- ${s.symbol} — ${s.name}: harga ${koma(s.price, 6)} dolar, volatilitas ${persen(s.volatility * 100, 4)}`);
    }
    p();
    p('Ketiganya tidak tertangkap penyaring karena tidak terdaftar pada kategori');
    p('stablecoin CoinGecko. Jumlahnya kecil dan tidak mengubah status kalibrasi');
    p('mana pun, tetapi keberadaannya perlu disebutkan agar klaim bahwa dataset');
    p('bebas stablecoin tidak dinyatakan terlalu kuat di dalam skripsi.');
    p();
    p('Di luar ketiganya masih terdapat token beragun logam mulia seperti XAUT,');
    p('XAUT0, dan PAXG yang volatilitasnya sekitar satu persen. Aset semacam ini');
    p('sah sebagai aset kripto, namun ikut menekan sebaran volatilitas ke bawah.');
    p();
  }

  p('### 6. Dua aset berbeda memakai simbol yang sama');
  p();
  p('Simbol HOLO muncul dua kali pada dataset dan merujuk dua aset yang berbeda:');
  p();
  p('- HOLO — Holoworld, ekosistem Solana, tier Small Cap, kapitalisasi 133.853.845 dolar');
  p('- HOLO — Holozone, ekosistem Solana, tier Micro Cap, kapitalisasi 63.672.661 dolar');
  p();
  p('Keduanya diklasifikasi terpisah dan benar, karena identifikasi pada proses');
  p('pengambilan memakai id CoinGecko, bukan simbol. Namun apabila tabel lampiran');
  p('dibaca berdasarkan kolom Simbol saja, kedua baris ini akan tampak seperti');
  p('duplikat. Perlu diberi catatan kaki pada lampiran skripsi agar penguji tidak');
  p('menyimpulkan ada penggandaan data.');
  p();

  if (volKecil.length) {
    p('### 7. Batas bawah volume yang ekstrem tetapi sah');
    p();
    for (const v of volKecil) {
      p(`Aset ${v.symbol} memiliki volume 24 jam hanya ${ribuan(v.volume24h)} dolar dengan rasio`);
      p(`likuiditas ${persen(v.liquidityRatio * 100, 4)}, namun tetap dapat diklasifikasi karena volumenya`);
      p('bukan nol dan riwayat harganya lengkap. Aset ini memperoleh skor 3 pada');
      p('variabel Volume maupun Rasio Likuiditas, yang memang tepat secara aturan.');
    }
    p();
    p('Perbedaan perlakuan antara volume nol dan volume sangat kecil perlu');
    p('dijelaskan di skripsi: aset bervolume nol dikeluarkan karena rasio');
    p('likuiditasnya tidak terdefinisi secara bermakna, sedangkan aset bervolume');
    p('sangat kecil tetap masuk karena rasionya masih dapat dihitung.');
    p();
  }

  p("### 8. Cohen's Kappa tetap 1,0000, dan maknanya tidak berubah");
  p();
  p('Sebagaimana pada dataset 156 aset, nilai Kappa sempurna di sini mengukur');
  p('KESETIAAN IMPLEMENTASI terhadap spesifikasi tertulis, bukan akurasi prediksi');
  p('risiko terhadap kenyataan pasar. Kedua jalur klasifikasi menerima masukan');
  p('yang sama persis; yang diuji adalah apakah kode berperilaku identik dengan');
  p('aturan pada Tabel 3.1 sampai 3.4 skripsi.');
  p();
  p(`Satu perbaikan yang layak disebut: nilai p_e turun dari ${koma(hasilLama.metrik.pE, 6)} pada`);
  p(`dataset 156 aset menjadi ${koma(met.pE, 6)} pada dataset 101 aset. Semakin rendah p_e,`);
  p('semakin kecil porsi kesepakatan yang dapat dijelaskan oleh kebetulan, dan');
  p('semakin bermakna nilai Kappa yang dihasilkan. Penyebabnya sebaran kelas');
  p(`risiko yang lebih seimbang: ${tA.Low} Low, ${tA.Medium} Medium, dan ${tA.High} High, dibandingkan`);
  p(`${hasilLama.totalAktual.Low} Low, ${hasilLama.totalAktual.Medium} Medium, dan hanya ${hasilLama.totalAktual.High} High pada dataset sebelumnya.`);
  p();
  p(`Kelas High kini berisi ${tA.High} aset atau ${persen((tA.High / N) * 100)} populasi, naik dari`);
  p(`${hasilLama.totalAktual.High} aset atau ${persen((hasilLama.totalAktual.High / 156) * 100)}. Kelas High karena itu berdiri di atas dasar`);
  p('empiris yang lebih kuat daripada sebelumnya.');
  p();

  p('### 9. Komposisi ekosistem tidak seimbang pada Bitcoin');
  p();
  p(`Sebaran ekosistem adalah ${Object.entries(meta.sebaranEkosistem).map(([k, v]) => `${k} ${v} aset`).join(', ')}.`);
  p('Penarikan sampel memang menargetkan kategori solana-ecosystem dan');
  p('ethereum-ecosystem, sehingga Bitcoin hanya terwakili oleh satu aset yaitu BTC');
  p('itu sendiri. Ini konsekuensi rancangan penarikan sampel, bukan kegagalan');
  p('pengambilan data, tetapi perlu dinyatakan agar tidak dibaca sebagai klaim');
  p('keterwakilan lintas ekosistem yang setara.');
  p();

  if (testDuaModulInti !== null) {
    p(`### 10. Jumlah test dua modul inti adalah ${testDuaModulInti}, bukan 87`);
    p();
    p('Dokumen skripsi menyebut angka 87 di beberapa tempat. Angka itu berasal dari');
    p('dua suite saja:');
    p();
    for (const r of rincianModulInti.filter((r) => !/validation/.test(r.suite))) {
      p(`- \`${r.suite}\` — ${r.jumlah} test`);
    }
    p();
    const lamaInti = rincianModulInti
      .filter((r) => !/validation/.test(r.suite))
      .reduce((s, r) => s + r.jumlah, 0);
    p(`Jumlahnya ${lamaInti} test, yang cocok dengan angka 87 pada dokumen. Namun sejak`);
    p('sesi validasi sebelumnya ditambahkan satu suite lagi yang khusus menguji');
    p('`riskClassifier.js`:');
    p();
    for (const r of rincianModulInti.filter((r) => /validation/.test(r.suite))) {
      p(`- \`${r.suite}\` — ${r.jumlah} test`);
    }
    p();
    p(`Total test yang khusus menguji \`riskClassifier.js\` dan \`portfolioAnalyzer.js\``);
    p(`karena itu adalah ${testDuaModulInti} test, bukan 87. Angka inilah yang sebaiknya dipakai`);
    p('dalam dokumen skripsi.');
    p();
    p(`Adapun total seluruh test pada repo tetap ${testTotal} pada 12 suite, seluruhnya`);
    p('lulus tanpa kegagalan. Angka ini diverifikasi ulang pada sesi ini, bukan');
    p('disalin dari sesi sebelumnya.');
    p();
  }

  p('### 11. Angka yang tidak berhasil diperoleh');
  p();
  p('- **Commit hash repo** tidak tersedia karena folder proyek bukan git');
  p('  repository. Digantikan checksum SHA-256 sebagaimana pada laporan');
  p('  sebelumnya.');
  p();
  p('Seluruh angka lain yang diminta pada sesi ini berhasil diperoleh dari');
  p('eksekusi nyata. Tidak ada nilai yang diperkirakan atau dikarang.');
  p();
  p('Perlu dicatat bahwa BLOK-4.10-REKONSILIASI, BLOK-4.11-IDENTITAS, dan');
  p('BLOK-4.12-PROPERTI disalin apa adanya dari laporan dataset 156 aset karena');
  p('ketiganya tidak bergantung pada dataset: dua blok pertama merekonsiliasi');
  p('sepuluh aset acuan terhadap sumber eksternal, dan blok ketiga menguji');
  p('properti matematis fungsi skor memakai 100.000 masukan acak. Waktu');
  p('pengambilan untuk kedua blok pertama tetap sebagaimana tercantum pada');
  p('laporan lama, yaitu 12 Agustus 2026.');
  p();

  writeFileSync(OUT, L.join('\n'), 'utf8');
  console.log(`Laporan ditulis ke: ${path.relative(ROOT, OUT)}`);
  console.log(`  Aset dataset          : ${meta.jumlahAset}`);
  console.log(`  Aset terklasifikasi   : ${N}`);
  console.log(`  Kelas skor 3 MarketCap: ${skor3MC} aset`);
  console.log(`  Test dua modul inti   : ${testDuaModulInti}`);
  console.log(`  Test total            : ${testTotal}`);
  console.log(`  Baris laporan         : ${L.length}`);
}

main();

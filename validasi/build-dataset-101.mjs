/**
 * PEMBANGUN DATASET 101 ASET (Lampiran 6 skripsi)
 *
 * Sumber utama : server/output/survey-20260728-1136.json
 * Acuan L6.3   : survey-20260728-1136.csv (salinan di akar folder skripsi)
 *
 * Keduanya merupakan keluaran dari satu proses yang sama, yaitu penarikan
 * sampel stratified purposive per tier kapitalisasi pasar yang dijalankan
 * 28 Juli 2026 pukul 11.36.53 WIB. Berkas JSON menyimpan nilai volatilitas
 * dan rasio likuiditas pada presisi penuh, sedangkan CSV membulatkannya ke
 * empat desimal persen untuk keperluan tabel dokumen. Dataset dibangun dari
 * JSON supaya presisinya utuh.
 *
 * Berkas ini TIDAK memanggil API mana pun; ia hanya membaca ulang berkas
 * hasil run tersebut supaya angkanya tetap identik dengan Lampiran 6 yang
 * sudah tercetak di skripsi.
 *
 * Keluaran:
 *   validasi/dataset-101.json      — 101 aset, format sama dengan dataset-uji.json
 *   validasi/dataset-101-meta.json — metadata + rincian aset gagal
 *
 * Sekaligus melakukan VERIFIKASI SILANG rangkap tiga: skor yang dihitung
 * ulang memakai riskClassifier.js versi sekarang dibandingkan terhadap
 *   (a) skor yang tercatat di dalam JSON hasil run 28 Juli, dan
 *   (b) kolom Skor Variabel / Total / Level pada Tabel L6.3 (CSV).
 *
 * Jalankan: node validasi/build-dataset-101.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  scoreMarketCap,
  scoreVolume24h,
  scoreVolatility,
  scoreLiquidityRatio,
  classifyAsset,
} from '../server/src/services/riskClassifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_JSON = path.join(ROOT, 'server', 'output', 'survey-20260728-1136.json');
const SRC_CSV = path.resolve(ROOT, '..', 'survey-20260728-1136.csv');
const OUT_DATA = path.join(__dirname, 'dataset-101.json');
const OUT_META = path.join(__dirname, 'dataset-101-meta.json');

/** Waktu pengambilan: 28 Juli 2026 11.36.53 WIB (UTC+7) → 04.36.53 UTC. */
const FETCHED_AT = '2026-07-28T04:36:53.000Z';

// ============================================================
// Parser CSV sederhana (mendukung field berkutip)
// ============================================================
function parseCSV(teks) {
  const baris = teks.replace(/\r\n/g, '\n').split('\n').filter((b) => b.trim() !== '');
  return baris.map((b) => {
    const sel = [];
    let cur = '';
    let dalamKutip = false;
    for (let i = 0; i < b.length; i++) {
      const c = b[i];
      if (c === '"') {
        if (dalamKutip && b[i + 1] === '"') { cur += '"'; i++; }
        else dalamKutip = !dalamKutip;
      } else if (c === ',' && !dalamKutip) {
        sel.push(cur); cur = '';
      } else cur += c;
    }
    sel.push(cur);
    return sel.map((s) => s.trim());
  });
}

const ribuan = (n) => new Intl.NumberFormat('id-ID').format(n);
const koma = (n, d = 4) => n.toFixed(d).replace('.', ',');

// ============================================================
// Main
// ============================================================
function main() {
  for (const [f, label] of [[SRC_JSON, 'JSON hasil run'], [SRC_CSV, 'CSV Tabel L6.3']]) {
    if (!existsSync(f)) {
      console.error(`GAGAL: berkas sumber ${label} tidak ditemukan di ${f}`);
      process.exit(1);
    }
  }

  const survey = JSON.parse(readFileSync(SRC_JSON, 'utf8'));
  const rows = parseCSV(readFileSync(SRC_CSV, 'utf8'));
  const header = rows[0];
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  // Acuan L6.3 diindeks berdasarkan nomor baris, sama urutannya dengan JSON.
  const l63 = rows.slice(1);
  if (l63.length !== survey.assets.length) {
    console.error(
      `GAGAL: jumlah baris CSV (${l63.length}) tidak sama dengan jumlah aset JSON (${survey.assets.length})`,
    );
    process.exit(1);
  }

  console.log('='.repeat(104));
  console.log('PEMBANGUN DATASET 101 ASET — Lampiran 6 (run 28 Juli 2026, 11.36.53 WIB)');
  console.log('='.repeat(104));
  console.log(`Sumber utama  : ${path.relative(ROOT, SRC_JSON)}`);
  console.log(`Acuan L6.3    : ${path.basename(SRC_CSV)}`);
  console.log(`Stempel waktu : ${survey.meta.dataTimestampWIB} (${survey.meta.dataTimestampUTC})`);
  console.log(`Jumlah aset   : ${survey.assets.length}`);
  console.log('');

  const dataset = [];
  const gagal = [];
  const bedaJSON = [];
  const bedaL63 = [];
  const bedaPembulatan = [];

  survey.assets.forEach((a, i) => {
    const r = l63[i];
    const terklasifikasi = a.status === 'classified';

    if (r[idx.Simbol] !== a.symbol) {
      console.error(`GAGAL: urutan CSV dan JSON tidak sejajar pada baris ${i + 1} ` +
        `(CSV=${r[idx.Simbol]}, JSON=${a.symbol})`);
      process.exit(1);
    }

    const aset = {
      symbol: a.symbol,
      name: a.name,
      ecosystem: a.network,
      tier: a.tier,
      marketCap: a.marketCap,
      volume24h: a.volume24h,
      price: a.price,
      volatility: terklasifikasi ? a.volatility : null,
      liquidityRatio: terklasifikasi ? a.liquidityRatio : null,
      fetchedAt: FETCHED_AT,
      terklasifikasi,
      alasanGagal: terklasifikasi ? null : a.reason,
    };
    dataset.push(aset);

    if (!terklasifikasi) {
      gagal.push({ symbol: a.symbol, name: a.name, alasan: a.reason });
      return;
    }

    // -------- Hitung ulang memakai riskClassifier.js versi sekarang --------
    const hasil = classifyAsset({
      marketCap: a.marketCap,
      volume24h: a.volume24h,
      volatility: a.volatility,
      liquidityRatio: a.liquidityRatio,
    });
    const skor = {
      marketCap: scoreMarketCap(a.marketCap).points,
      volume24h: scoreVolume24h(a.volume24h).points,
      volatility: scoreVolatility(a.volatility).points,
      liquidityRatio: scoreLiquidityRatio(a.liquidityRatio).points,
    };

    // (a) Bandingkan terhadap skor yang tercatat di JSON hasil run 28 Juli.
    const sJ = a.breakdown;
    const selisihJ = [];
    if (skor.marketCap !== sJ.marketCap.points) selisihJ.push(`marketCap: run=${sJ.marketCap.points} vs hitung=${skor.marketCap}`);
    if (skor.volume24h !== sJ.volume24h.points) selisihJ.push(`volume24h: run=${sJ.volume24h.points} vs hitung=${skor.volume24h}`);
    if (skor.volatility !== sJ.volatility.points) selisihJ.push(`volatility: run=${sJ.volatility.points} vs hitung=${skor.volatility}`);
    if (skor.liquidityRatio !== sJ.liquidityRatio.points) selisihJ.push(`liquidityRatio: run=${sJ.liquidityRatio.points} vs hitung=${skor.liquidityRatio}`);
    if (hasil.riskScore !== a.riskScore) selisihJ.push(`Total: run=${a.riskScore} vs hitung=${hasil.riskScore}`);
    if (hasil.riskLevel !== a.riskLevel) selisihJ.push(`Level: run=${a.riskLevel} vs hitung=${hasil.riskLevel}`);
    if (selisihJ.length) bedaJSON.push({ symbol: a.symbol, selisih: selisihJ });

    // (b) Bandingkan terhadap kolom Tabel L6.3 pada CSV.
    const selisihC = [];
    const pas = [
      ['marketCap', 'Skor_MarketCap'],
      ['volume24h', 'Skor_Volume'],
      ['volatility', 'Skor_Volatilitas'],
      ['liquidityRatio', 'Skor_Likuiditas'],
    ];
    for (const [k, kol] of pas) {
      const v = Number(r[idx[kol]]);
      if (skor[k] !== v) selisihC.push(`${k}: L6.3=${v} vs hitung=${skor[k]}`);
    }
    if (hasil.riskScore !== Number(r[idx.Total])) selisihC.push(`Total: L6.3=${r[idx.Total]} vs hitung=${hasil.riskScore}`);
    if (hasil.riskLevel !== r[idx.Level]) selisihC.push(`Level: L6.3=${r[idx.Level]} vs hitung=${hasil.riskLevel}`);
    if (selisihC.length) bedaL63.push({ symbol: a.symbol, selisih: selisihC });

    // (c) Apakah pembulatan empat desimal pada CSV menggeser skor?
    const volBulat = Number((a.volatility * 100).toFixed(4)) / 100;
    const liqBulat = Number((a.liquidityRatio * 100).toFixed(4)) / 100;
    const sVolB = scoreVolatility(volBulat).points;
    const sLiqB = scoreLiquidityRatio(liqBulat).points;
    if (sVolB !== skor.volatility || sLiqB !== skor.liquidityRatio) {
      bedaPembulatan.push({
        symbol: a.symbol,
        volatilitasPenuh: a.volatility,
        volatilitasBulat: volBulat,
        skorVolatilitasPenuh: skor.volatility,
        skorVolatilitasBulat: sVolB,
        likuiditasPenuh: a.liquidityRatio,
        likuiditasBulat: liqBulat,
        skorLikuiditasPenuh: skor.liquidityRatio,
        skorLikuiditasBulat: sLiqB,
      });
    }
  });

  // ============================================================
  // Laporan verifikasi silang
  // ============================================================
  const terklasifikasi = dataset.filter((d) => d.terklasifikasi);

  console.log('-'.repeat(104));
  console.log('VERIFIKASI SILANG');
  console.log('-'.repeat(104));
  console.log(`Aset dapat diklasifikasi penuh : ${terklasifikasi.length}`);
  console.log(`Aset tidak terklasifikasi      : ${gagal.length}`);
  console.log('');

  console.log('(a) Terhadap skor tercatat pada JSON hasil run 28 Juli 2026');
  if (bedaJSON.length === 0) {
    console.log(`    OK — seluruh ${terklasifikasi.length} aset identik.`);
  } else {
    console.log(`    PERBEDAAN pada ${bedaJSON.length} aset:`);
    for (const b of bedaJSON) console.log(`      • ${b.symbol}: ${b.selisih.join('; ')}`);
  }
  console.log('');

  console.log('(b) Terhadap kolom Skor Variabel / Total / Level pada Tabel L6.3');
  if (bedaL63.length === 0) {
    console.log(`    OK — seluruh ${terklasifikasi.length} aset identik.`);
    console.log('    Perubahan enam baris pada kode setelah run 28 Juli terbukti tidak');
    console.log('    mengubah hasil untuk masukan yang valid.');
  } else {
    console.log(`    PERBEDAAN pada ${bedaL63.length} aset:`);
    for (const b of bedaL63) console.log(`      • ${b.symbol}: ${b.selisih.join('; ')}`);
  }
  console.log('');

  console.log('(c) Dampak pembulatan empat desimal pada CSV terhadap skor');
  if (bedaPembulatan.length === 0) {
    console.log('    OK — pembulatan pada tabel dokumen tidak menggeser satu pun aset');
    console.log('    ke kelas skor lain. Nilai presisi penuh dipakai pada dataset.');
  } else {
    console.log(`    CATATAN — ${bedaPembulatan.length} aset bergeser akibat pembulatan:`);
    for (const b of bedaPembulatan) {
      console.log(`      • ${b.symbol}: volatilitas skor ${b.skorVolatilitasPenuh} (penuh) vs ` +
        `${b.skorVolatilitasBulat} (bulat); likuiditas skor ${b.skorLikuiditasPenuh} vs ${b.skorLikuiditasBulat}`);
    }
  }

  // ---- Rincian aset gagal ----
  const gagalVolumeNol = gagal.filter((g) => /volume/i.test(g.alasan));
  const gagalHistori = gagal.filter((g) => /histori/i.test(g.alasan));
  const gagalLain = gagal.filter((g) => !/volume|histori/i.test(g.alasan));

  console.log('');
  console.log('-'.repeat(104));
  console.log(`ASET TIDAK TERKLASIFIKASI (${gagal.length})`);
  console.log('-'.repeat(104));
  console.log(`Volume 24 jam nol / tidak tersedia : ${gagalVolumeNol.length}`);
  for (const g of gagalVolumeNol) console.log(`   • ${g.symbol} — ${g.name}`);
  console.log(`Riwayat harga kurang dari 30 hari  : ${gagalHistori.length}`);
  for (const g of gagalHistori) console.log(`   • ${g.symbol} — ${g.name} (${g.alasan})`);
  if (gagalLain.length) {
    console.log(`Alasan lain                        : ${gagalLain.length}`);
    for (const g of gagalLain) console.log(`   • ${g.symbol} — ${g.name} (${g.alasan})`);
  }

  // ---- Komposisi ----
  const sebaranEkosistem = {};
  const sebaranTier = {};
  for (const d of dataset) {
    sebaranEkosistem[d.ecosystem] = (sebaranEkosistem[d.ecosystem] || 0) + 1;
    sebaranTier[d.tier] = (sebaranTier[d.tier] || 0) + 1;
  }

  const eksklusi = {};
  for (const e of survey.excludedPreSampling || []) {
    eksklusi[e.reason] = (eksklusi[e.reason] || 0) + 1;
  }

  console.log('');
  console.log('-'.repeat(104));
  console.log('KOMPOSISI DATASET');
  console.log('-'.repeat(104));
  console.log('Per ekosistem :', JSON.stringify(sebaranEkosistem));
  console.log('Per tier      :', JSON.stringify(sebaranTier));
  console.log('Disaring keluar sebelum penarikan sampel:');
  for (const [k, v] of Object.entries(eksklusi)) console.log(`   • ${k}: ${v}`);
  console.log(`   • duplikat lintas ekosistem: ${(survey.skippedDuplicates || []).length}`);

  const mcTerkecil = Math.min(...dataset.map((d) => d.marketCap));
  const asetTerkecil = dataset.find((d) => d.marketCap === mcTerkecil);
  console.log(`Market cap terkecil : $${ribuan(mcTerkecil)} (${asetTerkecil.symbol} — ${asetTerkecil.name})`);

  const skor3MC = terklasifikasi.filter((d) => scoreMarketCap(d.marketCap).points === 3).length;
  console.log(
    `Kelas skor 3 Market Cap : ${skor3MC > 0 ? 'TERISI' : 'KOSONG'} (${skor3MC} aset ` +
    `dari ${terklasifikasi.length} terklasifikasi)`,
  );

  // ---- Simpan ----
  writeFileSync(OUT_DATA, JSON.stringify(dataset, null, 2), 'utf8');
  writeFileSync(
    OUT_META,
    JSON.stringify(
      {
        dibangunPada: new Date().toISOString(),
        sumberUtama: 'server/output/survey-20260728-1136.json',
        acuanTabelL63: 'survey-20260728-1136.csv',
        waktuPengambilan: FETCHED_AT,
        waktuPengambilanWIB: survey.meta.dataTimestampWIB,
        waktuPengambilanUTC: survey.meta.dataTimestampUTC,
        metodePenarikanSampel:
          'Stratified purposive sampling per tier kapitalisasi pasar (Large/Mid/Small/Micro Cap), ' +
          'kategori CoinGecko solana-ecosystem dan ethereum-ecosystem, menyaring aset wrapped, staked, dan stablecoin',
        batasPerEkosistem: survey.meta.limitPerEcosystem,
        populasi: survey.population,
        jumlahAset: dataset.length,
        asetTerklasifikasi: terklasifikasi.length,
        asetGagal: gagal.length,
        rincianGagal: gagal,
        gagalVolumeNol: gagalVolumeNol.length,
        gagalHistoriKurang30Hari: gagalHistori.length,
        sebaranEkosistem,
        sebaranTier,
        disaringSebelumPenarikanSampel: eksklusi,
        duplikatDilewati: (survey.skippedDuplicates || []).length,
        marketCapTerkecil: mcTerkecil,
        asetMarketCapTerkecil: `${asetTerkecil.symbol} — ${asetTerkecil.name}`,
        verifikasiSilang: {
          terhadapJSONRun: { jumlahBeda: bedaJSON.length, rincian: bedaJSON },
          terhadapTabelL63: { jumlahBeda: bedaL63.length, rincian: bedaL63 },
          dampakPembulatanCSV: { jumlahBeda: bedaPembulatan.length, rincian: bedaPembulatan },
        },
        catatanSatuan:
          'volatility dan liquidityRatio disimpan sebagai desimal presisi penuh (0,05 = 5%) ' +
          'langsung dari JSON hasil run — sesuai kontrak riskClassifier.js',
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log('');
  console.log(`Dataset disimpan ke  : ${path.relative(ROOT, OUT_DATA)}`);
  console.log(`Metadata disimpan ke : ${path.relative(ROOT, OUT_META)}`);
}

main();

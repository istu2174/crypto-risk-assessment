/**
 * TAHAP 6 — MATRIKS KONFUSI, METRIK EVALUASI, DAN KALIBRASI
 *
 * Menjawab pertanyaan penguji: "Apakah setiap nilai ditempatkan pada kelas
 * skor yang benar?"
 *
 * Metode: klasifikasi ganda independen (dual-path verification).
 *
 *   JALUR 1 (Prediksi) — memanggil fungsi dari riskClassifier.js, yaitu
 *                        implementasi nyata yang dipakai sistem produksi.
 *
 *   JALUR 2 (Aktual)   — implementasi ulang yang ditulis dari nol di berkas
 *                        ini berdasarkan Tabel 3.1 sampai 3.4 skripsi, TANPA
 *                        mengimpor apa pun dari riskClassifier.js. Berperan
 *                        sebagai acuan kebenaran (ground truth) menurut
 *                        dokumen.
 *
 * Kesepakatan sempurna antara kedua jalur membuktikan implementasi sistem
 * setia pada spesifikasi tertulis.
 *
 * Bagian:
 *   A. Matriks konfusi 3x3 (Low / Medium / High)
 *   B. Akurasi, precision & recall per kelas, Cohen's Kappa
 *   C. Kalibrasi distribusional (persentil ambang + sebaran kelas)
 *   D. Rincian per aset
 *
 * Jalankan: node validasi/uji-klasifikasi.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---- JALUR 1: implementasi sistem yang sedang diuji ----
import {
  scoreMarketCap,
  scoreVolume24h,
  scoreVolatility,
  scoreLiquidityRatio,
  classifyAsset,
} from '../server/src/services/riskClassifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATASET = path.join(__dirname, 'dataset-uji.json');
const OUT_FILE = path.join(__dirname, 'hasil-klasifikasi.json');

// ============================================================
// JALUR 2 — IMPLEMENTASI ULANG INDEPENDEN
// Ditulis ulang dari Tabel 3.1 – 3.4 dokumen skripsi.
// TIDAK mengimpor apa pun dari riskClassifier.js.
// Sengaja memakai gaya penulisan berbeda (tabel aturan + pencarian
// berurutan) supaya benar-benar independen dari struktur kode sumber.
// ============================================================

/** Tabel 3.1 — Market Cap. Semakin kecil kapitalisasi, semakin berisiko. */
const TABEL_MARKET_CAP = [
  { batasAtas: 100_000_000, skor: 3 }, // < $100 juta
  { batasAtas: 1_000_000_000, skor: 2 }, // $100 juta – $1 miliar
  { batasAtas: 10_000_000_000, skor: 1 }, // $1 miliar – $10 miliar
  { batasAtas: Infinity, skor: 0 }, // >= $10 miliar
];

/** Tabel 3.2 — Volume 24 Jam. Semakin kecil volume, semakin berisiko. */
const TABEL_VOLUME = [
  { batasAtas: 1_000_000, skor: 3 }, // < $1 juta
  { batasAtas: 10_000_000, skor: 2 }, // $1 juta – $10 juta
  { batasAtas: 100_000_000, skor: 1 }, // $10 juta – $100 juta
  { batasAtas: Infinity, skor: 0 }, // >= $100 juta
];

/** Tabel 3.4 — Rasio Likuiditas. Semakin kecil rasio, semakin berisiko. */
const TABEL_LIKUIDITAS = [
  { batasAtas: 0.01, skor: 3 }, // < 1%
  { batasAtas: 0.05, skor: 2 }, // 1% – 5%
  { batasAtas: 0.1, skor: 1 }, // 5% – 10%
  { batasAtas: Infinity, skor: 0 }, // >= 10%
];

/** Tabel 3.3 — Volatilitas. Semakin besar volatilitas, semakin berisiko. */
const TABEL_VOLATILITAS = [
  { batasBawah: 0.15, skor: 3 }, // > 15%
  { batasBawah: 0.08, skor: 2 }, // > 8%
  { batasBawah: 0.04, skor: 1 }, // > 4%
  { batasBawah: -Infinity, skor: 0 }, // <= 4%
];

/** Variabel "semakin kecil semakin berisiko" — operator '<' (strict). */
function skorMenaikTerbalik(nilai, tabel) {
  for (const aturan of tabel) {
    if (nilai < aturan.batasAtas) return aturan.skor;
  }
  return 0;
}

/** Variabel "semakin besar semakin berisiko" — operator '>' (strict). */
function skorMenaik(nilai, tabel) {
  for (const aturan of tabel) {
    if (nilai > aturan.batasBawah) return aturan.skor;
  }
  return 0;
}

/**
 * Klasifikasi acuan menurut dokumen skripsi.
 * Total skor 0–12; >= 9 High, >= 5 Medium, sisanya Low.
 */
function klasifikasiAcuan({ marketCap, volume24h, volatility, liquidityRatio }) {
  const s1 = skorMenaikTerbalik(marketCap, TABEL_MARKET_CAP);
  const s2 = skorMenaikTerbalik(volume24h, TABEL_VOLUME);
  const s3 = skorMenaik(volatility, TABEL_VOLATILITAS);
  const s4 = skorMenaikTerbalik(liquidityRatio, TABEL_LIKUIDITAS);

  const total = s1 + s2 + s3 + s4;

  let level;
  if (total >= 9) level = 'High';
  else if (total >= 5) level = 'Medium';
  else level = 'Low';

  return { skor: { marketCap: s1, volume24h: s2, volatility: s3, liquidityRatio: s4 }, total, level };
}

// ============================================================
// Utilitas format Indonesia
// ============================================================
const KELAS = ['Low', 'Medium', 'High'];

const fmtID = (n, d = 0) =>
  new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(n);

const koma = (n, d = 4) => n.toFixed(d).replace('.', ',');
const persen = (n, d = 2) => `${koma(n, d)}%`;

function tabel(header, baris, rataKiri = [0]) {
  const lebar = header.map((h, i) =>
    Math.max(String(h).length, ...baris.map((b) => String(b[i]).length)),
  );
  const garis = '+' + lebar.map((w) => '-'.repeat(w + 2)).join('+') + '+';
  const out = [garis];
  out.push('|' + header.map((h, i) => ` ${String(h).padEnd(lebar[i])} `).join('|') + '|');
  out.push(garis);
  for (const b of baris) {
    out.push(
      '|' +
        b
          .map((v, i) =>
            rataKiri.includes(i)
              ? ` ${String(v).padEnd(lebar[i])} `
              : ` ${String(v).padStart(lebar[i])} `,
          )
          .join('|') +
        '|',
    );
  }
  out.push(garis);
  return out.join('\n');
}

// ============================================================
// Persentil
// ============================================================

/**
 * Posisi persentil sebuah ambang terhadap sebaran empiris:
 * persentase nilai dalam dataset yang berada DI BAWAH ambang tersebut.
 */
function posisiPersentil(nilaiTerurut, ambang) {
  let n = 0;
  for (const v of nilaiTerurut) {
    if (v < ambang) n++;
    else break;
  }
  return (n / nilaiTerurut.length) * 100;
}

// ============================================================
// Main
// ============================================================
function main() {
  if (!existsSync(DATASET)) {
    console.error(`FATAL: dataset tidak ditemukan di ${DATASET}`);
    console.error('Jalankan dulu: node validasi/build-dataset.mjs');
    process.exit(1);
  }

  const dataset = JSON.parse(readFileSync(DATASET, 'utf8'));
  const waktu = new Date();

  console.log('='.repeat(104));
  console.log('TAHAP 6 — MATRIKS KONFUSI, METRIK EVALUASI, DAN KALIBRASI');
  console.log('='.repeat(104));
  console.log(`Waktu eksekusi (UTC) : ${waktu.toISOString()}`);
  console.log(`Jumlah aset dataset  : ${dataset.length}`);
  console.log(`Jalur 1 (Prediksi)   : riskClassifier.js — implementasi sistem`);
  console.log(`Jalur 2 (Aktual)     : implementasi ulang independen dari Tabel 3.1–3.4`);
  console.log('');

  // --- Klasifikasi ganda ---
  const rincian = [];
  for (const aset of dataset) {
    const input = {
      marketCap: aset.marketCap,
      volume24h: aset.volume24h,
      volatility: aset.volatility,
      liquidityRatio: aset.liquidityRatio,
    };

    // JALUR 1 — sistem
    const sistem = classifyAsset(input);
    const skorSistem = {
      marketCap: scoreMarketCap(aset.marketCap).points,
      volume24h: scoreVolume24h(aset.volume24h).points,
      volatility: scoreVolatility(aset.volatility).points,
      liquidityRatio: scoreLiquidityRatio(aset.liquidityRatio).points,
    };

    // JALUR 2 — acuan dokumen
    const acuan = klasifikasiAcuan(input);

    rincian.push({
      simbol: aset.symbol,
      ekosistem: aset.ecosystem,
      marketCap: aset.marketCap,
      volume24h: aset.volume24h,
      volatility: aset.volatility,
      liquidityRatio: aset.liquidityRatio,
      skorSistem,
      skorAcuan: acuan.skor,
      totalSistem: sistem.riskScore,
      totalAcuan: acuan.total,
      levelSistem: sistem.riskLevel,
      levelAcuan: acuan.level,
      cocok: sistem.riskLevel === acuan.level,
      skorCocok:
        skorSistem.marketCap === acuan.skor.marketCap &&
        skorSistem.volume24h === acuan.skor.volume24h &&
        skorSistem.volatility === acuan.skor.volatility &&
        skorSistem.liquidityRatio === acuan.skor.liquidityRatio,
    });
  }

  // ============================================================
  // BAGIAN A — MATRIKS KONFUSI
  // ============================================================
  console.log('='.repeat(104));
  console.log('BAGIAN A — MATRIKS KONFUSI 3 x 3');
  console.log('='.repeat(104));
  console.log('Baris = kelas Aktual (acuan dokumen), Kolom = kelas Prediksi (sistem)\n');

  const M = {};
  for (const a of KELAS) {
    M[a] = {};
    for (const p of KELAS) M[a][p] = 0;
  }
  for (const r of rincian) M[r.levelAcuan][r.levelSistem]++;

  const totalAktual = Object.fromEntries(
    KELAS.map((a) => [a, KELAS.reduce((s, p) => s + M[a][p], 0)]),
  );
  const totalPrediksi = Object.fromEntries(
    KELAS.map((p) => [p, KELAS.reduce((s, a) => s + M[a][p], 0)]),
  );
  const N = rincian.length;

  console.log(
    tabel(
      ['', 'Prediksi Low', 'Prediksi Medium', 'Prediksi High', 'Total Aktual'],
      [
        ...KELAS.map((a) => [
          `Aktual ${a}`,
          M[a].Low,
          M[a].Medium,
          M[a].High,
          totalAktual[a],
        ]),
        [
          'Total Prediksi',
          totalPrediksi.Low,
          totalPrediksi.Medium,
          totalPrediksi.High,
          N,
        ],
      ],
      [0],
    ),
  );

  // ============================================================
  // BAGIAN B — METRIK EVALUASI
  // ============================================================
  console.log('');
  console.log('='.repeat(104));
  console.log('BAGIAN B — METRIK EVALUASI');
  console.log('='.repeat(104));

  const benar = KELAS.reduce((s, k) => s + M[k][k], 0);
  const akurasi = benar / N;

  const metrik = KELAS.map((k) => {
    const tp = M[k][k];
    const fp = totalPrediksi[k] - tp;
    const fn = totalAktual[k] - tp;
    // Kelas tanpa anggota: metrik tidak terdefinisi, ditandai null
    const precision = totalPrediksi[k] === 0 ? null : tp / totalPrediksi[k];
    const recall = totalAktual[k] === 0 ? null : tp / totalAktual[k];
    return { kelas: k, tp, fp, fn, precision, recall };
  });

  // --- Cohen's Kappa ---
  const pO = akurasi;
  const pE = KELAS.reduce(
    (s, k) => s + (totalAktual[k] / N) * (totalPrediksi[k] / N),
    0,
  );
  // Kalau pE === 1, kappa tidak terdefinisi (pembagi nol)
  const kappa = pE === 1 ? null : (pO - pE) / (1 - pE);

  /** Interpretasi Landis & Koch (1977) */
  function interpretasiKappa(k) {
    if (k === null) return 'Tidak terdefinisi (kesepakatan acak = 100%)';
    if (k < 0) return 'Poor';
    if (k <= 0.2) return 'Slight';
    if (k <= 0.4) return 'Fair';
    if (k <= 0.6) return 'Moderate';
    if (k <= 0.8) return 'Substantial';
    return 'Almost perfect';
  }

  const barisMetrik = [
    ['Akurasi keseluruhan', persen(akurasi * 100), `${benar} dari ${N} aset tepat`],
    ...metrik.flatMap((m) => [
      [
        `Precision ${m.kelas}`,
        m.precision === null ? 'Tidak terdefinisi' : persen(m.precision * 100),
        m.precision === null
          ? 'Tidak ada aset yang diprediksi kelas ini'
          : `TP=${m.tp}, FP=${m.fp}`,
      ],
      [
        `Recall ${m.kelas}`,
        m.recall === null ? 'Tidak terdefinisi' : persen(m.recall * 100),
        m.recall === null
          ? 'Tidak ada aset aktual pada kelas ini'
          : `TP=${m.tp}, FN=${m.fn}`,
      ],
    ]),
    [
      "Cohen's Kappa",
      kappa === null ? 'Tidak terdefinisi' : koma(kappa, 4),
      interpretasiKappa(kappa),
    ],
  ];

  console.log(tabel(['Metrik', 'Nilai', 'Interpretasi'], barisMetrik, [0, 2]));
  console.log(`\nPerhitungan Kappa:  p_o = ${koma(pO, 6)},  p_e = ${koma(pE, 6)}`);
  console.log('Interpretasi mengikuti Landis & Koch (1977).');

  const jumlahSkorCocok = rincian.filter((r) => r.skorCocok).length;
  console.log(
    `\nKesepakatan pada tingkat SKOR VARIABEL: ${jumlahSkorCocok} dari ${N} aset ` +
      `(${persen((jumlahSkorCocok / N) * 100)}) — keempat skor identik.`,
  );

  // ============================================================
  // BAGIAN C — KALIBRASI DISTRIBUSIONAL
  // ============================================================
  console.log('');
  console.log('='.repeat(104));
  console.log('BAGIAN C — KALIBRASI DISTRIBUSIONAL');
  console.log('='.repeat(104));
  console.log('Persentil = persentase aset dalam dataset yang bernilai DI BAWAH ambang.\n');

  const VARIABEL = [
    {
      key: 'marketCap',
      label: 'Market Cap',
      ambang: [1e8, 1e9, 1e10],
      fn: (v) => scoreMarketCap(v).points,
    },
    {
      key: 'volume24h',
      label: 'Volume 24 Jam',
      ambang: [1e6, 1e7, 1e8],
      fn: (v) => scoreVolume24h(v).points,
    },
    {
      key: 'volatility',
      label: 'Volatilitas',
      ambang: [0.04, 0.08, 0.15],
      fn: (v) => scoreVolatility(v).points,
    },
    {
      key: 'liquidityRatio',
      label: 'Rasio Likuiditas',
      ambang: [0.01, 0.05, 0.1],
      fn: (v) => scoreLiquidityRatio(v).points,
    },
  ];

  const kalibrasi = [];
  for (const v of VARIABEL) {
    const nilai = dataset.map((d) => d[v.key]).sort((a, b) => a - b);
    const persentil = v.ambang.map((t) => posisiPersentil(nilai, t));

    const hitung = [0, 0, 0, 0];
    for (const d of dataset) hitung[v.fn(d[v.key])]++;

    const kosong = hitung
      .map((c, i) => (c === 0 ? i : null))
      .filter((x) => x !== null);
    const dominanIdx = hitung.findIndex((c) => c / dataset.length > 0.9);

    let status;
    if (kosong.length === 0 && dominanIdx === -1) {
      status = 'Semua kelas terisi';
    } else {
      const masalah = [];
      if (kosong.length) {
        masalah.push(`kelas skor ${kosong.join(' dan ')} kosong (0 aset)`);
      }
      if (dominanIdx !== -1) {
        masalah.push(
          `kelas skor ${dominanIdx} menyerap ${persen(
            (hitung[dominanIdx] / dataset.length) * 100,
            1,
          )} populasi (> 90%)`,
        );
      }
      status = masalah.join('; ');
    }

    kalibrasi.push({
      variabel: v.label,
      key: v.key,
      ambang: v.ambang,
      persentil,
      hitung,
      status,
      min: nilai[0],
      max: nilai[nilai.length - 1],
      median: nilai[Math.floor(nilai.length / 2)],
    });
  }

  console.log(
    tabel(
      [
        'Variabel',
        'Ambang 1 (persentil)',
        'Ambang 2 (persentil)',
        'Ambang 3 (persentil)',
        'Sebaran skor 0/1/2/3',
        'Status Kalibrasi',
      ],
      kalibrasi.map((k) => [
        k.variabel,
        persen(k.persentil[0], 2),
        persen(k.persentil[1], 2),
        persen(k.persentil[2], 2),
        k.hitung.join(' / '),
        k.status,
      ]),
      [0, 5],
    ),
  );

  console.log('\nSebaran nilai empiris per variabel:');
  for (const k of kalibrasi) {
    const f = k.key === 'marketCap' || k.key === 'volume24h'
      ? (x) => '$' + fmtID(x, 0)
      : (x) => persen(x * 100, 4);
    console.log(
      `  ${k.variabel.padEnd(18)} min=${String(f(k.min)).padStart(22)}  ` +
        `median=${String(f(k.median)).padStart(22)}  max=${String(f(k.max)).padStart(22)}`,
    );
  }

  // ============================================================
  // BAGIAN D — RINCIAN PER ASET
  // ============================================================
  console.log('');
  console.log('='.repeat(104));
  console.log('BAGIAN D — RINCIAN PER ASET');
  console.log('='.repeat(104));

  console.log(
    tabel(
      [
        'Simbol',
        'Ekosistem',
        'MC',
        'Vol',
        'Vlt',
        'Liq',
        'Total',
        'Level Sistem',
        'Level Acuan',
        'Status',
      ],
      rincian.map((r) => [
        r.simbol,
        r.ekosistem,
        r.skorSistem.marketCap,
        r.skorSistem.volume24h,
        r.skorSistem.volatility,
        r.skorSistem.liquidityRatio,
        r.totalSistem,
        r.levelSistem,
        r.levelAcuan,
        r.cocok ? 'Cocok' : 'BEDA',
      ]),
      [0, 1, 7, 8, 9],
    ),
  );

  const tidakCocok = rincian.filter((r) => !r.cocok);
  console.log('');
  if (tidakCocok.length === 0) {
    console.log(
      `✅ Seluruh ${N} aset diklasifikasikan IDENTIK oleh kedua jalur independen.`,
    );
  } else {
    console.log(`⚠️  ${tidakCocok.length} aset BERBEDA antar-jalur:`);
    for (const r of tidakCocok) {
      console.log(
        `   • ${r.simbol}: sistem=${r.levelSistem} (skor ${r.totalSistem}) ` +
          `vs acuan=${r.levelAcuan} (skor ${r.totalAcuan})`,
      );
    }
  }

  // --- Simpan ---
  writeFileSync(
    OUT_FILE,
    JSON.stringify(
      {
        waktuEksekusiUTC: waktu.toISOString(),
        jumlahAset: N,
        matriksKonfusi: M,
        totalAktual,
        totalPrediksi,
        metrik: {
          akurasi,
          perKelas: metrik,
          kappa,
          pO,
          pE,
          interpretasiKappa: interpretasiKappa(kappa),
        },
        kesepakatanSkorVariabel: { cocok: jumlahSkorCocok, total: N },
        kalibrasi,
        rincian,
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`\nHasil disimpan ke: ${path.relative(ROOT, OUT_FILE)}`);
}

main();

/**
 * TAHAP 3 — MUTATION TESTING
 *
 * Tujuan: membuktikan bahwa test validasi di Tahap 2 benar-benar mampu
 * MENANGKAP kesalahan, bukan test kosong yang selalu lulus.
 *
 * Cara kerja:
 *   1. Simpan isi asli riskClassifier.js ke memori + hitung checksum.
 *   2. Untuk tiap mutasi: terapkan → jalankan test → catat → KEMBALIKAN.
 *   3. Di akhir, verifikasi checksum kembali sama dengan semula.
 *
 * Pemulihan dijamin lewat blok try/finally + handler SIGINT, jadi kode
 * sumber tetap utuh walaupun skrip dihentikan paksa di tengah jalan.
 *
 * Jalankan: node validasi/mutation-test.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SERVER = path.join(ROOT, 'server');
const TARGET = path.join(SERVER, 'src', 'services', 'riskClassifier.js');
const TEST_FILE = 'src/services/__tests__/riskClassifier.validation.test.js';
const OUT_JSON = path.join(__dirname, 'hasil-mutation-test.json');

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

// ============================================================
// Definisi mutasi (sesuai permintaan penguji)
// ============================================================
const MUTATIONS = [
  {
    id: 1,
    nama: 'scoreMarketCap: ambang 1e9 diubah menjadi 2e9',
    deskripsi:
      'Menggeser batas Small Cap / Mid Cap. Menguji apakah test mendeteksi ambang yang salah nilai.',
    from: "  if (value < 1e9) return { points: 2, bucket: 'Small Cap ($100M – $1B)' };",
    to: "  if (value < 2e9) return { points: 2, bucket: 'Small Cap ($100M – $1B)' };",
  },
  {
    id: 2,
    nama: "scoreVolatility: operator '>' pada baris 0.08 diubah menjadi '>='",
    deskripsi:
      'Membalik semantik batas. Menguji apakah test mendeteksi kesalahan arah operator (off-by-one pada titik ambang).',
    from: "  if (value > 0.08) return { points: 2, bucket: 'Tinggi (8% – 15%)' };",
    to: "  if (value >= 0.08) return { points: 2, bucket: 'Tinggi (8% – 15%)' };",
  },
  {
    id: 3,
    nama: 'scoreLiquidityRatio: nilai points dua bucket teratas ditukar',
    deskripsi:
      'Menukar skor 3 dan 2. Menguji apakah test mendeteksi pemetaan skor yang tertukar (bukan ambangnya yang salah).',
    from:
      "  if (value < 0.01) return { points: 3, bucket: 'Sangat rendah (< 1%)' };\n" +
      "  if (value < 0.05) return { points: 2, bucket: 'Rendah (1% – 5%)' };",
    to:
      "  if (value < 0.01) return { points: 2, bucket: 'Sangat rendah (< 1%)' };\n" +
      "  if (value < 0.05) return { points: 3, bucket: 'Rendah (1% – 5%)' };",
  },
];

// ============================================================
// Helper: jalankan Jest, kembalikan ringkasan hasil
// ============================================================
function runTests() {
  // PENTING: Jest menulis ringkasan ("Tests: N passed") ke STDERR, bukan stdout.
  // execFileSync hanya mengembalikan stdout saat proses sukses, jadi stderr
  // harus digabung lewat redirect 2>&1 di level shell agar ringkasan terbaca
  // baik saat test lulus maupun gagal.
  let out = '';
  let exitCode = 0;
  const cmd =
    `"${process.execPath}" --experimental-vm-modules ` +
    `"${path.join('node_modules', 'jest', 'bin', 'jest.js')}" "${TEST_FILE}" 2>&1`;
  try {
    out = execSync(cmd, {
      cwd: SERVER,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (err) {
    exitCode = err.status ?? 1;
    out = `${err.stdout ?? ''}\n${err.stderr ?? ''}`;
  }
  const all = out;

  const m = all.match(/Tests:\s+(?:(\d+) failed,\s+)?(?:(\d+) passed,\s+)?(\d+) total/);
  const failed = m?.[1] ? Number(m[1]) : 0;
  const passed = m?.[2] ? Number(m[2]) : 0;
  const total = m?.[3] ? Number(m[3]) : 0;

  // Nama-nama test yang gagal
  const failingTests = [
    ...new Set(
      [...all.matchAll(/●\s+(.+?)$/gm)]
        .map((x) => x[1].trim())
        .filter(
          (t) =>
            !t.startsWith('Console') &&
            !t.includes('Cannot log after') &&
            t.length > 0,
        ),
    ),
  ];

  return { exitCode, failed, passed, total, failingTests, raw: all };
}

// ============================================================
// Main
// ============================================================
const ORIGINAL = readFileSync(TARGET, 'utf8');
const ORIGINAL_HASH = sha256(ORIGINAL);

function restore() {
  writeFileSync(TARGET, ORIGINAL, 'utf8');
}

// Jaminan pemulihan kalau proses dihentikan paksa
process.on('SIGINT', () => {
  restore();
  console.error('\n[SIGINT] Kode sumber dikembalikan ke keadaan semula.');
  process.exit(130);
});

const hasil = [];

console.log('='.repeat(72));
console.log('TAHAP 3 — MUTATION TESTING');
console.log('='.repeat(72));
console.log(`Berkas target : ${path.relative(ROOT, TARGET)}`);
console.log(`Checksum awal : ${ORIGINAL_HASH}`);
console.log('');

try {
  // --- Baseline: tanpa mutasi ---
  console.log('--- BASELINE (tanpa mutasi) ---');
  const base = runTests();
  console.log(
    `Hasil: ${base.passed} lulus, ${base.failed} gagal, ${base.total} total\n`,
  );

  if (base.failed !== 0) {
    console.warn(
      `PERINGATAN: baseline sudah ada ${base.failed} kegagalan. ` +
        'Angka "tertangkap" dihitung sebagai selisih dari baseline.\n',
    );
  }

  // --- Jalankan tiap mutasi ---
  for (const mut of MUTATIONS) {
    console.log('-'.repeat(72));
    console.log(`MUTASI ${mut.id}: ${mut.nama}`);
    console.log(`Alasan  : ${mut.deskripsi}`);

    if (!ORIGINAL.includes(mut.from)) {
      console.error(`GAGAL: pola sumber tidak ditemukan. Mutasi ${mut.id} dilewati.`);
      hasil.push({
        ...mut,
        status: 'GAGAL_DITERAPKAN',
        alasan: 'Pola kode sumber tidak ditemukan',
      });
      continue;
    }

    // Terapkan mutasi
    const mutated = ORIGINAL.replace(mut.from, mut.to);
    writeFileSync(TARGET, mutated, 'utf8');

    const r = runTests();
    const tertangkap = r.failed > base.failed;

    console.log(
      `Hasil   : ${r.passed} lulus, ${r.failed} gagal dari ${r.total} total`,
    );
    console.log(
      `Status  : ${tertangkap ? '✅ TERTANGKAP' : '❌ LOLOS (survived)'} ` +
        `— ${r.failed - base.failed} test tambahan gagal`,
    );
    if (r.failingTests.length) {
      console.log('Test yang menangkap:');
      r.failingTests.slice(0, 12).forEach((t) => console.log(`   • ${t}`));
      if (r.failingTests.length > 12) {
        console.log(`   ... dan ${r.failingTests.length - 12} lainnya`);
      }
    }
    console.log('');

    hasil.push({
      id: mut.id,
      nama: mut.nama,
      deskripsi: mut.deskripsi,
      testGagal: r.failed,
      testLulus: r.passed,
      testTotal: r.total,
      tambahanGagalDariBaseline: r.failed - base.failed,
      status: tertangkap ? 'TERTANGKAP' : 'LOLOS',
      testPenangkap: r.failingTests,
    });

    // KEMBALIKAN sebelum lanjut ke mutasi berikutnya
    restore();
    const okNow = sha256(readFileSync(TARGET, 'utf8')) === ORIGINAL_HASH;
    console.log(
      `Pemulihan: ${okNow ? 'OK — checksum cocok' : 'GAGAL — checksum TIDAK cocok!'}\n`,
    );
    if (!okNow) throw new Error('Pemulihan gagal, hentikan proses.');
  }

  // --- Verifikasi akhir ---
  const finalHash = sha256(readFileSync(TARGET, 'utf8'));
  const utuh = finalHash === ORIGINAL_HASH;

  console.log('='.repeat(72));
  console.log('RINGKASAN');
  console.log('='.repeat(72));
  const tertangkapCount = hasil.filter((h) => h.status === 'TERTANGKAP').length;
  console.log(`Mutasi tertangkap : ${tertangkapCount} dari ${MUTATIONS.length}`);
  console.log(`Mutation score    : ${((tertangkapCount / MUTATIONS.length) * 100).toFixed(1)}%`);
  console.log(`Checksum akhir    : ${finalHash}`);
  console.log(`Kode sumber utuh  : ${utuh ? 'YA ✅' : 'TIDAK ❌'}`);

  writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        dijalankanPada: new Date().toISOString(),
        checksumAwal: ORIGINAL_HASH,
        checksumAkhir: finalHash,
        kodeSumberUtuh: utuh,
        baseline: { lulus: base.passed, gagal: base.failed, total: base.total },
        mutationScore: `${tertangkapCount}/${MUTATIONS.length}`,
        mutasi: hasil,
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`\nHasil rinci disimpan ke: ${path.relative(ROOT, OUT_JSON)}`);
} finally {
  // Jaring pengaman terakhir — apa pun yang terjadi, kembalikan.
  restore();
}

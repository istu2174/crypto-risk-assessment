/**
 * Menjalankan Jest dan menyimpan hasilnya dalam format JSON, supaya
 * buat-laporan.mjs dapat menurunkan setiap angka dari eksekusi yang
 * sesungguhnya, bukan dari angka yang diketik manual.
 *
 * Menghasilkan dua berkas:
 *   validasi/.jest-hasil.json  → hanya suite riskClassifier.validation
 *   validasi/.jest-total.json  → seluruh test pada repo
 *
 * Jalankan: node validasi/jalankan-test.mjs
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SERVER = path.join(ROOT, 'server');
const JEST = path.join('node_modules', 'jest', 'bin', 'jest.js');

function jalankan(label, argTest, keluaran) {
  const out = path.join('..', 'validasi', keluaran);
  const cmd =
    `"${process.execPath}" --experimental-vm-modules "${JEST}" ` +
    `${argTest} --json --outputFile="${out}"`;

  process.stdout.write(`${label.padEnd(34)} ... `);
  try {
    execSync(cmd, {
      cwd: SERVER,
      stdio: ['ignore', 'ignore', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    // Jest keluar dengan kode bukan-nol kalau ada test gagal.
    // Berkas JSON tetap ditulis, jadi proses diteruskan dan hasilnya
    // dilaporkan apa adanya di bawah.
  }

  const f = path.join(__dirname, keluaran);
  if (!existsSync(f)) {
    console.log('GAGAL — berkas hasil tidak terbentuk');
    process.exitCode = 1;
    return null;
  }
  const r = JSON.parse(readFileSync(f, 'utf8'));
  console.log(
    `${r.numPassedTests} lulus, ${r.numFailedTests} gagal ` +
      `(${r.numPassedTestSuites}/${r.numTotalTestSuites} suite)`,
  );
  return r;
}

console.log('='.repeat(60));
console.log('MENJALANKAN TEST DAN MENYIMPAN HASIL');
console.log('='.repeat(60));

const v = jalankan(
  'Suite validasi riskClassifier',
  'src/services/__tests__/riskClassifier.validation.test.js',
  '.jest-hasil.json',
);
const t = jalankan('Seluruh test pada repo', '', '.jest-total.json');

if (v && t) {
  console.log('');
  console.log(`Test lama (di luar suite validasi): ${t.numPassedTests - v.numPassedTests}`);
  console.log(
    `Status keseluruhan: ${t.numFailedTests === 0 ? 'SEMUA LULUS' : t.numFailedTests + ' TEST GAGAL'}`,
  );
}

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';
import logger from './logger.js';

// Fail fast: tanpa DATABASE_URL, adapter bakal bikin pool ke 'undefined' dan
// errornya baru muncul pas query pertama — susah dilacak waktu deploy.
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL belum di-set. Isi di .env (lokal) atau di environment variables Render (production).');
}

// Prisma 7 nge-drop bundled query engine — sekarang wajib pake driver adapter.
// Untuk PostgreSQL kita pake @prisma/adapter-pg yang under-the-hood pake driver `pg`.
//
// Config pool disesuaikan buat Neon free tier + Render free instance:
// - max kecil (5): Neon pooled endpoint (PgBouncer) punya batas koneksi, dan
//   Render free cuma jalanin 1 proses. Pool gede malah bikin kena limit.
// - idleTimeoutMillis pendek: koneksi nganggur dilepas balik ke pooler.
// - connectionTimeoutMillis longgar: compute Neon di-suspend kalau idle, koneksi
//   pertama setelah bangun butuh beberapa detik.
// - ssl: Neon WAJIB TLS. Normalnya connection string udah bawa `?sslmode=require`
//   dan `pg` bakal verifikasi sertifikat sendiri (Neon pakai CA publik, jadi lolos).
//   Override ssl cuma dipasang sebagai jaring pengaman kalau sslmode kelupaan
//   ditulis di URL — biar koneksi tetap kebentuk, bukan langsung gagal.
const sslmodeAda = /[?&]sslmode=/.test(process.env.DATABASE_URL);

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_POOL_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_POOL_CONNECT_TIMEOUT_MS,
  ssl: sslmodeAda ? undefined : { rejectUnauthorized: false },
});

// Singleton — satu PrismaClient sepanjang lifetime aplikasi.
const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development'
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ]
    : [{ emit: 'event', level: 'error' }],
});

// Pipe log Prisma ke winston supaya format konsisten
prisma.$on('error', (e) => logger.error('Prisma error: %s', e.message ?? e));
prisma.$on('warn', (e) => logger.warn('Prisma warn: %s', e.message ?? e));
if (env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => logger.debug(`Prisma query (${e.duration}ms): ${e.query}`));
}

// Graceful shutdown. Diproteksi flag karena tiga listener di bawah bisa kepanggil
// berbarengan (SIGTERM + beforeExit) — Render ngirim SIGTERM tiap kali service
// di-redeploy atau ditidurin.
let disconnected = false;
async function shutdown() {
  if (disconnected) return;
  disconnected = true;
  await prisma.$disconnect();
  logger.info('Prisma disconnected.');
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('beforeExit', shutdown);

export default prisma;

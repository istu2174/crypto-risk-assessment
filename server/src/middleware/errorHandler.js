import { ZodError } from 'zod';
import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';

// Kode error Prisma yang nandain DB gak bisa diakses (masalah infra, bukan salah user).
// Ref: https://www.prisma.io/docs/orm/reference/error-reference
const DB_CONNECTION_CODES = new Set([
  'P1000', // Authentication failed (kredensial DB salah)
  'P1001', // Can't reach database server
  'P1002', // Server kejangkau tapi timeout
  'P1008', // Operations timed out
  'P1010', // Access denied
  'P1017', // Server nutup koneksi
]);

// Pola pesan dari driver adapter (@prisma/adapter-pg) yang gak punya kode Pxxxx.
// Contoh: Supabase free-tier ke-pause → Supavisor balikin "tenant/user not found"
// dengan ENOTFOUND. Lihat memory project soal Supabase auto-pause.
const DB_CONNECTION_PATTERNS = [
  'enotfound',         // DNS gagal / Supabase project paused
  'econnrefused',      // server nolak koneksi
  'etimedout',         // timeout konek
  'tenant or user',    // Supavisor: project paused / kredensial salah
  'tenant/user',
  "can't reach database",
];

// Deteksi apakah error ini soal koneksi DB (bukan query logic / constraint).
function isDbConnectionError(err) {
  // Prisma known request/init error bawa `code` berformat Pxxxx
  if (err?.code && DB_CONNECTION_CODES.has(err.code)) return true;
  // DriverAdapterError dari adapter-pg cuma punya message, jadi cek pola string
  const msg = (err?.message || '').toLowerCase();
  return DB_CONNECTION_PATTERNS.some((p) => msg.includes(p));
}

// Central error handler — semua error dari controller masuk sini lewat next(err)
// atau lewat express-async-handler yang auto-forward rejected promise.
// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, next) {
  // 1. Zod validation error → 400
  if (err instanceof ZodError) {
    const message = err.issues
      .map((i) => `${i.path.join('.') || 'input'}: ${i.message}`)
      .join('; ');
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message },
    });
  }

  // 2. ApiError yg sengaja kita throw dari service/controller
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  // 3. Error koneksi database (DB down / Supabase paused / DNS) → 503
  //    Dipisah dari INTERNAL_ERROR generic biar pesan ke client jelas & actionable.
  if (isDbConnectionError(err)) {
    logger.error('Database unavailable: %s', err.message, { stack: err.stack });
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database lagi gak bisa diakses. Coba beberapa saat lagi.',
      },
    });
  }

  // 4. Unexpected error — log + sembunyikan detail dari client
  logger.error('Unhandled error: %s', err.message, { stack: err.stack });
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan internal pada server.' },
  });
}

import { env } from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Rate limiter sederhana (in-memory, fixed window) per IP.
 *
 * Cukup buat skripsi — gak butuh Redis. Tiap IP punya counter yang di-reset
 * tiap window (default 1 menit). Lewat batas → 429 RATE_LIMIT.
 *
 * Catatan produksi: in-memory = per-instance (gak share antar server). Buat
 * 1 instance (deploy skripsi) ini cukup. Kalau scale horizontal, baru butuh
 * store eksternal (Redis).
 */

// Map<ip, { count, resetAt }>
const hits = new Map();

// Bersihin entry kadaluarsa berkala biar Map gak numpuk selamanya.
// unref() biar interval ini gak nahan proses exit.
const CLEANUP_INTERVAL_MS = 5 * 60_000;
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of hits) {
    if (now > entry.resetAt) hits.delete(ip);
  }
}, CLEANUP_INTERVAL_MS);
if (typeof cleanup.unref === 'function') cleanup.unref();

export default function rateLimiter(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();

  let entry = hits.get(ip);
  // Window baru kalau belum ada entry atau window lama udah lewat
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + env.RATE_LIMIT_WINDOW_MS };
    hits.set(ip, entry);
  }

  entry.count += 1;

  // Info sisa kuota di header (konvensi umum)
  const remaining = Math.max(0, env.RATE_LIMIT_MAX - entry.count);
  res.set('X-RateLimit-Limit', String(env.RATE_LIMIT_MAX));
  res.set('X-RateLimit-Remaining', String(remaining));

  if (entry.count > env.RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    res.set('Retry-After', String(retryAfterSec));
    logger.warn(`Rate limit kena buat IP ${ip} (${entry.count} req)`);
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT',
        message: `Terlalu banyak request. Coba lagi dalam ${retryAfterSec} detik.`,
      },
    });
  }

  next();
}

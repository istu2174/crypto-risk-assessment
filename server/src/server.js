import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import logger from './utils/logger.js';
import prisma from './utils/prisma.js';
import { pingCoinGecko } from './services/coingeckoService.js';
import ApiError from './utils/ApiError.js';
import errorHandler from './middleware/errorHandler.js';
import rateLimiter from './middleware/rateLimiter.js';
import authRoutes from './routes/authRoutes.js';
import marketRoutes from './routes/marketRoutes.js';
import riskRoutes from './routes/riskRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import scanRoutes from './routes/scanRoutes.js';

const app = express();

// === Trust proxy ===
// Di Render (dan platform PaaS lain) app jalan di belakang reverse proxy, jadi
// req.ip default-nya bakal ngebaca IP proxy — semua user kelihatan sama dan rate
// limiter jadi limit global, bukan per-user. Dengan 'trust proxy' = 1, Express
// ngambil IP asli dari header X-Forwarded-For (hop pertama).
app.set('trust proxy', 1);

// === Middleware global ===
// CORS: whitelist origin frontend doang, jangan '*'. Daftar origin diambil dari
// env FRONTEND_URL (boleh lebih dari satu, dipisah koma). Request tanpa header
// Origin (curl, health check Render, server-to-server) tetap diizinkan karena
// bukan request cross-origin dari browser.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const clean = origin.replace(/\/+$/, '');
      if (env.ALLOWED_ORIGINS.includes(clean)) return callback(null, true);
      logger.warn(`CORS ditolak buat origin: ${origin}`);
      // Pakai ApiError biar keluar 403 dengan format response standar
      // ({ success:false, error:{ code, message } }), bukan 500 generic.
      return callback(
        new ApiError('CORS_FORBIDDEN', `Origin ${origin} gak diizinkan mengakses API ini.`, 403)
      );
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

// === Health check (ringan) — dipakai health check Render & buat "bangunin" server ===
// Sengaja SELALU 200 dan gak nyentuh DB/API eksternal: kalau health check platform
// ikut mati gara-gara Neon lagi suspend, Render bakal nge-restart service terus-terusan
// padahal app-nya sendiri sehat. Cek dependency yang mendalam ada di /api/health.
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      uptimeSec: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

// === Health check (mendalam) ===
// Cek dependency penting: DB (live), CoinGecko (ping), Helius (konfigurasi).
// Ditaruh SEBELUM rate limiter biar monitoring gak ke-throttle.
app.get('/api/health', async (req, res) => {
  // DB: query super ringan buat mastiin koneksi hidup
  let database = 'down';
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'up';
  } catch (err) {
    logger.warn(`Health check: DB down — ${err.message}`);
  }

  // CoinGecko: ping (gak ngabisin kuota data). Helius: cukup cek key ada
  // (live ping bakal makan credit, jadi gak dilakuin per health check).
  const coingecko = (await pingCoinGecko()) ? 'up' : 'down';
  const helius = env.HELIUS_API_KEY ? 'configured' : 'not_configured';

  // Status keseluruhan: 'ok' kalau DB hidup, 'degraded' kalau DB mati
  // (DB = dependency paling kritis; tanpa itu auth & scan gak jalan).
  const ok = database === 'up';
  res.status(ok ? 200 : 503).json({
    success: ok,
    data: {
      status: ok ? 'ok' : 'degraded',
      uptimeSec: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: { database, coingecko, helius },
    },
  });
});

// === Rate limiter — semua route /api setelah ini kena limit per IP ===
app.use(rateLimiter);

// === Routes ===
app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/scan', scanRoutes);

// === 404 handler — harus sebelum errorHandler ===
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} tidak ditemukan.` },
  });
});

// === Error handler global — wajib di paling akhir ===
app.use(errorHandler);

// Listen di 0.0.0.0 supaya bisa diakses dari luar container (syarat Render).
app.listen(env.PORT, env.HOST, () => {
  logger.info(`Server jalan di ${env.HOST}:${env.PORT} (env: ${env.NODE_ENV})`);
  logger.info(`CORS origin diizinkan: ${env.ALLOWED_ORIGINS.join(', ')}`);
});

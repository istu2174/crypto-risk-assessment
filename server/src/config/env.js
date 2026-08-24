import 'dotenv/config';

// Helper buat baca env sebagai number dengan fallback
function num(key, fallback) {
  const v = process.env[key];
  return v ? Number(v) : fallback;
}

// Helper: parse daftar origin (dipisah koma) jadi array bersih.
// Trailing slash dibuang karena header Origin dari browser gak pernah punya slash,
// jadi 'https://app.vercel.app/' gak akan pernah match kalau gak dinormalisasi.
function originList(raw) {
  return (raw ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

// Centralized config — semua akses env lewat object ini, jangan langsung process.env
export const env = {
  PORT: num('PORT', 5000),
  // Wajib 0.0.0.0 di container (Render): kalau listen di 127.0.0.1, port-nya
  // gak kelihatan dari luar container dan deploy dianggap gagal.
  HOST: process.env.HOST ?? '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV ?? 'development',

  // Whitelist origin buat CORS. FRONTEND_URL = nama var yang dipakai di production
  // (Render). CLIENT_ORIGIN tetap didukung biar .env development yang lama gak perlu
  // diubah. Boleh diisi lebih dari satu, pisah pakai koma:
  //   FRONTEND_URL=https://nama-app.vercel.app,https://nama-app-git-main.vercel.app
  ALLOWED_ORIGINS: originList(
    process.env.FRONTEND_URL ?? process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
  ),

  COINGECKO_API_KEY: process.env.COINGECKO_API_KEY ?? '',
  HELIUS_API_KEY: process.env.HELIUS_API_KEY ?? '',
  INFURA_PROJECT_ID: process.env.INFURA_PROJECT_ID ?? '',
  // Alchemy: ambil holdings ERC-20 di Ethereum (alchemy_getTokenBalances).
  // Infura RPC murni gak bisa enumerate semua token, makanya pakai Alchemy.
  ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY ?? '',

  CACHE_TTL_MARKET: num('CACHE_TTL_MARKET', 60),
  CACHE_TTL_HISTORY: num('CACHE_TTL_HISTORY', 300),
  CACHE_TTL_COIN_LIST: num('CACHE_TTL_COIN_LIST', 86400),
  CACHE_TTL_NONCE: num('CACHE_TTL_NONCE', 300),
  CACHE_TTL_HOLDINGS: num('CACHE_TTL_HOLDINGS', 60),

  JWT_SECRET: process.env.JWT_SECRET ?? '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',

  // Rate limiter incoming (per IP, fixed window)
  RATE_LIMIT_WINDOW_MS: num('RATE_LIMIT_WINDOW_MS', 60_000), // 1 menit
  RATE_LIMIT_MAX: num('RATE_LIMIT_MAX', 100), // 100 req/menit/IP

  // Throttle outbound enrich CoinGecko saat scan (jumlah aset diproses barengan)
  SCAN_CONCURRENCY: num('SCAN_CONCURRENCY', 3),

  // === Connection pool PostgreSQL (Neon) ===
  // Neon free tier + Render free instance: pool kecil itu WAJIB. Neon pooled
  // endpoint (PgBouncer) punya batas koneksi, dan instance Render cuma 1 proses,
  // jadi 5 koneksi udah lebih dari cukup. idle timeout dibikin pendek supaya
  // koneksi dilepas balik ke pooler waktu app lagi nganggur.
  DB_POOL_MAX: num('DB_POOL_MAX', 5),
  DB_POOL_IDLE_TIMEOUT_MS: num('DB_POOL_IDLE_TIMEOUT_MS', 10_000),
  // Neon nge-suspend compute kalau idle; koneksi pertama abis bangun bisa lama,
  // jadi timeout-nya dikasih longgar (10 detik) biar gak langsung error.
  DB_POOL_CONNECT_TIMEOUT_MS: num('DB_POOL_CONNECT_TIMEOUT_MS', 10_000),
};

// Fail fast kalau secret kosong — auth gak boleh jalan tanpa secret
if (!env.JWT_SECRET) {
  throw new Error('JWT_SECRET belum di-set di .env. Generate pakai `node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"`');
}

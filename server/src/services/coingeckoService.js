import axios from 'axios';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';
import { env } from '../config/env.js';

// Base URL public/free tier CoinGecko. Kalau pakai demo key, header
// 'x-cg-demo-api-key' dibutuhin (free tier, 30 req/min, lebih reliable
// dibanding tanpa key).
const BASE_URL = 'https://api.coingecko.com/api/v3';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: env.COINGECKO_API_KEY
    ? { 'x-cg-demo-api-key': env.COINGECKO_API_KEY, accept: 'application/json' }
    : { accept: 'application/json' },
});

// Retry config buat 429 (rate limit). Backoff eksponensial: 1s, 2s.
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 1000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: bungkus axios call dengan error mapping ke ApiError.
// Auto-retry kalau kena 429 (sampai MAX_RETRIES) sebelum nyerah.
async function request(path, params = {}, attempt = 0) {
  try {
    logger.debug(`CoinGecko GET ${path} %o`, params);
    const { data } = await client.get(path, { params });
    return data;
  } catch (err) {
    const status = err.response?.status;

    if (status === 429) {
      // Masih ada jatah retry → tunggu (backoff) lalu coba lagi
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_MS * 2 ** attempt; // 1s, lalu 2s
        logger.warn(
          `CoinGecko 429 di ${path} — retry ${attempt + 1}/${MAX_RETRIES} dalam ${delay}ms`,
        );
        await sleep(delay);
        return request(path, params, attempt + 1);
      }
      logger.warn(`CoinGecko rate limit (429) di endpoint ${path} — nyerah setelah retry`);
      throw new ApiError(
        'COINGECKO_RATE_LIMIT',
        'Rate limit CoinGecko terlampaui. Coba lagi beberapa saat.',
        429,
      );
    }

    if (status === 404) {
      throw new ApiError(
        'COIN_NOT_FOUND',
        'Coin tidak ditemukan di CoinGecko.',
        404,
      );
    }

    logger.error(
      `CoinGecko request gagal (${path}): ${err.message}`,
      { status, data: err.response?.data },
    );
    throw new ApiError(
      'COINGECKO_ERROR',
      'Gagal mengambil data dari CoinGecko.',
      502,
    );
  }
}

/**
 * Ambil market data lengkap suatu coin.
 * Mapping field yg dipake risk classifier nanti: marketCap, volume24h, currentPrice.
 */
export async function getCoinMarketData(coinId) {
  const cacheKey = `market:${coinId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug(`Cache HIT: ${cacheKey}`);
    return cached;
  }

  // localization=false dll buat ngecilin payload
  const data = await request(`/coins/${coinId}`, {
    localization: false,
    tickers: false,
    community_data: false,
    developer_data: false,
    sparkline: false,
  });

  const md = data.market_data ?? {};
  const result = {
    id: data.id,
    symbol: data.symbol,
    name: data.name,
    image: data.image?.large ?? null,
    currentPrice: md.current_price?.usd ?? null,
    marketCap: md.market_cap?.usd ?? null,
    volume24h: md.total_volume?.usd ?? null,
    priceChange24h: md.price_change_percentage_24h ?? null,
    priceChange7d: md.price_change_percentage_7d ?? null,
    priceChange30d: md.price_change_percentage_30d ?? null,
    marketCapRank: data.market_cap_rank ?? null,
    lastUpdated: md.last_updated ?? null,
  };

  cache.set(cacheKey, result, env.CACHE_TTL_MARKET);
  return result;
}

/**
 * Ambil array harga harian (default 30 hari) buat hitung volatilitas.
 * Response CoinGecko: { prices: [[ts, price], ...], market_caps: [...], total_volumes: [...] }
 */
export async function getCoinHistoricalPrices(coinId, days = 30) {
  const cacheKey = `history:${coinId}:${days}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug(`Cache HIT: ${cacheKey}`);
    return cached;
  }

  const data = await request(`/coins/${coinId}/market_chart`, {
    vs_currency: 'usd',
    days,
    interval: 'daily',
  });

  const result = {
    coinId,
    days,
    prices: (data.prices ?? []).map(([timestamp, price]) => ({ timestamp, price })),
  };

  cache.set(cacheKey, result, env.CACHE_TTL_HISTORY);
  return result;
}

/**
 * List semua coin di CoinGecko (id, symbol, name). Dipake buat mapping
 * symbol → coingeckoId waktu fetch portfolio nanti. Cache 24 jam.
 */
export async function getCoinList() {
  const cacheKey = 'coinList';
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug('Cache HIT: coinList');
    return cached;
  }

  const data = await request('/coins/list');
  cache.set(cacheKey, data, env.CACHE_TTL_COIN_LIST);
  return data;
}

/**
 * Sama kayak getCoinList tapi sertain `platforms` (mint address per chain).
 * Response item: { id, symbol, name, platforms: { solana: 'EPjFW...', ethereum: '0x...' } }
 * Dipake coinResolver buat map mint → coingeckoId.
 */
export async function getCoinListWithPlatforms() {
  const cacheKey = 'coinListWithPlatforms';
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug('Cache HIT: coinListWithPlatforms');
    return cached;
  }

  const data = await request('/coins/list', { include_platform: true });
  cache.set(cacheKey, data, env.CACHE_TTL_COIN_LIST);
  return data;
}

/**
 * Ping CoinGecko buat health check. Pakai timeout pendek & gak retry —
 * tujuannya cuma cek "reachable atau gak", bukan ngambil data.
 * Return true kalau /ping balas 200, false kalau error apa pun.
 */
export async function pingCoinGecko() {
  try {
    await client.get('/ping', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Search coin by name/symbol. Hasil dibatasin top 25 biar response kecil.
 */
export async function searchCoin(query) {
  const data = await request('/search', { query });
  return {
    query,
    coins: (data.coins ?? []).slice(0, 25).map((c) => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      marketCapRank: c.market_cap_rank ?? null,
      thumb: c.thumb ?? null,
    })),
  };
}

import axios from 'axios';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';
import { env } from '../config/env.js';

// Helius DAS API (Solana RPC + asset metadata). Pakai mainnet endpoint
// dengan API key di query string (sesuai docs Helius).
//   docs: https://docs.helius.dev/compression-and-das-api/digital-asset-standard-das-api
const HELIUS_RPC_URL = 'https://mainnet.helius-rpc.com';

const client = axios.create({
  baseURL: HELIUS_RPC_URL,
  timeout: 20000,
  headers: { 'content-type': 'application/json', accept: 'application/json' },
});

// Helper: panggil JSON-RPC method ke Helius, bungkus error ke ApiError
async function rpc(method, params) {
  if (!env.HELIUS_API_KEY) {
    throw new ApiError(
      'HELIUS_NOT_CONFIGURED',
      'HELIUS_API_KEY belum di-set di server.',
      500
    );
  }

  try {
    logger.debug(`Helius RPC ${method}`);
    const { data } = await client.post(`/?api-key=${env.HELIUS_API_KEY}`, {
      jsonrpc: '2.0',
      id: 'cryptorisk',
      method,
      params,
    });

    if (data.error) {
      logger.error(`Helius RPC error: %o`, data.error);
      throw new ApiError(
        'HELIUS_RPC_ERROR',
        data.error.message ?? 'Helius RPC mengembalikan error.',
        502
      );
    }

    return data.result;
  } catch (err) {
    // Re-throw ApiError yang udah kita lempar sendiri (dari blok di atas)
    if (err instanceof ApiError) throw err;

    const status = err.response?.status;

    if (status === 429) {
      logger.warn('Helius rate limit (429)');
      throw new ApiError(
        'HELIUS_RATE_LIMIT',
        'Rate limit Helius terlampaui. Coba lagi beberapa saat.',
        429
      );
    }

    logger.error(`Helius request gagal: ${err.message}`, {
      status,
      data: err.response?.data,
    });
    throw new ApiError(
      'HELIUS_ERROR',
      'Gagal mengambil data dari Helius.',
      502
    );
  }
}

// ============================================================
// NORMALIZATION
// ============================================================
// Helius DAS response gabung token + NFT. Kita filter ke fungible aja
// dan normalize ke shape yang gampang dipake risk classifier nanti.
// ============================================================

// Interface name yang dianggap fungible token (bukan NFT)
const FUNGIBLE_INTERFACES = new Set(['FungibleToken', 'FungibleAsset']);

// Lamports → SOL (1 SOL = 1e9 lamports)
const LAMPORTS_PER_SOL = 1e9;

/**
 * Ubah raw item DAS jadi shape internal kita. Skip kalau bukan fungible
 * atau balance 0.
 */
export function normalizeFungibleItem(item) {
  if (!FUNGIBLE_INTERFACES.has(item.interface)) return null;

  const info = item.token_info ?? {};
  const decimals = info.decimals ?? 0;
  const rawBalance = Number(info.balance ?? 0);
  if (rawBalance === 0) return null;

  // raw → human-readable (divide by 10^decimals)
  const balance = rawBalance / Math.pow(10, decimals);

  const meta = item.content?.metadata ?? {};
  const priceInfo = info.price_info ?? null;

  return {
    mint: item.id,
    symbol: info.symbol ?? meta.symbol ?? 'UNKNOWN',
    name: meta.name ?? null,
    balance,
    decimals,
    priceUsd: priceInfo?.price_per_token ?? null,
    valueUsd: priceInfo?.total_price ?? null,
  };
}

/**
 * Normalize native SOL balance dari field `nativeBalance` di DAS response.
 * Return null kalau gak ada SOL (atau 0).
 */
export function normalizeNativeSol(nativeBalance) {
  if (!nativeBalance) return null;
  const lamports = Number(nativeBalance.lamports ?? 0);
  if (lamports === 0) return null;

  return {
    mint: 'So11111111111111111111111111111111111111112', // wrapped SOL mint (convention)
    symbol: 'SOL',
    name: 'Solana',
    balance: lamports / LAMPORTS_PER_SOL,
    decimals: 9,
    priceUsd: nativeBalance.price_per_sol ?? null,
    valueUsd: nativeBalance.total_price ?? null,
  };
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Fetch semua holdings (SOL native + SPL token fungible) buat 1 wallet
 * Solana. Cache 60 detik per address.
 *
 * @param {string} walletAddress - Solana address (base58)
 * @returns {Promise<{walletAddress, totalAssets, totalValueUsd, holdings: Array}>}
 */
export async function getSolanaWalletHoldings(walletAddress) {
  const cacheKey = `helius:holdings:${walletAddress}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug(`Cache HIT: ${cacheKey}`);
    return cached;
  }

  const result = await rpc('getAssetsByOwner', {
    ownerAddress: walletAddress,
    page: 1,
    limit: 1000,
    displayOptions: {
      showFungible: true,
      showNativeBalance: true,
      showZeroBalance: false,
    },
  });

  // 1. Normalize SPL tokens (skip NFT, skip balance 0)
  const tokens = (result.items ?? [])
    .map(normalizeFungibleItem)
    .filter(Boolean);

  // 2. Normalize native SOL
  const sol = normalizeNativeSol(result.nativeBalance);

  // Gabungin SOL di awal list (biasanya holding paling besar)
  const holdings = sol ? [sol, ...tokens] : tokens;

  // 3. Aggregate total value (skip yg null price)
  const totalValueUsd = holdings.reduce(
    (sum, h) => sum + (h.valueUsd ?? 0),
    0
  );

  const normalized = {
    walletAddress,
    totalAssets: holdings.length,
    totalValueUsd,
    holdings,
  };

  cache.set(cacheKey, normalized, env.CACHE_TTL_HOLDINGS);
  return normalized;
}

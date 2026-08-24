import axios from 'axios';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { mapSettledWithConcurrency } from '../utils/concurrency.js';

// ============================================================
// ALCHEMY SERVICE — holdings Ethereum (native ETH + ERC-20)
// ============================================================
// Kenapa Alchemy, bukan Infura?
//   Infura RPC murni cuma punya eth_getBalance (ETH native doang). Buat
//   enumerate SEMUA token ERC-20 yang dimiliki 1 address butuh indexer.
//   Alchemy punya `alchemy_getTokenBalances` (enhanced API) yang 1 call
//   balikin semua token — mirror-nya Helius getAssetsByOwner di Solana.
//   docs: https://docs.alchemy.com/reference/alchemy-gettokenbalances
// ============================================================

const ALCHEMY_BASE = 'https://eth-mainnet.g.alchemy.com/v2';

// Sentinel address buat native ETH (ETH bukan ERC-20, gak punya contract).
// Konvensi de-facto 0xEeee...eEEeE dipakai banyak protokol (Aave, 1inch).
// resolveErc20Contract() nge-map ini → coingeckoId 'ethereum'.
export const NATIVE_ETH_MINT = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

const WEI_PER_ETH = 1e18;

const client = axios.create({
  timeout: 20000,
  headers: { 'content-type': 'application/json', accept: 'application/json' },
});

// Helper: panggil JSON-RPC method ke Alchemy, bungkus error ke ApiError.
// Pola sama persis kayak heliusService.rpc biar konsisten.
async function rpc(method, params) {
  if (!env.ALCHEMY_API_KEY) {
    throw new ApiError(
      'ALCHEMY_NOT_CONFIGURED',
      'ALCHEMY_API_KEY belum di-set di server.',
      500
    );
  }

  try {
    logger.debug(`Alchemy RPC ${method}`);
    const { data } = await client.post(`${ALCHEMY_BASE}/${env.ALCHEMY_API_KEY}`, {
      jsonrpc: '2.0',
      id: 'cryptorisk',
      method,
      params,
    });

    if (data.error) {
      logger.error('Alchemy RPC error: %o', data.error);
      throw new ApiError(
        'ALCHEMY_RPC_ERROR',
        data.error.message ?? 'Alchemy RPC mengembalikan error.',
        502
      );
    }

    return data.result;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    const status = err.response?.status;
    if (status === 429) {
      logger.warn('Alchemy rate limit (429)');
      throw new ApiError(
        'ALCHEMY_RATE_LIMIT',
        'Rate limit Alchemy terlampaui. Coba lagi beberapa saat.',
        429
      );
    }

    logger.error(`Alchemy request gagal: ${err.message}`, {
      status,
      data: err.response?.data,
    });
    throw new ApiError('ALCHEMY_ERROR', 'Gagal mengambil data dari Alchemy.', 502);
  }
}

// ============================================================
// NORMALIZATION
// ============================================================

/**
 * Convert balance hex (wei-like, raw) → human-readable pakai decimals.
 * Pakai BigInt biar gak overflow buat angka gede, baru di-convert ke Number.
 */
export function hexToTokenAmount(hexBalance, decimals) {
  if (!hexBalance || hexBalance === '0x' || hexBalance === '0x0') return 0;
  const raw = BigInt(hexBalance);
  if (raw === 0n) return 0;
  return Number(raw) / Math.pow(10, decimals);
}

/**
 * Normalize native ETH balance dari hasil eth_getBalance (hex wei).
 * Return null kalau 0.
 */
export function normalizeNativeEth(hexWeiBalance) {
  const eth = hexToTokenAmount(hexWeiBalance, 18);
  if (eth === 0) return null;
  return {
    mint: NATIVE_ETH_MINT,
    symbol: 'ETH',
    name: 'Ethereum',
    balance: eth,
    decimals: 18,
    priceUsd: null, // harga authoritative dari CoinGecko (di scan service)
    valueUsd: null,
  };
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Fetch semua holdings (ETH native + ERC-20) buat 1 address Ethereum.
 * Cache per-address (sama TTL kayak Helius holdings).
 *
 * @param {string} address - Ethereum address (0x...)
 * @returns {Promise<{walletAddress, totalAssets, totalValueUsd, holdings: Array}>}
 */
export async function getEthereumWalletHoldings(address) {
  const cacheKey = `alchemy:holdings:${address.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug(`Cache HIT: ${cacheKey}`);
    return cached;
  }

  // 1. Native ETH + daftar ERC-20 (paralel)
  const [weiHex, tokenResult] = await Promise.all([
    rpc('eth_getBalance', [address, 'latest']),
    rpc('alchemy_getTokenBalances', [address, 'erc20']),
  ]);

  // 2. Filter token yang balance-nya non-zero & gak error
  const rawTokens = (tokenResult.tokenBalances ?? []).filter(
    (t) => !t.error && t.tokenBalance && BigInt(t.tokenBalance) > 0n
  );

  // 3. Ambil metadata (decimals/symbol/name) per token. Batasi konkurensi
  //    biar gak burst ke Alchemy. enrich gagal di 1 token gak ngebunuh yang lain.
  const metaSettled = await mapSettledWithConcurrency(
    rawTokens,
    5,
    (t) => rpc('alchemy_getTokenMetadata', [t.contractAddress])
  );

  const tokens = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const settled = metaSettled[i];
    const raw = rawTokens[i];
    if (settled.status !== 'fulfilled') {
      logger.warn(`Metadata token ${raw.contractAddress} gagal, di-skip.`);
      continue;
    }
    const meta = settled.value ?? {};
    const decimals = meta.decimals ?? 18;
    const balance = hexToTokenAmount(raw.tokenBalance, decimals);
    if (balance === 0) continue;

    tokens.push({
      mint: raw.contractAddress.toLowerCase(), // contract = "mint"-nya ETH
      symbol: (meta.symbol ?? 'UNKNOWN').toUpperCase(),
      name: meta.name ?? null,
      balance,
      decimals,
      priceUsd: null,
      valueUsd: null,
    });
  }

  // 4. Native ETH di awal list (biasanya holding utama)
  const ethNative = normalizeNativeEth(weiHex);
  const holdings = ethNative ? [ethNative, ...tokens] : tokens;

  const normalized = {
    walletAddress: address,
    totalAssets: holdings.length,
    totalValueUsd: 0, // ETH/Alchemy gak kasih harga; diisi di scan service
    holdings,
  };

  cache.set(cacheKey, normalized, env.CACHE_TTL_HOLDINGS);
  return normalized;
}

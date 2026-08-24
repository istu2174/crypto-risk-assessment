import cache from '../utils/cache.js';
import logger from '../utils/logger.js';
import { env } from '../config/env.js';
import { getCoinListWithPlatforms } from './coingeckoService.js';
import { NATIVE_ETH_MINT } from './alchemyService.js';

/**
 * Coin Resolver — map Solana mint address ke CoinGecko ID.
 
 * Why this exists:
 *   Helius DAS API kasih kita `mint` (e.g. "EPjFWdd5..." untuk USDC), tapi
 *   risk classifier butuh data market dari CoinGecko yang pake `coingeckoId`
 *   (e.g. "usd-coin"). Resolver ini jembatannya.
 
 * Source data:
 *   CoinGecko /coins/list?include_platform=true → array { id, symbol, platforms }
 *   Tiap entry punya field platforms.solana (mint) kalau token-nya ada di Solana.
 */

// ============================================================
// SPECIAL CASES
// ============================================================
// Token yang gak punya "real mint" di CoinGecko platforms list, tapi tetep
// perlu di-resolve. Native SOL = paling penting.

// Wrapped SOL mint (de facto canonical mint untuk SOL di Solana programs).
// Helius juga pake mint ini buat native SOL di response normalisasi kita.
const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';

// Mapping hardcoded — di-merge dengan hasil dari CoinGecko list
const SPECIAL_CASES = new Map([
  [NATIVE_SOL_MINT, 'solana'],
]);

// ============================================================
// MAP BUILDER
// ============================================================

const MAP_CACHE_KEY = 'solanaMintToCoingeckoId';

/**
 * Pure function: build Map<mint, coingeckoId> dari array coin list CoinGecko.
 * Di-extract dari getSolanaMintMap supaya gampang di-unit-test tanpa mock fetch.
 
 * Skip entry yang gak punya platforms.solana. Special case menang kalau
 * mint sama (misal SOL native).
 */
export function buildSolanaMintMap(coinList) {
  if (!Array.isArray(coinList)) {
    throw new Error('coinList harus array.');
  }

  const map = new Map(SPECIAL_CASES);

  for (const coin of coinList) {
    const solanaMint = coin.platforms?.solana;
    if (solanaMint && typeof solanaMint === 'string' && solanaMint.length > 0) {
      // Kalau ada konflik (misal special case udah ke-set), special case menang
      if (!map.has(solanaMint)) {
        map.set(solanaMint, coin.id);
      }
    }
  }

  return map;
}

/**
 * Bangun Map<mint, coingeckoId> dari CoinGecko coin list.
 * Cache hasilnya 24 jam.
 *
 * Catatan: list CoinGecko ~10K+ entries. Map lookup O(1) jauh lebih cepet
 * daripada array.find() berulang.
 */
export async function getSolanaMintMap() {
  const cached = cache.get(MAP_CACHE_KEY);
  if (cached) {
    logger.debug(`Cache HIT: ${MAP_CACHE_KEY} (${cached.size} entries)`);
    return cached;
  }

  const coinList = await getCoinListWithPlatforms();
  const map = buildSolanaMintMap(coinList);

  logger.debug(`Built solanaMintMap: ${map.size} entries`);
  cache.set(MAP_CACHE_KEY, map, env.CACHE_TTL_COIN_LIST);
  return map;
}

/**
 * Resolve 1 mint → coingeckoId. Return null kalau gak ketemu.
 */
export async function resolveMint(mint) {
  const map = await getSolanaMintMap();
  return map.get(mint) ?? null;
}

// ============================================================
// ETHEREUM RESOLVER — contract address → coingeckoId
// ============================================================
// Pola sama kayak Solana, tapi pakai platforms.ethereum. Contract address
// di-lowercase biar match konsisten (CoinGecko & Alchemy kadang beda casing).

const ETH_MAP_CACHE_KEY = 'ethContractToCoingeckoId';

const ETH_SPECIAL_CASES = new Map([
  // Native ETH gak punya contract; pakai sentinel dari alchemyService.
  [NATIVE_ETH_MINT, 'ethereum'],
]);

/**
 * Pure function: build Map<contractLowercase, coingeckoId> dari coin list.
 * Di-extract biar gampang di-unit-test tanpa mock fetch.
 */
export function buildEthContractMap(coinList) {
  if (!Array.isArray(coinList)) {
    throw new Error('coinList harus array.');
  }

  const map = new Map(ETH_SPECIAL_CASES);

  for (const coin of coinList) {
    const contract = coin.platforms?.ethereum;
    if (contract && typeof contract === 'string' && contract.length > 0) {
      const key = contract.toLowerCase();
      if (!map.has(key)) {
        map.set(key, coin.id);
      }
    }
  }

  return map;
}

/**
 * Bangun Map<contract, coingeckoId> Ethereum dari CoinGecko coin list.
 * Cache 24 jam (sama list yang dipake Solana, cuma platform beda).
 */
export async function getEthContractMap() {
  const cached = cache.get(ETH_MAP_CACHE_KEY);
  if (cached) {
    logger.debug(`Cache HIT: ${ETH_MAP_CACHE_KEY} (${cached.size} entries)`);
    return cached;
  }

  const coinList = await getCoinListWithPlatforms();
  const map = buildEthContractMap(coinList);

  logger.debug(`Built ethContractMap: ${map.size} entries`);
  cache.set(ETH_MAP_CACHE_KEY, map, env.CACHE_TTL_COIN_LIST);
  return map;
}

/**
 * Batch resolve contract Ethereum → coingeckoId. Return Map dengan key sama
 * persis kayak input (contract di-lowercase saat lookup).
 */
export async function resolveEthContracts(contracts) {
  const map = await getEthContractMap();
  const result = new Map();
  for (const contract of contracts) {
    result.set(contract, map.get(contract.toLowerCase()) ?? null);
  }
  return result;
}

/**
 * Batch resolve. Return Map<mint, coingeckoId|null> dengan key sama persis
 * kayak input (mint yg gak ke-resolve dapet null).
 *
 * Lebih efisien dari panggil resolveMint() per item karena cuma 1x bangun
 * map (dan cache hit di iterasi kedua).
 */
export async function resolveMints(mints) {
  const map = await getSolanaMintMap();
  const result = new Map();
  for (const mint of mints) {
    result.set(mint, map.get(mint) ?? null);
  }
  return result;
}

// Export buat test / debug
export const _internal = {
  NATIVE_SOL_MINT,
  SPECIAL_CASES,
  NATIVE_ETH_MINT,
  ETH_SPECIAL_CASES,
};

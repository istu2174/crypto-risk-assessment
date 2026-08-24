import axios from 'axios';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';
import { env } from '../config/env.js';

// ============================================================
// BLOCKSTREAM SERVICE — balance Bitcoin (address-tracking)
// ============================================================
// BTC gak punya standar wallet sign-in web (beda dari MetaMask/Phantom), jadi
// BTC cuma bisa DI-TRACK: user paste address, sistem ambil balance.
// BTC juga gak punya "token" — 1 address = 1 aset (BTC). Artinya HHI/komposisi
// portofolio nyaris gak relevan buat address BTC murni (catat ini di skripsi).
//   docs: https://github.com/Blockstream/esplora/blob/master/API.md
// ============================================================

const BLOCKSTREAM_BASE = 'https://blockstream.info/api';

const SATS_PER_BTC = 1e8;

// Sentinel "mint" buat BTC native (biar shape holdings konsisten lintas chain).
export const NATIVE_BTC_MINT = 'bitcoin-native';

const client = axios.create({
  baseURL: BLOCKSTREAM_BASE,
  timeout: 15000,
  headers: { accept: 'application/json' },
});

/**
 * Hitung balance BTC (dalam sats) dari objek address Blockstream.
 * Balance = (funded - spent) di chain + delta mempool (tx belum confirm).
 * Di-extract biar gampang di-unit-test.
 */
export function computeBtcSats(addressData) {
  const chain = addressData.chain_stats ?? {};
  const mempool = addressData.mempool_stats ?? {};
  const chainBalance = (chain.funded_txo_sum ?? 0) - (chain.spent_txo_sum ?? 0);
  const mempoolBalance =
    (mempool.funded_txo_sum ?? 0) - (mempool.spent_txo_sum ?? 0);
  return chainBalance + mempoolBalance;
}

/**
 * Fetch balance BTC buat 1 address. Return shape holdings yang konsisten
 * sama service chain lain (1 aset: BTC). Cache per-address.
 *
 * @param {string} address - Bitcoin address (legacy/segwit/bech32)
 * @returns {Promise<{walletAddress, totalAssets, totalValueUsd, holdings: Array}>}
 */
export async function getBitcoinWalletHoldings(address) {
  const cacheKey = `blockstream:holdings:${address}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug(`Cache HIT: ${cacheKey}`);
    return cached;
  }

  let data;
  try {
    logger.debug(`Blockstream GET /address/${address}`);
    const res = await client.get(`/address/${address}`);
    data = res.data;
  } catch (err) {
    const status = err.response?.status;
    // Blockstream balikin 400 buat address yang format-nya invalid
    if (status === 400) {
      throw new ApiError(
        'INVALID_BTC_ADDRESS',
        'Address Bitcoin tidak valid.',
        400
      );
    }
    logger.error(`Blockstream request gagal: ${err.message}`, { status });
    throw new ApiError(
      'BLOCKSTREAM_ERROR',
      'Gagal mengambil data dari Blockstream.',
      502
    );
  }

  const sats = computeBtcSats(data);
  const balance = sats / SATS_PER_BTC;

  const holdings =
    balance > 0
      ? [
          {
            mint: NATIVE_BTC_MINT,
            symbol: 'BTC',
            name: 'Bitcoin',
            balance,
            decimals: 8,
            priceUsd: null, // harga authoritative dari CoinGecko (scan service)
            valueUsd: null,
          },
        ]
      : [];

  const normalized = {
    walletAddress: address,
    totalAssets: holdings.length,
    totalValueUsd: 0,
    holdings,
  };

  cache.set(cacheKey, normalized, env.CACHE_TTL_HOLDINGS);
  return normalized;
}

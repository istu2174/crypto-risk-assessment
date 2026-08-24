import {
  getCoinMarketData,
  getCoinHistoricalPrices,
} from './coingeckoService.js';
import { getSolanaWalletHoldings } from './heliusService.js';
import { getEthereumWalletHoldings } from './alchemyService.js';
import { getBitcoinWalletHoldings, NATIVE_BTC_MINT } from './blockstreamService.js';
import { resolveMints, resolveEthContracts } from './coinResolver.js';
import {
  calculateVolatility,
  calculateHHI,
  interpretHHI,
} from './portfolioAnalyzer.js';
import { classifyAsset, determineRiskLevel } from './riskClassifier.js';
import { mapSettledWithConcurrency } from '../utils/concurrency.js';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

// ============================================================
// PORTFOLIO SCAN — orchestrator
// ============================================================
// Flow:
//   holdings (Helius)
//     → resolve mint→coingeckoId (CoinGecko coin list)
//     → enrich tiap asset (market data + 30d history)
//     → classify per asset (rule-based)
//     → aggregate (HHI, weighted overall risk)
// ============================================================

const HISTORY_DAYS = 30;

/**
 * Enrich + classify 1 asset. Throw ApiError kalau data gak cukup.
 * Dipakai dalam Promise.allSettled, jadi throw di sini = asset masuk
 * unclassified list, scan keseluruhan tetap jalan.
 */
async function enrichAndClassify(asset) {
  // Fetch market + history paralel — cache di coingeckoService bakal ngehemat
  // call kalau scan ulang.
  const [market, history] = await Promise.all([
    getCoinMarketData(asset.coingeckoId),
    getCoinHistoricalPrices(asset.coingeckoId, HISTORY_DAYS),
  ]);

  // Guard: data market kosong = bisa jadi coin baru / delisted
  if (
    market.marketCap == null ||
    market.volume24h == null ||
    market.currentPrice == null ||
    market.marketCap <= 0
  ) {
    throw new ApiError(
      'INCOMPLETE_MARKET_DATA',
      `Data market untuk '${asset.coingeckoId}' tidak lengkap.`,
      422
    );
  }

  // Guard: butuh minimal 2 harga buat volatilitas
  const prices = history.prices.map((p) => p.price);
  if (prices.length < 2) {
    throw new ApiError(
      'INSUFFICIENT_HISTORY',
      `History harga untuk '${asset.coingeckoId}' kurang dari 2 data point.`,
      422
    );
  }

  const volatility = calculateVolatility(prices);
  const liquidityRatio = market.volume24h / market.marketCap;

  // CoinGecko price authoritative (Helius price_info sering null)
  const priceUsd = market.currentPrice;
  const valueUsd = asset.balance * priceUsd;

  const classification = classifyAsset({
    marketCap: market.marketCap,
    volume24h: market.volume24h,
    volatility,
    liquidityRatio,
  });

  return {
    mint: asset.mint,
    coingeckoId: asset.coingeckoId,
    // chainType per-asset cuma dipakai demo mode (portfolio campuran multi-chain);
    // scan asli gak ngeset ini → undefined, dan pakai chainType level-result.
    chainType: asset.chainType,
    symbol: (market.symbol ?? asset.symbol ?? '').toUpperCase(),
    name: market.name,
    image: market.image,
    balance: asset.balance,
    priceUsd,
    valueUsd,
    marketCap: market.marketCap,
    volume24h: market.volume24h,
    volatility,
    liquidityRatio,
    riskScore: classification.riskScore,
    riskLevel: classification.riskLevel,
    breakdown: classification.breakdown,
  };
}

/**
 * Core scan — chain-agnostic. Terima holdings (udah dinormalisasi ke shape
 * internal) + resolveMap (mint→coingeckoId), lakuin split → enrich → classify
 * → aggregate. Dipakai semua chain (Solana/Ethereum/Bitcoin) biar logika inti
 * (rule-based + HHI) cuma ditulis sekali.
 *
 * @param {object} args
 * @param {string} args.walletAddress
 * @param {string} args.chainType  - 'SOLANA' | 'ETHEREUM' | 'BITCOIN'
 * @param {Array}  args.holdings   - dari service chain masing-masing
 * @param {Map}    args.resolveMap - Map<mint, coingeckoId|null>
 */
async function classifyHoldings({ walletAddress, chainType, holdings, resolveMap }) {
  // ====================
  // 3. Split classifiable vs unclassified
  // ====================
  const classifiable = [];
  const unclassified = [];

  for (const h of holdings) {
    const coingeckoId = resolveMap.get(h.mint);
    if (coingeckoId) {
      classifiable.push({ ...h, coingeckoId });
    } else {
      unclassified.push({
        mint: h.mint,
        symbol: h.symbol,
        name: h.name,
        balance: h.balance,
        reason: 'NOT_IN_COINGECKO',
        message: `Token tidak ditemukan di CoinGecko platform ${chainType}.`,
      });
    }
  }

  if (classifiable.length === 0) {
    throw new ApiError(
      'NO_CLASSIFIABLE_ASSETS',
      'Tidak ada aset yang bisa diklasifikasi — semua token gak terdaftar di CoinGecko.',
      422
    );
  }

  // ====================
  // 4. Enrich + classify (Promise.allSettled biar 1 error gak kill scan)
  // ====================
  logger.debug(
    `Scan ${chainType} ${walletAddress}: ${classifiable.length} classifiable, ${unclassified.length} unclassified`
  );

  // Batasi konkurensi biar gak burst & kena rate limit CoinGecko (tiap aset
  // = 2 call). Semantik tetap "allSettled": 1 aset gagal gak ngebunuh scan.
  const settled = await mapSettledWithConcurrency(
    classifiable,
    env.SCAN_CONCURRENCY,
    (a) => enrichAndClassify(a)
  );

  const classified = [];
  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    const asset = classifiable[i];
    if (result.status === 'fulfilled') {
      classified.push(result.value);
    } else {
      const err = result.reason;
      const reason = err?.code ?? 'ENRICHMENT_FAILED';
      const message = err?.message ?? 'Gagal enrich asset.';
      logger.warn(`Asset ${asset.coingeckoId} gagal enrich: ${reason} — ${message}`);
      unclassified.push({
        mint: asset.mint,
        symbol: asset.symbol,
        name: asset.name,
        balance: asset.balance,
        coingeckoId: asset.coingeckoId,
        reason,
        message,
      });
    }
  }

  if (classified.length === 0) {
    throw new ApiError(
      'ALL_ASSETS_FAILED',
      'Semua aset gagal di-enrich (kemungkinan rate limit CoinGecko). Coba lagi.',
      422
    );
  }

  // ====================
  // 5. Aggregate — total value, weights, HHI, overall risk
  // ====================
  const totalValueUsd = classified.reduce((sum, a) => sum + a.valueUsd, 0);

  if (totalValueUsd <= 0) {
    throw new ApiError(
      'ZERO_VALUE_PORTFOLIO',
      'Total nilai portfolio = 0. Tidak bisa hitung weights & HHI.',
      422
    );
  }

  // Attach weight ke tiap classified asset
  for (const a of classified) {
    a.weight = a.valueUsd / totalValueUsd;
  }

  // HHI pakai shape yg di-expect portfolioAnalyzer: { valueUSD }
  const hhi = calculateHHI(
    classified.map((a) => ({ valueUSD: a.valueUsd }))
  );
  const hhiInterpretation = interpretHHI(hhi);

  // Overall risk: weighted average riskScore (weighted by valueUsd)
  const overallRiskScore = classified.reduce(
    (sum, a) => sum + a.weight * a.riskScore,
    0
  );
  const overallRiskLevel = determineRiskLevel(overallRiskScore);

  return {
    walletAddress,
    chainType,
    scannedAt: new Date(),
    summary: {
      totalAssetsOnChain: holdings.length,
      classifiedCount: classified.length,
      unclassifiedCount: unclassified.length,
      totalValueUsd,
      hhi,
      // Kelas HHI: 'Terdiversifikasi' | 'Moderat' | 'Terkonsentrasi'.
      // Sengaja BUKAN Low/Medium/High (itu istilah risiko per aset).
      hhiLabel: hhiInterpretation.label,
      overallRiskScore,                     // float 0..12
      overallRiskLevel,                     // 'Low' | 'Medium' | 'High'
    },
    classifiedAssets: classified,
    unclassifiedAssets: unclassified,
  };
}

// ============================================================
// PER-CHAIN WRAPPERS
// ============================================================
// Tiap wrapper cuma beda di: (1) cara ambil holdings, (2) cara resolve
// mint→coingeckoId. Sisanya (enrich/classify/aggregate) dishare di
// classifyHoldings.

// Guard helper: lempar EMPTY_WALLET kalau gak ada holding sama sekali.
function assertHasHoldings(holdings) {
  if (holdings.length === 0) {
    throw new ApiError(
      'EMPTY_WALLET',
      'Wallet ini gak punya holding apa-apa (balance semua aset = 0).',
      422
    );
  }
}

/**
 * Scan portfolio Solana (Helius DAS → resolve via platforms.solana).
 * @param {string} walletAddress - Solana base58 address
 */
export async function scanSolanaPortfolio(walletAddress) {
  const { holdings } = await getSolanaWalletHoldings(walletAddress);
  assertHasHoldings(holdings);
  const resolveMap = await resolveMints(holdings.map((h) => h.mint));
  return classifyHoldings({
    walletAddress,
    chainType: 'SOLANA',
    holdings,
    resolveMap,
  });
}

/**
 * Scan portfolio Ethereum (Alchemy → resolve via platforms.ethereum).
 * @param {string} walletAddress - Ethereum address (0x...)
 */
export async function scanEthereumPortfolio(walletAddress) {
  const { holdings } = await getEthereumWalletHoldings(walletAddress);
  assertHasHoldings(holdings);
  const resolveMap = await resolveEthContracts(holdings.map((h) => h.mint));
  return classifyHoldings({
    walletAddress,
    chainType: 'ETHEREUM',
    holdings,
    resolveMap,
  });
}

/**
 * Scan "portfolio" Bitcoin (Blockstream → cuma 1 aset: BTC).
 * Resolve trivial: native BTC → coingeckoId 'bitcoin'.
 * @param {string} walletAddress - Bitcoin address
 */
export async function scanBitcoinPortfolio(walletAddress) {
  const { holdings } = await getBitcoinWalletHoldings(walletAddress);
  assertHasHoldings(holdings);
  const resolveMap = new Map([[NATIVE_BTC_MINT, 'bitcoin']]);
  return classifyHoldings({
    walletAddress,
    chainType: 'BITCOIN',
    holdings,
    resolveMap,
  });
}

// ============================================================
// DEMO MODE — seed portfolio buat testing/screenshot skripsi
// ============================================================
// Kenapa demo, bukan testnet?
//   Klasifikasi risiko butuh data CoinGecko (harga/marketcap/volume) yang cuma
//   ada buat coin MAINNET asli. Token testnet gak ada di CoinGecko → gak bisa
//   diklasifikasi. Demo mode pakai coin ASLI (BTC/ETH/SOL/meme/alt) dengan
//   balance di-seed, lalu lewat pipeline klasifikasi yang SAMA → hasil 100%
//   beneran (harga, volatilitas, HHI, risk level dihitung live dari CoinGecko).
//   Yang "palsu" cuma jumlah holding-nya. Cocok buat lampiran BAB 4.
//
// Tiap coin dikasih chainType native yang valid (SOLANA/ETHEREUM/BITCOIN) biar
// kolom chainType di DB tetap akurat. Sengaja gak masukin coin yang chain-nya
// di luar scope (mis. DOGE native) biar gak bohong soal multi-chain.
//
// 3 SKENARIO — didesain supaya tiap kelas HHI bisa dimunculkan buat pengujian:
//   diversified  → bobot merata          → HHI ≈ 0.10 (Terdiversifikasi)
//   moderate     → 2 dominan (BTC/ETH)   → HHI ≈ 0.19 (Moderat)
//   concentrated → 1 dominan (BTC ~70%)  → HHI ≈ 0.50 (Terkonsentrasi)
//
// PENTING: yang di-hardcode adalah TARGET BOBOT (%), bukan amount koin. Amount
// dihitung dinamis saat scan: amount = (bobot × totalUSD) / hargaLiveCoinGecko.
// Karena valueUsd di pipeline pakai harga live yang SAMA (cache hit), bobot
// final = target persis → kelas HHI gak geser walau harga berubah-ubah.
export const DEMO_TOTAL_USD = 10_000; // nilai portofolio nominal tetap (biar UI masuk akal)

// Daftar 10 koin (urutan penting: koin TERAKHIR nyerap sisa pembulatan bobot).
export const DEMO_COINS = [
  { coingeckoId: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', chainType: 'BITCOIN' },
  { coingeckoId: 'ethereum', symbol: 'ETH', name: 'Ethereum', chainType: 'ETHEREUM' },
  { coingeckoId: 'solana', symbol: 'SOL', name: 'Solana', chainType: 'SOLANA' },
  { coingeckoId: 'chainlink', symbol: 'LINK', name: 'Chainlink', chainType: 'ETHEREUM' },
  { coingeckoId: 'uniswap', symbol: 'UNI', name: 'Uniswap', chainType: 'ETHEREUM' },
  { coingeckoId: 'jupiter-exchange-solana', symbol: 'JUP', name: 'Jupiter', chainType: 'SOLANA' },
  { coingeckoId: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', chainType: 'ETHEREUM' },
  { coingeckoId: 'pepe', symbol: 'PEPE', name: 'Pepe', chainType: 'ETHEREUM' },
  { coingeckoId: 'bonk', symbol: 'BONK', name: 'Bonk', chainType: 'SOLANA' },
  { coingeckoId: 'dogwifcoin', symbol: 'WIF', name: 'dogwifhat', chainType: 'SOLANA' },
];

// Target bobot MENTAH per skenario (keyed by coingeckoId). Dinormalisasi ke
// total 1 saat runtime (normalizeWeights) — sengaja dibiarin agak "kotor"
// (mis. concentrated 0.0333 × 9 = 0.2997) buat nunjukin mekanisme koin terakhir
// nyerap sisa pembulatan. Angka dijauhin dari ambang kelas (0.15 / 0.25).
export const DEMO_SCENARIOS = {
  // Merata ~10% → HHI = 10 × 0.10² = 0.10
  diversified: {
    bitcoin: 0.1, ethereum: 0.1, solana: 0.1, chainlink: 0.1, uniswap: 0.1,
    'jupiter-exchange-solana': 0.1, 'shiba-inu': 0.1, pepe: 0.1, bonk: 0.1, dogwifcoin: 0.1,
  },
  // BTC 33% + ETH 25% + 8 sisa @5.25% → HHI ≈ 0.193
  moderate: {
    bitcoin: 0.33, ethereum: 0.25, solana: 0.0525, chainlink: 0.0525, uniswap: 0.0525,
    'jupiter-exchange-solana': 0.0525, 'shiba-inu': 0.0525, pepe: 0.0525, bonk: 0.0525, dogwifcoin: 0.0525,
  },
  // BTC 70% + 9 sisa @~3.33% → HHI ≈ 0.50
  concentrated: {
    bitcoin: 0.7, ethereum: 0.0333, solana: 0.0333, chainlink: 0.0333, uniswap: 0.0333,
    'jupiter-exchange-solana': 0.0333, 'shiba-inu': 0.0333, pepe: 0.0333, bonk: 0.0333, dogwifcoin: 0.0333,
  },
};

// Label address penanda skenario (dipakai buat kolom scannedAddress → tampil di
// riwayat scan). Default demo = concentrated (backward-compatible).
const DEMO_SCENARIO_ADDRESS = {
  diversified: 'DEMO-DIVERSIFIED',
  moderate: 'DEMO-MODERATE',
  concentrated: 'DEMO-CONCENTRATED',
};

/**
 * Normalisasi bobot supaya totalnya PAS 1. Koin terakhir di `coins` nyerap sisa
 * pembulatan (mis. concentrated: 0.70 + 8×0.0333 = 0.9664 → WIF jadi 0.0336).
 * @returns {Object<string, number>} map coingeckoId → bobot ternormalisasi
 */
export function normalizeWeights(coins, rawWeights) {
  const out = {};
  let acc = 0;
  for (let i = 0; i < coins.length - 1; i++) {
    const id = coins[i].coingeckoId;
    out[id] = rawWeights[id];
    acc += rawWeights[id];
  }
  const lastId = coins[coins.length - 1].coingeckoId;
  out[lastId] = 1 - acc; // sisa buat koin terakhir → total dijamin = 1
  return out;
}

/**
 * Konversi target bobot → amount koin, berdasarkan harga per koin.
 * Fungsi MURNI (tanpa I/O) supaya gampang di-unit-test pakai harga mock.
 *   amount_i = (bobot_i × totalUsd) / harga_i
 * @param {object} args
 * @param {Array}  args.coins    - DEMO_COINS
 * @param {Object} args.weights  - map coingeckoId → bobot (harus sum = 1)
 * @param {Object} args.prices   - map coingeckoId → harga USD (> 0)
 * @param {number} args.totalUsd - total nilai portofolio nominal
 * @returns {Array} holdings shape internal (mint = coingeckoId, ada balance)
 */
export function computeDemoBalances({ coins, weights, prices, totalUsd }) {
  return coins.map((c) => {
    const weight = weights[c.coingeckoId];
    const price = prices[c.coingeckoId];
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      throw new ApiError(
        'INVALID_DEMO_PRICE',
        `Harga demo untuk '${c.coingeckoId}' tidak valid.`,
        502
      );
    }
    return {
      ...c,
      mint: c.coingeckoId, // resolveMap identity (mint = coingeckoId)
      balance: (weight * totalUsd) / price,
    };
  });
}

/**
 * Scan demo — portfolio seed per skenario. Ambil harga live tiap koin dulu,
 * konversi target bobot → amount, lalu lewat classifyHoldings yang SAMA (enrich
 * + classify + HHI beneran dari CoinGecko). Cache market data bikin fetch harga
 * di sini gratis pas enrich (cache hit).
 * @param {'diversified'|'moderate'|'concentrated'} [scenario] - default 'concentrated'
 */
export async function scanDemoPortfolio(scenario = 'concentrated') {
  const rawWeights = DEMO_SCENARIOS[scenario];
  if (!rawWeights) {
    throw new ApiError(
      'INVALID_DEMO_SCENARIO',
      `Skenario demo '${scenario}' tidak dikenal.`,
      400
    );
  }

  const weights = normalizeWeights(DEMO_COINS, rawWeights);

  // Ambil harga tiap koin (buat konversi bobot → amount). Paralel; nanti pas
  // enrich di classifyHoldings bakal cache hit jadi gak double call.
  const prices = {};
  await Promise.all(
    DEMO_COINS.map(async (c) => {
      const market = await getCoinMarketData(c.coingeckoId);
      prices[c.coingeckoId] = market.currentPrice;
    })
  );

  const holdings = computeDemoBalances({
    coins: DEMO_COINS,
    weights,
    prices,
    totalUsd: DEMO_TOTAL_USD,
  });
  const resolveMap = new Map(holdings.map((h) => [h.mint, h.coingeckoId]));

  return classifyHoldings({
    walletAddress: DEMO_SCENARIO_ADDRESS[scenario],
    chainType: 'DEMO',
    holdings,
    resolveMap,
  });
}

// Dispatcher: route by chainType. Dipakai controller biar gak perlu if-else
// di layer HTTP.
const SCANNERS = {
  SOLANA: scanSolanaPortfolio,
  ETHEREUM: scanEthereumPortfolio,
  BITCOIN: scanBitcoinPortfolio,
};

/**
 * Entry point scan multi-chain. Lempar ApiError kalau chainType gak didukung.
 * @param {string} chainType - 'SOLANA' | 'ETHEREUM' | 'BITCOIN'
 * @param {string} walletAddress
 */
export async function scanPortfolio(chainType, walletAddress) {
  const scanner = SCANNERS[chainType];
  if (!scanner) {
    throw new ApiError(
      'CHAIN_NOT_SUPPORTED',
      `Scan untuk chain ${chainType} tidak didukung.`,
      400
    );
  }
  return scanner(walletAddress);
}

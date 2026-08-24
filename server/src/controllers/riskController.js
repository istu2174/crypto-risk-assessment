import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import {
  getCoinMarketData,
  getCoinHistoricalPrices,
} from '../services/coingeckoService.js';
import { calculateVolatility } from '../services/portfolioAnalyzer.js';
import { classifyAsset } from '../services/riskClassifier.js';
import ApiError from '../utils/ApiError.js';

const coinIdParam = z.object({
  coinId: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'coinId hanya boleh huruf kecil, angka, dan tanda strip'),
});

const riskQuery = z.object({
  days: z.coerce.number().int().min(2).max(365).default(30),
});

// GET /api/risk/asset/:coinId?days=30
// Wire semua: market data + historical → hitung volatilitas & rasio likuiditas → classify.
export const getAssetRisk = asyncHandler(async (req, res) => {
  const { coinId } = coinIdParam.parse(req.params);
  const { days } = riskQuery.parse(req.query);

  // Fetch market + history paralel (kalau dua-duanya cache hit, ~instan)
  const [market, history] = await Promise.all([
    getCoinMarketData(coinId),
    getCoinHistoricalPrices(coinId, days),
  ]);

  // Guard: market cap / volume bisa null kalau coin baru list, return error eksplisit
  if (
    market.marketCap == null ||
    market.volume24h == null ||
    market.marketCap <= 0
  ) {
    throw new ApiError(
      'INCOMPLETE_MARKET_DATA',
      `Data market untuk '${coinId}' tidak lengkap (marketCap atau volume24h kosong). Kemungkinan coin terlalu baru atau delisted.`,
      422,
    );
  }

  // Hitung volatility dari array harga (urutan kronologis sudah benar dari CoinGecko)
  const priceSeries = history.prices.map((p) => p.price);
  const volatility = calculateVolatility(priceSeries);

  // Rasio likuiditas: volume24h / marketCap
  const liquidityRatio = market.volume24h / market.marketCap;

  // Klasifikasi
  const classification = classifyAsset({
    marketCap: market.marketCap,
    volume24h: market.volume24h,
    volatility,
    liquidityRatio,
  });

  res.json({
    success: true,
    data: {
      asset: {
        id: market.id,
        symbol: market.symbol,
        name: market.name,
        image: market.image,
        marketCapRank: market.marketCapRank,
        currentPrice: market.currentPrice,
      },
      metrics: {
        marketCap: market.marketCap,
        volume24h: market.volume24h,
        volatility,        // desimal, 0.05 = 5%
        liquidityRatio,    // desimal
        priceChange24h: market.priceChange24h,
        priceChange7d: market.priceChange7d,
        priceChange30d: market.priceChange30d,
      },
      classification, // { riskLevel, riskScore, breakdown }
      meta: {
        historyDays: days,
        historyDataPoints: priceSeries.length,
      },
    },
  });
});

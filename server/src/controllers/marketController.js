import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import {
  getCoinMarketData,
  getCoinHistoricalPrices,
  searchCoin,
} from '../services/coingeckoService.js';

// === Validasi input pakai zod ===
// CoinGecko coin id: lowercase, alfanumerik + dash (contoh: 'bitcoin', 'ethereum', 'wrapped-bitcoin')
const coinIdParam = z.object({
  coinId: z
    .string()
    .min(1, 'coinId tidak boleh kosong')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'coinId hanya boleh huruf kecil, angka, dan tanda strip'),
});

// days: coerce dari string query → number; default 30, range 1-365
const historyQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

const searchQuery = z.object({
  q: z.string().min(1, 'Query pencarian tidak boleh kosong').max(100),
});

// GET /api/market/coin/:coinId
export const getMarketData = asyncHandler(async (req, res) => {
  const { coinId } = coinIdParam.parse(req.params);
  const data = await getCoinMarketData(coinId);
  res.json({ success: true, data });
});

// GET /api/market/coin/:coinId/history?days=30
export const getHistoricalPrices = asyncHandler(async (req, res) => {
  const { coinId } = coinIdParam.parse(req.params);
  const { days } = historyQuery.parse(req.query);
  const data = await getCoinHistoricalPrices(coinId, days);
  res.json({ success: true, data });
});

// GET /api/market/search?q=bitcoin
export const search = asyncHandler(async (req, res) => {
  const { q } = searchQuery.parse(req.query);
  const data = await searchCoin(q);
  res.json({ success: true, data });
});

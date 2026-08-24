import { Router } from 'express';
import {
  getMarketData,
  getHistoricalPrices,
  search,
} from '../controllers/marketController.js';

const router = Router();

// IMPORTANT: route /search harus di-define SEBELUM /coin/:coinId
// supaya gak ke-match sama param :coinId. Tapi karena prefix beda
// (/search vs /coin/...), urutannya bebas. Tetep gw kasih komentar
// biar pas nambah endpoint baru, lo ingetin.
router.get('/search', search);
router.get('/coin/:coinId', getMarketData);
router.get('/coin/:coinId/history', getHistoricalPrices);

export default router;

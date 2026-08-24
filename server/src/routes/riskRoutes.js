import { Router } from 'express';
import { getAssetRisk } from '../controllers/riskController.js';

const router = Router();

// GET /api/risk/asset/:coinId — klasifikasi risiko single asset
router.get('/asset/:coinId', getAssetRisk);

export default router;

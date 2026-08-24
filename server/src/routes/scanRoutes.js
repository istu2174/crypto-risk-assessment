import { Router } from 'express';
import {
  triggerScan,
  triggerDemoScan,
  listScans,
  getScanDetail,
} from '../controllers/scanController.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

// Semua route butuh JWT
router.use(requireAuth);

// POST /api/scan/demo — scan portfolio demo (seed coin asli). Taruh sebelum
// route param biar gak ke-tangkep '/:chainType/:address'.
router.post('/demo', triggerDemoScan);

// POST /api/scan/:chainType/:address — chainType: solana|ethereum|bitcoin
router.post('/:chainType/:address', triggerScan);
router.get('/', listScans);
router.get('/:scanId', getScanDetail);

export default router;

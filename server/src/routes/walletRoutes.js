import { Router } from 'express';
import {
  getWalletHoldings,
  addTrackedWallet,
  listTrackedWallets,
  deleteTrackedWallet,
} from '../controllers/walletController.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

// Semua route di sini butuh JWT
router.use(requireAuth);

// Tracked wallet CRUD
router.get('/tracked', listTrackedWallets);
router.post('/tracked', addTrackedWallet);
router.delete('/tracked/:id', deleteTrackedWallet);

// Holdings multi-chain — taruh setelah /tracked biar gak ke-shadow.
// chainType: solana|ethereum|bitcoin
router.get('/:chainType/:address/holdings', getWalletHoldings);

export default router;

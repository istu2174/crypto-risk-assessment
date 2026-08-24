import { Router } from 'express';
import { requestNonce, verifyAndLogin, me } from '../controllers/authController.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

// Public — buat login flow
router.post('/nonce', requestNonce);
router.post('/verify', verifyAndLogin);

// Protected — butuh JWT
router.get('/me', requireAuth, me);

export default router;

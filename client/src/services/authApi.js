import apiClient from './apiClient.js';

/**
 * Auth API — wrapper buat endpoint /api/auth/*
 */

export async function requestNonce(walletAddress, chainType = 'SOLANA') {
  // POST /auth/nonce → { nonce, message }
  return apiClient.post('/auth/nonce', { walletAddress, chainType });
}

export async function verifyAndLogin({ walletAddress, signature, nonce, chainType = 'SOLANA' }) {
  // POST /auth/verify → { token, user }
  return apiClient.post('/auth/verify', { walletAddress, signature, nonce, chainType });
}

export async function getMe() {
  // GET /auth/me → { user }
  return apiClient.get('/auth/me');
}

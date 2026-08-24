import apiClient from './apiClient.js';

/**
 * Tracked Wallet API — wrapper buat endpoint /api/wallet/tracked
 * Wallet tambahan (selain wallet login) yang user mau dipantau.
 */

export async function listTrackedWallets() {
  // GET /wallet/tracked
  // Return: { wallets: [{ id, address, chainType, label, addedAt }] }
  return apiClient.get('/wallet/tracked');
}

export async function addTrackedWallet({ address, label, chainType = 'SOLANA' }) {
  // POST /wallet/tracked
  // Return: { id, address, chainType, label, addedAt }
  return apiClient.post('/wallet/tracked', { address, label, chainType });
}

export async function deleteTrackedWallet(id) {
  // DELETE /wallet/tracked/:id
  // Return: { id }
  return apiClient.delete(`/wallet/tracked/${id}`);
}

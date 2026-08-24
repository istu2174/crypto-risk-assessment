import apiClient from './apiClient.js';

/**
 * Scan API — wrapper buat endpoint /api/scan/*
 */

export async function triggerScan(chainType, walletAddress) {
  // POST /scan/:chainType/:address  (chainType: solana|ethereum|bitcoin)
  // Return: { scanId, walletAddress, chainType, scannedAt, summary, classifiedAssets, unclassifiedAssets }
  return apiClient.post(`/scan/${chainType.toLowerCase()}/${walletAddress}`);
}

export async function triggerDemoScan(scenario = 'concentrated') {
  // POST /scan/demo — portfolio demo (coin asli, balance seed dinamis). Buat
  // testing tanpa wallet asli. scenario: 'diversified'|'moderate'|'concentrated'
  // → nentuin komposisi supaya kelas HHI yang muncul beda-beda.
  // Return shape sama kayak triggerScan.
  return apiClient.post('/scan/demo', { scenario });
}

export async function listScans({ limit = 10, offset = 0 } = {}) {
  // GET /scan?limit=&offset=
  // Return: { scans: [...], pagination: { limit, offset, total } }
  return apiClient.get('/scan', { params: { limit, offset } });
}

export async function getScanDetail(scanId) {
  // GET /scan/:scanId
  // Return: flat scan object dengan assetSnapshots[]
  return apiClient.get(`/scan/${scanId}`);
}

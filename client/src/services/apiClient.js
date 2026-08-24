import axios from 'axios';

/**
 * Axios instance buat call backend.
 *
 * - baseURL SELALU dari env VITE_API_URL (di-inject waktu build sama Vite)
 * - Request interceptor: auto inject JWT dari localStorage kalau ada
 * - Response interceptor: normalize error supaya component cukup catch 1 shape
 */

// Trailing slash dibuang biar gak kejadian URL dobel slash ('.../api//scan').
const API_URL = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');

// Fallback localhost cuma buat development, supaya `npm run dev` tetap jalan
// walau client/.env belum dibikin. Di build production fallback ini BAHAYA
// (build sukses tapi app nembak localhost user), makanya di-log keras.
if (!API_URL && import.meta.env.PROD) {
  console.error(
    '[config] VITE_API_URL belum di-set waktu build. Set dulu di Environment Variables Vercel, terus redeploy.'
  );
}

const apiClient = axios.create({
  baseURL: API_URL || 'http://localhost:5000/api',
  timeout: 30000, // scan bisa 5-10 detik, kasih buffer
  headers: { 'Content-Type': 'application/json' },
});

// === Request interceptor — inject Bearer token ===
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('cryptoRisk_jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// === Response interceptor — normalize error shape ===
apiClient.interceptors.response.use(
  (response) => response.data, // backend selalu balikin { success, data }, kita unwrap
  (error) => {
    // Backend error format: { success: false, error: { code, message } }
    const backendError = error.response?.data?.error;

    const normalized = {
      code: backendError?.code || 'NETWORK_ERROR',
      message: backendError?.message || error.message || 'Terjadi kesalahan.',
      status: error.response?.status,
    };

    // Auto-logout kalau token kedaluwarsa / invalid
    if (normalized.code === 'TOKEN_EXPIRED' || normalized.code === 'INVALID_TOKEN') {
      localStorage.removeItem('cryptoRisk_jwt');
      localStorage.removeItem('cryptoRisk_user');
      // Kasih event biar AuthContext bisa react
      window.dispatchEvent(new Event('cryptoRisk:logout'));
    }

    return Promise.reject(normalized);
  }
);

export default apiClient;

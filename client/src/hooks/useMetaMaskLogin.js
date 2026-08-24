import { useCallback, useState } from 'react';
import { requestNonce, verifyAndLogin } from '../services/authApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getMetaMaskProvider } from '../utils/ethProvider.js';

/**
 * useMetaMaskLogin — login flow Ethereum via MetaMask (EIP-1193 langsung,
 * tanpa SDK biar gak bentrok React 19 & gak narik react-native).
 *
 * Flow (mirror useLogin Solana, beda di mekanisme sign):
 *   1. eth_requestAccounts → buka popup MetaMask, ambil address
 *   2. POST /auth/nonce { walletAddress, chainType: ETHEREUM } → nonce + message
 *   3. personal_sign(message, address) → signature hex (EIP-191)
 *   4. POST /auth/verify → JWT + user
 *   5. Simpan via AuthContext.login()
 *
 * Catatan: message di-sign sebagai UTF-8 string (plain), sesuai cara backend
 * recover (recoverPersonalSignature anggap string non-hex sebagai UTF-8).
 *
 * Return: { login, isLoading, error }
 */
export default function useMetaMaskLogin() {
  const { login: persistAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async () => {
    setError(null);

    // Pilih provider MetaMask spesifik via EIP-6963 (hindari ke-hijack Phantom).
    const eth = await getMetaMaskProvider();
    if (!eth) {
      setError({
        code: 'METAMASK_NOT_FOUND',
        message: 'MetaMask gak kedetect. Install extension-nya dulu.',
      });
      return false;
    }

    setIsLoading(true);
    try {
      // === 1. Minta akun (buka popup MetaMask) ===
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      const walletAddress = accounts?.[0];
      if (!walletAddress) {
        setError({ code: 'NO_ACCOUNT', message: 'Gak ada akun MetaMask kepilih.' });
        return false;
      }

      // === 2. Request nonce ===
      const nonceRes = await requestNonce(walletAddress, 'ETHEREUM');
      const { nonce, message } = nonceRes.data;

      // === 3. personal_sign (message plain UTF-8, address sebagai param ke-2) ===
      const signature = await eth.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      });

      // === 4. Verify & dapet JWT ===
      const verifyRes = await verifyAndLogin({
        walletAddress,
        signature,
        nonce,
        chainType: 'ETHEREUM',
      });
      const { token, user } = verifyRes.data;

      // === 5. Persist ===
      persistAuth(token, { ...user, walletAddress: user.primaryWallet });
      return true;
    } catch (err) {
      // MetaMask pakai numeric code (4001 = user reject). API kita pakai string code.
      if (err?.code === 4001 || /reject|denied/i.test(err?.message || '')) {
        setError({ code: 'SIGN_REJECTED', message: 'Lo nolak connect/sign request.' });
      } else if (typeof err?.code === 'string') {
        setError(err); // error dari API client (udah normalized)
      } else {
        setError({ code: 'UNKNOWN', message: err?.message || 'Gagal login MetaMask.' });
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [persistAuth]);

  return { login, isLoading, error };
}

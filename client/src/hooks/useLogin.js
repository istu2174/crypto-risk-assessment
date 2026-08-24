import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { requestNonce, verifyAndLogin } from '../services/authApi.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * useLogin — orchestrate login flow Solana:
 *   1. Pastikan wallet udah connected (publicKey ada)
 *   2. POST /auth/nonce { walletAddress } → dapet nonce + message
 *   3. Sign message via Phantom (wallet.signMessage)
 *   4. Encode signature ke base58
 *   5. POST /auth/verify { walletAddress, signature, nonce } → dapet JWT + user
 *   6. Simpan JWT via AuthContext.login()
 *
 * Return: { login, isLoading, error }
 */
export default function useLogin() {
  const { publicKey, signMessage, connected } = useWallet();
  const { login: persistAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async () => {
    setError(null);

    if (!connected || !publicKey) {
      setError({ code: 'WALLET_NOT_CONNECTED', message: 'Connect Phantom wallet dulu.' });
      return false;
    }

    if (!signMessage) {
      // Beberapa wallet adapter gak support signMessage (jarang, tapi defensive)
      setError({ code: 'WALLET_NO_SIGN', message: 'Wallet ini gak support sign message.' });
      return false;
    }

    setIsLoading(true);
    try {
      const walletAddress = publicKey.toBase58();

      // === 1. Request nonce ===
      const nonceRes = await requestNonce(walletAddress, 'SOLANA');
      const { nonce, message } = nonceRes.data;

      // === 2. Sign message ===
      // Phantom signMessage expect Uint8Array
      const encodedMessage = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(encodedMessage);

      // === 3. Encode signature ke base58 (format yang backend verify) ===
      const signature = bs58.encode(signatureBytes);

      // === 4. Verify & dapet JWT ===
      const verifyRes = await verifyAndLogin({
        walletAddress,
        signature,
        nonce,
        chainType: 'SOLANA',
      });
      const { token, user } = verifyRes.data;

      // === 5. Persist ke AuthContext + localStorage ===
      // Normalize: backend balikin `primaryWallet`, kita alias jadi `walletAddress`
      // biar konsisten sama JWT payload & rest of UI.
      persistAuth(token, { ...user, walletAddress: user.primaryWallet });

      return true;
    } catch (err) {
      // err bisa dari API client (sudah normalized) atau dari signMessage (Phantom)
      if (err?.code) {
        setError(err);
      } else if (err?.message?.includes('User rejected')) {
        setError({ code: 'SIGN_REJECTED', message: 'Lo nolak sign request.' });
      } else {
        setError({ code: 'UNKNOWN', message: err?.message || 'Gagal login.' });
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [connected, publicKey, signMessage, persistAuth]);

  return { login, isLoading, error };
}

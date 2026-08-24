import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useWallet } from '@solana/wallet-adapter-react';
import ConnectButton from '../features/wallet/ConnectButton.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import Spinner from '../components/Spinner.jsx';
import StaggerWords from '../components/motion/StaggerWords.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useLogin from '../hooks/useLogin.js';
import useMetaMaskLogin from '../hooks/useMetaMaskLogin.js';

/**
 * LoginPage — gerbang masuk app (tema terang ala Apple). Dua jalur:
 *   - Solana (Phantom): wallet-adapter → sign → verify
 *   - Ethereum (MetaMask): window.ethereum (EIP-6963) → personal_sign → verify
 *
 * Sukses → AuthContext authenticated → redirect /dashboard.
 * Warna tombol ngikutin brand wallet: Phantom ungu, MetaMask oranye.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { connected, publicKey } = useWallet();
  const { isAuthenticated } = useAuth();
  const { login, isLoading, error } = useLogin();
  const {
    login: loginMetaMask,
    isLoading: mmLoading,
    error: mmError,
  } = useMetaMaskLogin();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSignIn = async () => {
    const ok = await login();
    if (ok) navigate('/dashboard', { replace: true });
  };

  const handleSignInMetaMask = async () => {
    const ok = await loginMetaMask();
    if (ok) navigate('/dashboard', { replace: true });
  };

  return (
    <div className="relative overflow-hidden">
      {/* Latar: dot grid + aurora (sama kayak hero halaman publik lain) */}
      <div aria-hidden className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-dots" />
        <div className="animate-aurora-1 absolute -top-20 left-1/2 h-[360px] w-[360px] -translate-x-[95%] rounded-full bg-[#ab9ff2]/20 blur-3xl" />
        <div className="animate-aurora-2 absolute top-24 left-1/2 h-[320px] w-[320px] translate-x-[30%] rounded-full bg-[#f6851b]/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center px-4 py-24 sm:py-28">
        <div className="w-full text-center">
          <h1 className="text-4xl font-semibold tracking-[-0.02em] text-[#1d1d1f]">
            <StaggerWords text="Masuk ke" delay={0.05} />{' '}
            <StaggerWords
              text="CryptoRisk"
              delay={0.25}
              wordClassName="bg-gradient-to-r from-[#06c] to-[#5ac8fa] bg-clip-text text-transparent"
            />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 text-lg text-zinc-500"
          >
            Hubungkan wallet untuk mulai menilai risiko portofolio.
          </motion.p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 36, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 w-full space-y-4 rounded-[28px] border border-black/5 bg-white/90 p-7 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.25)] backdrop-blur-xl"
        >
          {/* Jalur 1: Solana (Phantom) */}
          <ConnectButton />

          {connected && publicKey && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSignIn}
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#5345a5] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#5345a5]/25 transition-colors hover:bg-[#6554c0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading && <Spinner size="sm" className="text-white" />}
              {isLoading ? 'Verifying signature...' : 'Sign In with Solana'}
            </motion.button>
          )}

          {error && <ErrorAlert error={error} />}

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-black/[0.08]" />
            <span className="text-xs text-zinc-400">atau</span>
            <span className="h-px flex-1 bg-black/[0.08]" />
          </div>

          {/* Jalur 2: Ethereum (MetaMask) */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSignInMetaMask}
            disabled={mmLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f6851b] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#f6851b]/25 transition-colors hover:bg-[#e2761b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mmLoading && <Spinner size="sm" className="text-white" />}
            {mmLoading ? 'Verifying signature...' : 'Sign In with MetaMask'}
          </motion.button>

          {mmError && <ErrorAlert error={mmError} />}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-6 text-center text-xs text-zinc-400"
        >
          Login pakai Phantom (Solana) atau MetaMask (Ethereum). Tiap wallet =
          akun terpisah.
        </motion.p>
      </div>
    </div>
  );
}

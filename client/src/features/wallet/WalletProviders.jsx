import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';

// CSS bawaan modal wallet-adapter (tombol "Connect Wallet" + modal pilih wallet)
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * WalletProviders — bungkus aplikasi sama 3 provider Solana:
 *   1. ConnectionProvider  → endpoint RPC (cluster mainnet/devnet)
 *   2. WalletProvider      → daftar wallet yang didukung
 *   3. WalletModalProvider → UI modal pilih wallet
 *
 * Untuk Solana saat ini didukung Phantom (wallet paling populer di Solana).
 */
export default function WalletProviders({ children }) {
  // Network dibaca dari env (mainnet-beta default)
  const network = import.meta.env.VITE_SOLANA_NETWORK || 'mainnet-beta';

  // RPC endpoint — clusterApiUrl kasih URL Solana official.
  // Untuk produksi sebenernya bisa pakai Helius RPC, tapi buat connect wallet
  // ini doang public RPC udah cukup (kita gak ambil saldo dari sini).
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Adapter list — di-memoize biar gak re-instantiate tiap render
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

import { motion } from 'motion/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { shortenAddress } from '../../utils/formatters.js';

/**
 * ConnectButton — pakai useWallet + useWalletModal, gak pakai <WalletMultiButton>
 * dari adapter-react-ui supaya styling-nya konsisten sama Tailwind kita.
 */
export default function ConnectButton({ onDisconnect }) {
  const { connected, publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  const handleClick = () => {
    if (connected) {
      disconnect();
      onDisconnect?.();
    } else {
      setVisible(true);
    }
  };

  const label = connecting
    ? 'Connecting...'
    : connected && publicKey
      ? `${shortenAddress(publicKey.toBase58())} · Disconnect`
      : 'Connect Phantom';

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      disabled={connecting}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#ab9ff2] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ab9ff2]/25 transition-colors hover:bg-[#9d8df0] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </motion.button>
  );
}

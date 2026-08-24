import { useState } from 'react';
import Spinner from '../../components/Spinner.jsx';
import { CHAINS, TRACKABLE_CHAINS, isValidAddress } from '../../utils/chains.js';

/**
 * AddWalletForm — form tambah tracked wallet (multi-chain).
 *
 * Props:
 *   onAdd({ address, label, chainType }) → Promise<boolean>  (true kalau sukses)
 *   submitting : boolean (disable tombol saat request jalan)
 *
 * Validasi format di client cuma buat UX; backend tetap validasi ulang.
 */
export default function AddWalletForm({ onAdd, submitting }) {
  const [chainType, setChainType] = useState('SOLANA');
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const addr = address.trim();

    if (!isValidAddress(chainType, addr)) {
      setLocalError(`Address ${CHAINS[chainType].label} gak valid.`);
      return;
    }
    setLocalError('');

    const ok = await onAdd({
      address: addr,
      label: label.trim() || undefined,
      chainType,
    });
    if (ok) {
      setAddress('');
      setLabel('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <select
        value={chainType}
        onChange={(e) => {
          setChainType(e.target.value);
          setLocalError('');
        }}
        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#06c] focus:ring-1 focus:ring-[#06c]"
      >
        {TRACKABLE_CHAINS.map((c) => (
          <option key={c} value={c}>
            {CHAINS[c].label}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder={CHAINS[chainType].placeholder}
        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 font-mono text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-[#06c] focus:ring-1 focus:ring-[#06c]"
      />
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (opsional, mis. Wallet trading)"
        maxLength={50}
        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-[#06c] focus:ring-1 focus:ring-[#06c]"
      />
      {localError && <p className="text-xs text-rose-600">{localError}</p>}
      <button
        type="submit"
        disabled={submitting || !address.trim()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#06c] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting && <Spinner size="sm" className="text-white" />}
        Tambah Wallet
      </button>
    </form>
  );
}

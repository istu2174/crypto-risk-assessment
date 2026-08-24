import { useState } from 'react';
import useTrackedWallets from '../../hooks/useTrackedWallets.js';
import { useToast } from '../../context/ToastContext.jsx';
import { shortenAddress } from '../../utils/formatters.js';
import { chainLabel } from '../../utils/chains.js';
import AddWalletForm from './AddWalletForm.jsx';
import Spinner from '../../components/Spinner.jsx';

/**
 * WalletRow — satu baris wallet yang bisa diklik buat dipilih jadi target scan.
 * Module-level biar gak dibuat ulang tiap render (react-hooks/static-components).
 *
 * Props:
 *   address, label, badge   : data tampilan
 *   chain                   : label chain (Solana/Ethereum/Bitcoin)
 *   active                  : sedang dipilih?
 *   submitting              : disable tombol saat request jalan
 *   confirming              : lagi minta konfirmasi hapus?
 *   onSelect()              : klik baris
 *   onRequestDelete(), onConfirmDelete(), onCancelDelete() : alur hapus dgn konfirmasi
 *   (kalau ketiganya gak dikasih → baris ini gak bisa dihapus, mis. primary wallet)
 */
function WalletRow({
  address,
  label,
  badge,
  chain,
  active,
  submitting,
  confirming,
  onSelect,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}) {
  const deletable = Boolean(onRequestDelete);
  const stop = (fn) => (e) => {
    e.stopPropagation(); // jangan trigger select pas klik tombol hapus
    fn();
  };

  return (
    <div
      className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3.5 py-2.5 transition-all duration-200 ${
        active
          ? 'border-[#06c]/40 bg-[#06c]/[0.06] shadow-[0_8px_20px_-12px_rgba(0,102,204,0.4)]'
          : 'border-black/[0.07] hover:border-black/15 hover:bg-[#f5f5f7]'
      }`}
      onClick={onSelect}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-[#1d1d1f]">
            {label || shortenAddress(address, 6)}
          </span>
          {chain && (
            <span className="shrink-0 rounded-full bg-[#f5f5f7] px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
              {chain}
            </span>
          )}
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-400">
            {badge}
          </span>
        </div>
        {label && (
          <span className="font-mono text-xs text-zinc-500">
            {shortenAddress(address, 6)}
          </span>
        )}
      </div>

      {active && (
        <span className="shrink-0 text-xs font-semibold text-[#06c]">aktif</span>
      )}

      {/* Alur hapus: tombol × → konfirmasi inline (Hapus / Batal) */}
      {deletable && !confirming && (
        <button
          onClick={stop(onRequestDelete)}
          disabled={submitting}
          title="Hapus dari daftar pantau"
          className="shrink-0 text-lg leading-none text-zinc-400 transition-colors hover:text-rose-600 disabled:opacity-40"
        >
          &times;
        </button>
      )}
      {deletable && confirming && (
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={stop(onConfirmDelete)}
            disabled={submitting}
            className="text-xs font-semibold text-rose-600 transition-colors hover:text-rose-700 disabled:opacity-40"
          >
            Hapus
          </button>
          <button
            onClick={stop(onCancelDelete)}
            className="text-xs text-zinc-400 transition-colors hover:text-zinc-600"
          >
            Batal
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * WalletManager — panel kelola + pilih wallet yang mau di-scan.
 *
 * Props:
 *   primaryWallet  : address wallet login (selalu ada, gak bisa dihapus)
 *   primaryChain   : chainType wallet login (SOLANA/ETHEREUM)
 *   selectedAddress: address yang lagi dipilih buat di-scan
 *   onSelect({ address, chainType }) : dipanggil saat user klik salah satu wallet
 */
export default function WalletManager({
  primaryWallet,
  primaryChain = 'SOLANA',
  selectedAddress,
  onSelect,
}) {
  const { wallets, loading, submitting, error, add, remove } = useTrackedWallets();
  const toast = useToast();
  // ID wallet yang lagi nunggu konfirmasi hapus (null = gak ada)
  const [confirmingId, setConfirmingId] = useState(null);

  // Wrapper add — toast hasilnya, return ok ke form (buat clear field)
  const handleAdd = async ({ address, label, chainType }) => {
    const res = await add({ address, label, chainType });
    if (res.ok) toast('Wallet ditambah ke daftar pantau.', 'success');
    else toast(res.error?.message || 'Gagal menambah wallet.', 'error');
    return res.ok;
  };

  // Wrapper remove — toast hasilnya + reset state konfirmasi
  const handleRemove = async (id) => {
    const res = await remove(id);
    setConfirmingId(null);
    if (res.ok) toast('Wallet dihapus dari daftar pantau.', 'success');
    else toast(res.error?.message || 'Gagal menghapus wallet.', 'error');
  };

  return (
    <div className="space-y-3 rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-[#1d1d1f]">Wallet Saya</h3>

      <div className="space-y-2">
        {/* Primary wallet — selalu di atas, gak bisa dihapus */}
        <WalletRow
          address={primaryWallet}
          badge="Primary"
          chain={chainLabel(primaryChain)}
          active={primaryWallet === selectedAddress}
          onSelect={() => onSelect({ address: primaryWallet, chainType: primaryChain })}
        />

        {/* Tracked wallets */}
        {loading && (
          <div className="flex justify-center py-3">
            <Spinner size="sm" />
          </div>
        )}
        {!loading &&
          wallets.map((w) => (
            <WalletRow
              key={w.id}
              address={w.address}
              label={w.label}
              badge="Tracked"
              chain={chainLabel(w.chainType)}
              active={w.address === selectedAddress}
              submitting={submitting}
              confirming={confirmingId === w.id}
              onSelect={() => onSelect({ address: w.address, chainType: w.chainType })}
              onRequestDelete={() => setConfirmingId(w.id)}
              onConfirmDelete={() => handleRemove(w.id)}
              onCancelDelete={() => setConfirmingId(null)}
            />
          ))}
      </div>

      {/* Error saat load list (add/remove pakai toast) */}
      {error && <p className="text-xs text-rose-600">{error.message}</p>}

      <div className="border-t border-black/[0.06] pt-3">
        <AddWalletForm onAdd={handleAdd} submitting={submitting} />
      </div>
    </div>
  );
}

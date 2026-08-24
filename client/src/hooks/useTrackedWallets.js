import { useCallback, useEffect, useState } from 'react';
import {
  listTrackedWallets,
  addTrackedWallet,
  deleteTrackedWallet,
} from '../services/trackedWalletApi.js';

/**
 * useTrackedWallets — kelola daftar wallet yang dipantau user.
 *
 * Return:
 *   wallets    : array tracked wallet [{ id, address, label, chainType, addedAt }]
 *   loading    : lagi fetch list
 *   error      : error saat load list (shape { code, message }) — buat display inline
 *   submitting : lagi add/delete (buat disable tombol)
 *   reload()   : fetch ulang list
 *   add({ address, label, chainType })  : tambah wallet → { ok, error? }
 *   remove(id) : hapus wallet → { ok, error? }
 *
 * Catatan: add/remove balikin { ok, error } (bukan cuma boolean) biar caller
 * bisa kasih feedback toast yang spesifik tanpa nebak-nebak error state.
 */
export default function useTrackedWallets() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listTrackedWallets();
      setWallets(res.data.wallets);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const add = useCallback(async ({ address, label, chainType }) => {
    setSubmitting(true);
    try {
      const res = await addTrackedWallet({ address, label, chainType });
      // Sisipin di paling atas (list di-sort terbaru duluan)
      setWallets((prev) => [res.data, ...prev]);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err };
    } finally {
      setSubmitting(false);
    }
  }, []);

  const remove = useCallback(async (id) => {
    setSubmitting(true);
    try {
      await deleteTrackedWallet(id);
      setWallets((prev) => prev.filter((w) => w.id !== id));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err };
    } finally {
      setSubmitting(false);
    }
  }, []);

  useEffect(() => {
    // Bungkus async biar setState gak dipanggil sinkron di body effect
    // (react-hooks/set-state-in-effect).
    (async () => {
      await reload();
    })();
  }, [reload]);

  return { wallets, loading, submitting, error, reload, add, remove };
}

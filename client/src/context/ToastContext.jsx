import { createContext, useContext, useCallback, useState } from 'react';

/**
 * ToastContext — notifikasi singkat (sukses/error/info) yang auto-hilang.
 *
 * Dibikin sendiri (tanpa library) biar gampang dijelasin & gak nambah dependency.
 * Pakai:
 *   const toast = useToast();
 *   toast('Wallet ditambah.', 'success');
 */

const ToastContext = createContext(null);

const VARIANTS = {
  success: 'bg-emerald-600',
  error: 'bg-rose-600',
  info: 'bg-zinc-900',
};

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // toast(message, type) — type: 'success' | 'error' | 'info'
  const toast = useCallback(
    (message, type = 'info', duration = 3000) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, type }]);
      // Auto-dismiss setelah `duration` ms
      setTimeout(() => remove(id), duration);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Container — fixed di kanan atas, di atas semua konten */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            className={`${VARIANTS[t.type] || VARIANTS.info} text-white text-sm rounded-md shadow-lg px-4 py-3 cursor-pointer animate-[fadeIn_0.15s_ease-out]`}
            role="status"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Hook sengaja di-colocate sama provider-nya (gak ngaruh runtime, cuma HMR).
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast harus dipakai di dalam <ToastProvider>.');
  }
  return ctx;
}

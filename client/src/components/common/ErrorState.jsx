/**
 * ErrorState — ditampilkan saat call API gagal. Salah satu dari 3 state wajib.
 *
 * Props:
 *   error   : Error / objek { message } / string
 *   onRetry : callback tombol "Coba lagi" (opsional)
 */
function readMessage(error) {
  if (!error) return 'Terjadi kesalahan.';
  if (typeof error === 'string') return error;
  // apiClient biasanya nempel error.code + error.message
  return error.message || 'Terjadi kesalahan saat memuat data.';
}

export default function ErrorState({ error, onRetry }) {
  const code = typeof error === 'object' && error?.code ? error.code : null;

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-rose-600">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 9v4 M12 17h.01 M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
      </div>
      <p className="mt-4 font-semibold text-rose-800">Gagal memuat</p>
      <p className="mt-1 max-w-md text-sm text-rose-700">{readMessage(error)}</p>
      {code && <p className="mt-1 font-mono text-xs text-rose-400">{code}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 rounded-full bg-rose-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-500"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}

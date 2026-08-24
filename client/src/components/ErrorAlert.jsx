/**
 * ErrorAlert — banner merah dengan pesan error.
 * Format error mengikuti shape dari apiClient: { code, message }.
 */
export default function ErrorAlert({ error, onDismiss, className = '' }) {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message || 'Terjadi kesalahan.';
  const code = typeof error === 'object' ? error.code : null;

  return (
    <div
      className={`rounded-md bg-rose-50 border border-rose-200 p-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-rose-800">
            {code ? `Error: ${code}` : 'Error'}
          </h3>
          <p className="text-sm text-rose-700 mt-1">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-rose-500 hover:text-rose-700 text-sm font-medium"
          >
            Tutup
          </button>
        )}
      </div>
    </div>
  );
}

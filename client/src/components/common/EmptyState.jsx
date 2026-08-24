/**
 * EmptyState — ditampilkan saat tidak ada data (bukan error).
 *
 * Props:
 *   title   : judul singkat
 *   message : penjelasan
 *   icon    : node ikon (opsional)
 *   action  : node tombol/link (opsional)
 */
export default function EmptyState({ title = 'Belum ada data', message, icon, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-black/10 bg-white px-6 py-16 text-center">
      {icon && (
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#f5f5f7] text-zinc-400">
          {icon}
        </div>
      )}
      <p className="font-semibold text-[#1d1d1f]">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-zinc-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

import Spinner from '../Spinner.jsx';

/**
 * LoadingState — placeholder saat fetch. Salah satu dari 3 state wajib
 * (loading/error/empty) yang disebut spec §3.
 *
 * Props:
 *   message : teks di bawah spinner (opsional)
 */
export default function LoadingState({ message = 'Memuat data…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-black/5 bg-white py-16">
      <Spinner size="lg" />
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}

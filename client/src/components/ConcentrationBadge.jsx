/**
 * ConcentrationBadge — pill kelas konsentrasi portofolio (HHI).
 *
 * Beda dari RiskBadge: kelas HHI pakai istilah konsentrasi
 * (Terdiversifikasi / Moderat / Terkonsentrasi), BUKAN Low/Medium/High —
 * itu istilah buat risiko per aset, konsep beda.
 *
 * Nerima banyak bentuk input biar konsisten dari sumber manapun:
 *   - label kanonik  : 'Terdiversifikasi' | 'Moderat' | 'Terkonsentrasi' (scan baru)
 *   - enum kolom DB  : 'LOW' | 'MEDIUM' | 'HIGH' (scan lama dari history)
 * Semuanya dipetakan ke label Indonesia yang sama.
 */
const STYLES = {
  DIVERSIFIED: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  MODERATE: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  CONCENTRATED: 'bg-rose-100 text-rose-800 ring-rose-600/20',
};

const LABELS = {
  DIVERSIFIED: 'Terdiversifikasi',
  MODERATE: 'Moderat',
  CONCENTRATED: 'Terkonsentrasi',
};

// Semua alias (enum DB, label kanonik) → key internal
const ALIASES = {
  LOW: 'DIVERSIFIED',
  TERDIVERSIFIKASI: 'DIVERSIFIED',
  MEDIUM: 'MODERATE',
  MODERAT: 'MODERATE',
  HIGH: 'CONCENTRATED',
  TERKONSENTRASI: 'CONCENTRATED',
};

export default function ConcentrationBadge({ level, className = '' }) {
  const key = ALIASES[String(level || '').toUpperCase()];
  const style = STYLES[key] || 'bg-zinc-100 text-zinc-700 ring-zinc-600/20';
  const label = LABELS[key] || 'Tidak diketahui';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style} ${className}`}
    >
      {label}
    </span>
  );
}

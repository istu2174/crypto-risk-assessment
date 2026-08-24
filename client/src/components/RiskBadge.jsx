/**
 * RiskBadge — pill warna sesuai level risk.
 * Backend balikin level dalam UPPERCASE (LOW/MEDIUM/HIGH) — kita normalize.
 */
const STYLES = {
  LOW: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  MEDIUM: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  HIGH: 'bg-rose-100 text-rose-800 ring-rose-600/20',
};

const LABELS = {
  LOW: 'Low Risk',
  MEDIUM: 'Medium Risk',
  HIGH: 'High Risk',
};

export default function RiskBadge({ level, className = '' }) {
  const normalized = String(level || '').toUpperCase();
  const style = STYLES[normalized] || 'bg-zinc-100 text-zinc-700 ring-zinc-600/20';
  const label = LABELS[normalized] || normalized || 'Unknown';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style} ${className}`}
    >
      {label}
    </span>
  );
}

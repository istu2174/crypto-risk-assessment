/**
 * ChainIcon — badge bulat warna per blockchain.
 * Terima format apa pun: 'sol'|'eth'|'btc' (spec) atau 'SOLANA'|'ETHEREUM'|
 * 'BITCOIN' (data backend). Dinormalisasi ke kunci internal.
 *
 * Props:
 *   chain : identifier chain
 *   size  : 'sm' | 'md'
 */
const META = {
  SOL: { label: 'SOL', bg: 'bg-violet-100', text: 'text-violet-700' },
  ETH: { label: 'ETH', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  BTC: { label: 'BTC', bg: 'bg-amber-100', text: 'text-amber-700' },
};

function normalize(chain) {
  const c = String(chain || '').toUpperCase();
  if (c.startsWith('SOL')) return 'SOL';
  if (c.startsWith('ETH')) return 'ETH';
  if (c.startsWith('BTC') || c.startsWith('BIT')) return 'BTC';
  return null;
}

export default function ChainIcon({ chain, size = 'md', className = '' }) {
  const key = normalize(chain);
  const meta = key ? META[key] : null;
  const box = size === 'sm' ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-[11px]';

  if (!meta) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-zinc-100 font-semibold text-zinc-500 ${box} ${className}`}
      >
        {String(chain || '?').slice(0, 3).toUpperCase()}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold ${meta.bg} ${meta.text} ${box} ${className}`}
    >
      {meta.label}
    </span>
  );
}

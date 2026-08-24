import { Link } from 'react-router-dom';

/**
 * Logo — brand mark (shield + check) + wordmark "CryptoRisk".
 * Dipakai di Navbar, Footer, Login, Dashboard. Default nge-link ke home.
 *
 * Props:
 *   to       : target link (default '/'); kalau null → render <span> (gak clickable)
 *   showText : tampilkan wordmark (default true)
 *   tone     : 'light' (teks gelap, buat background terang) | 'dark' (teks putih)
 *   size     : 'sm' | 'md'
 */
export default function Logo({
  to = '/',
  showText = true,
  tone = 'light',
  size = 'md',
  className = '',
}) {
  const box = size === 'sm' ? 'h-7 w-7 rounded-lg' : 'h-9 w-9 rounded-xl';
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const textSize = size === 'sm' ? 'text-[15px]' : 'text-base';
  const wordColor = tone === 'dark' ? 'text-white' : 'text-zinc-900';
  const accentColor = tone === 'dark' ? 'text-[#5ac8fa]' : 'text-[#06c]';

  const inner = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`grid place-items-center bg-gradient-to-br from-[#06c] to-[#0a84ff] shadow-sm ${box}`}
      >
        <svg
          viewBox="0 0 24 24"
          className={`${iconSize} text-white`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2 4 6v6c0 4.4 3.4 7.6 8 8 4.6-.4 8-3.6 8-8V6l-8-4Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </span>
      {showText && (
        <span className={`font-semibold tracking-tight ${textSize} ${wordColor}`}>
          Crypto<span className={accentColor}>Risk</span>
        </span>
      )}
    </span>
  );

  if (!to) return inner;
  return <Link to={to}>{inner}</Link>;
}

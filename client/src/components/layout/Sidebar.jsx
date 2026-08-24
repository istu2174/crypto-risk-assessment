import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';

/**
 * Sidebar — navigasi utama area app (spec §6). Dipakai AppLayout.
 * NAV_ITEMS diekspor biar AppLayout bisa render versi mobile-nya.
 *
 * Motion: highlight item aktif pakai layoutId → pas pindah halaman,
 * pill-nya "geser" mulus ke item baru (sama kayak pill di Navbar publik).
 */
// eslint-disable-next-line react-refresh/only-export-components
export const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: 'M3 3h8v8H3z M13 3h8v5h-8z M13 10h8v11h-8z M3 13h8v8H3z',
  },
  {
    to: '/composition',
    label: 'Komposisi',
    icon: 'M21 12a9 9 0 1 1-9-9v9z M12 3a9 9 0 0 1 9 9h-9z',
  },
  {
    to: '/history',
    label: 'Riwayat',
    icon: 'M3 3v5h5 M3.05 13A9 9 0 1 0 6 5.3L3 8 M12 7v5l4 2',
  },
  {
    to: '/methodology',
    label: 'Metodologi',
    icon: 'm9 11 3 3 8-8 M21 12a9 9 0 1 1-6.2-8.5',
  },
];

function ItemIcon({ d }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-black/[0.06] bg-white md:flex md:flex-col">
      <nav className="flex flex-col gap-1 p-4">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Menu
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {({ isActive }) => (
              <span
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                  isActive ? '' : 'hover:bg-[#f5f5f7]'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-[#06c]/10"
                  />
                )}
                <span
                  className={`relative flex items-center gap-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-[#06c]'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <ItemIcon d={item.icon} />
                  {item.label}
                </span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

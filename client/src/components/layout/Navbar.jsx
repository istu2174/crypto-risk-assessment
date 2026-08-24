import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion, useScroll, useMotionValueEvent } from 'motion/react';
import { useAuth } from '../../context/AuthContext.jsx';
import Logo from './Logo.jsx';

/**
 * Navbar — header global ala Apple.com: tipis, translucent (blur + saturate).
 *
 * Motion:
 *   - Pill abu di item aktif pakai layoutId → pas pindah halaman, pill-nya
 *     "geser" mulus dari menu lama ke menu baru (shared layout animation).
 *   - Pas halaman di-scroll, navbar dapet shadow halus biar kerasa "ngambang".
 */
// shortLabel dipakai di layar sempit biar navbar gak overflow horizontal.
// "Home" disembunyiin di mobile — logo udah nge-link ke home.
const navItems = [
  { to: '/', label: 'Home', shortLabel: 'Home', end: true, mobileHidden: true },
  { to: '/about', label: 'About', shortLabel: 'About' },
  { to: '/system', label: 'Tentang Sistem', shortLabel: 'Sistem' },
];

export default function Navbar() {
  const { isAuthenticated } = useAuth();

  // Deteksi scroll → munculin shadow
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 8));

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-white/80 backdrop-blur-xl backdrop-saturate-150 transition-shadow duration-300 ${
        scrolled
          ? 'border-black/[0.06] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)]'
          : 'border-black/[0.08]'
      }`}
    >
      <nav className="mx-auto flex h-12 max-w-6xl items-center justify-between px-3 sm:px-6 lg:px-8">
        <Logo tone="light" size="sm" />

        <div className="flex items-center gap-0.5 sm:gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={item.mobileHidden ? 'hidden sm:inline-block' : ''}
            >
              {({ isActive }) => (
                <span className="relative inline-block whitespace-nowrap px-2 py-1 sm:px-3">
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-[#1d1d1f]/[0.06]"
                    />
                  )}
                  <span
                    className={`relative text-[13px] transition-colors ${
                      isActive
                        ? 'font-medium text-zinc-900'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    {/* Label pendek di mobile, label penuh mulai sm */}
                    <span className="sm:hidden">{item.shortLabel}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </span>
                </span>
              )}
            </NavLink>
          ))}

          <motion.span
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="ml-1 inline-block"
          >
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              className="inline-block whitespace-nowrap rounded-full bg-[#06c] px-3 py-1 text-[12px] font-medium text-white transition-colors hover:bg-[#0077ed] sm:px-3.5"
            >
              {isAuthenticated ? 'Dashboard' : 'Launch App'}
            </Link>
          </motion.span>
        </div>
      </nav>
    </header>
  );
}

import { NavLink, useNavigate } from 'react-router-dom';
import { PortfolioProvider } from '../../context/PortfolioContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { shortenAddress } from '../../utils/formatters.js';
import { chainLabel } from '../../utils/chains.js';
import Logo from './Logo.jsx';
import Sidebar, { NAV_ITEMS } from './Sidebar.jsx';
import AnimatedOutlet from '../motion/AnimatedOutlet.jsx';

/**
 * AppLayout — shell area terproteksi (spec §6: Navbar + Sidebar).
 *   - Topbar : logo, status wallet (address + chain), tombol disconnect.
 *   - Sidebar: navigasi utama (desktop). Di mobile → nav horizontal di bawah topbar.
 *   - Konten : <Outlet/> dibungkus PortfolioProvider biar antar-page share data.
 */
export default function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const walletAddress = user?.walletAddress || user?.primaryWallet;
  const chain = user?.chainType || 'SOLANA';

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <PortfolioProvider>
      <div className="flex min-h-screen flex-col bg-transparent text-[#1d1d1f]">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            <Logo tone="light" size="sm" />
            <div className="flex items-center gap-3">
              {walletAddress && (
                <span className="hidden items-center gap-2 rounded-full bg-[#f5f5f7] px-3 py-1.5 text-xs sm:inline-flex">
                  <span className="font-mono text-zinc-700">
                    {shortenAddress(walletAddress, 5)}
                  </span>
                  <span className="rounded-full bg-white px-1.5 py-0.5 font-medium text-[#06c]">
                    {chainLabel(chain)}
                  </span>
                </span>
              )}
              <button
                onClick={handleLogout}
                className="rounded-full border border-black/10 px-3.5 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-[#f5f5f7]"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Nav mobile */}
          <nav className="flex gap-1 overflow-x-auto border-t border-black/[0.06] px-3 py-2 md:hidden">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-[#06c]/10 text-[#06c]' : 'text-zinc-500'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        {/* Body: sidebar + konten */}
        <div className="mx-auto flex w-full max-w-7xl flex-1">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <AnimatedOutlet />
          </main>
        </div>
      </div>
    </PortfolioProvider>
  );
}

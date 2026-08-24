import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext.jsx';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate } from '../utils/formatters.js';
import Spinner from '../components/Spinner.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ScanSummary from '../features/risk-assessment/ScanSummary.jsx';
import AssetTable from '../features/risk-assessment/AssetTable.jsx';
import UnclassifiedTokens from '../features/risk-assessment/UnclassifiedTokens.jsx';
import WalletManager from '../features/wallet/WalletManager.jsx';

/**
 * DashboardPage (spec §7.3) — ringkasan portofolio + tabel aset.
 * Data dari PortfolioContext (di-share dengan Composition/History/Coin Detail).
 * Tiap row aset → klik buka Coin Detail.
 */
const CHAIN_FILTERS = [
  { key: 'ALL', label: 'Semua' },
  { key: 'SOLANA', label: 'Solana' },
  { key: 'ETHEREUM', label: 'Ethereum' },
  { key: 'BITCOIN', label: 'Bitcoin' },
];

// Skenario demo — tiap opsi didesain jatuh di satu kelas HHI (buat pengujian).
const DEMO_SCENARIOS = [
  { key: 'diversified', label: 'Portofolio Terdiversifikasi', hint: 'HHI rendah · merata' },
  { key: 'moderate', label: 'Portofolio Moderat', hint: 'HHI sedang · 2 dominan' },
  { key: 'concentrated', label: 'Portofolio Terkonsentrasi', hint: 'HHI tinggi · 1 dominan' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const {
    selectedScan,
    unclassified,
    loading,
    scanning,
    demoScanning,
    error,
    lastFetchedAt,
    setError,
    loadScanDetail,
    runScan,
    runDemoScan,
  } = usePortfolio();

  const walletAddress = user?.walletAddress || user?.primaryWallet;
  const primaryChain = user?.chainType || 'SOLANA';

  // Wallet target buat di-scan (null = primary)
  const [targetWallet, setTargetWallet] = useState(null);
  const activeAddress = targetWallet?.address || walletAddress;
  const activeChain = targetWallet?.chainType || primaryChain;

  const [chainFilter, setChainFilter] = useState('ALL');

  // Dropdown skenario demo (buka/tutup + tutup saat klik di luar)
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const demoMenuRef = useRef(null);
  useEffect(() => {
    if (!demoMenuOpen) return;
    const onClickOutside = (e) => {
      if (demoMenuRef.current && !demoMenuRef.current.contains(e.target)) {
        setDemoMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [demoMenuOpen]);

  const assets = useMemo(
    () => selectedScan?.assetSnapshots || [],
    [selectedScan],
  );
  const filteredAssets = useMemo(
    () =>
      chainFilter === 'ALL'
        ? assets
        : assets.filter((a) => a.chainType === chainFilter),
    [assets, chainFilter],
  );

  // Chain yang benar-benar ada di portofolio (buat filter dinamis)
  const presentChains = useMemo(
    () => new Set(assets.map((a) => a.chainType)),
    [assets],
  );

  const handleScan = async () => {
    try {
      await runScan(activeChain, activeAddress);
      toast('Scan selesai.', 'success');
    } catch (err) {
      toast(err.message || 'Scan gagal.', 'error');
    }
  };

  const handleDemo = async (scenario) => {
    setDemoMenuOpen(false);
    try {
      await runDemoScan(scenario);
      toast('Demo scan selesai.', 'success');
    } catch (err) {
      toast(err.message || 'Demo scan gagal.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Ringkasan risiko & komposisi portofolio.
            {lastFetchedAt && (
              <span className="ml-1 text-zinc-400">
                · Data per {formatDate(lastFetchedAt)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Dropdown skenario demo — tiap opsi jatuh di kelas HHI berbeda */}
          <div className="relative" ref={demoMenuRef}>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={() => setDemoMenuOpen((v) => !v)}
              disabled={scanning || demoScanning}
              aria-haspopup="menu"
              aria-expanded={demoMenuOpen}
              title="Scan portofolio demo (coin asli, komposisi contoh)"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-[#f5f5f7] disabled:opacity-50"
            >
              {demoScanning && <Spinner size="sm" />}
              {demoScanning ? 'Scanning…' : 'Demo Scan'}
              {!demoScanning && (
                <svg
                  viewBox="0 0 12 12"
                  className={`h-3 w-3 transition-transform ${demoMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </motion.button>

            {demoMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-black/10 bg-white p-1 shadow-xl shadow-black/5"
              >
                <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Pilih skenario demo
                </div>
                {DEMO_SCENARIOS.map((s) => (
                  <button
                    key={s.key}
                    role="menuitem"
                    onClick={() => handleDemo(s.key)}
                    disabled={scanning || demoScanning}
                    className="flex w-full flex-col items-start rounded-xl px-3 py-2 text-left transition-colors hover:bg-[#f5f5f7] disabled:opacity-50"
                  >
                    <span className="text-sm font-medium text-[#1d1d1f]">{s.label}</span>
                    <span className="text-xs text-zinc-500">{s.hint}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            onClick={handleScan}
            disabled={scanning || demoScanning || !activeAddress}
            className="inline-flex items-center gap-2 rounded-full bg-[#06c] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-[#06c]/20 transition-colors hover:bg-[#0077ed] disabled:opacity-50"
          >
            {scanning && <Spinner size="sm" className="text-white" />}
            {scanning ? 'Scanning…' : 'Scan Now'}
          </motion.button>
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={() => setError(null)} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Kiri: hasil scan. min-w-0 wajib: tanpa ini grid item melar ngikutin
            lebar tabel (8 kolom) → overflow-x-auto di AssetTable gak aktif. */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {loading && !selectedScan && <LoadingState message="Memuat portofolio…" />}

          {!loading && !selectedScan && !error && (
            <EmptyState
              title="Belum ada scan"
              message='Pilih wallet di panel "Wallet Saya" lalu klik "Scan Now", atau coba "Demo Scan".'
            />
          )}

          {selectedScan && (
            <>
              <ScanSummary scan={selectedScan} />

              {/* Chain filter */}
              {presentChains.size > 1 && (
                <div className="flex flex-wrap gap-2">
                  {CHAIN_FILTERS.filter(
                    (c) => c.key === 'ALL' || presentChains.has(c.key),
                  ).map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setChainFilter(c.key)}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                        chainFilter === c.key
                          ? 'bg-[#1d1d1f] text-white'
                          : 'border border-black/10 bg-white text-zinc-600 hover:bg-[#f5f5f7]'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#1d1d1f]">
                    Daftar Aset & Risk Level
                  </h2>
                  <button
                    onClick={() => selectedScan && loadScanDetail(selectedScan.id)}
                    className="text-xs font-medium text-[#06c] hover:underline"
                  >
                    Muat ulang
                  </button>
                </div>
                <AssetTable assets={filteredAssets} />
              </div>

              <UnclassifiedTokens tokens={unclassified} />
            </>
          )}
        </div>

        {/* Kanan: wallet manager */}
        <div className="space-y-6">
          <WalletManager
            primaryWallet={walletAddress}
            primaryChain={primaryChain}
            selectedAddress={activeAddress}
            onSelect={setTargetWallet}
          />
        </div>
      </div>
    </div>
  );
}

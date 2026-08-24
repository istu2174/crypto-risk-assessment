import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import ScanHistoryList from '../features/risk-assessment/ScanHistoryList.jsx';
import ScanSummary from '../features/risk-assessment/ScanSummary.jsx';
import AssetTable from '../features/risk-assessment/AssetTable.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';

/**
 * HistoryPage (spec §7.6) — riwayat assessment.
 *   - HistoryFilter : filter by overall risk level
 *   - HistoryList   : list scan (klik → muat snapshot)
 *   - Detail        : ScanSummary + AssetTable scan terpilih (gaya drawer inline)
 *
 * Catatan: backend belum sediakan endpoint hapus scan, jadi DeleteHistoryItem
 * (spec) belum diimplementasi — tidak mengarang endpoint.
 */
const FILTERS = [
  { key: 'ALL', label: 'Semua' },
  { key: 'LOW', label: 'Low' },
  { key: 'MEDIUM', label: 'Medium' },
  { key: 'HIGH', label: 'High' },
];

export default function HistoryPage() {
  const { user } = useAuth();
  const { scans, selectedScan, loading, error, loadScanDetail } = usePortfolio();
  const primaryWallet = user?.walletAddress || user?.primaryWallet;
  const [filter, setFilter] = useState('ALL');

  const filtered = useMemo(
    () =>
      filter === 'ALL'
        ? scans
        : scans.filter((s) => String(s.overallRiskLevel).toUpperCase() === filter),
    [scans, filter],
  );

  if (loading && scans.length === 0) return <LoadingState message="Memuat riwayat…" />;
  if (error && scans.length === 0) return <ErrorState error={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">
          Riwayat Assessment
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Setiap scan tersimpan — buka kembali untuk membandingkan dari waktu ke
          waktu.
        </p>
      </div>

      {scans.length === 0 ? (
        <EmptyState
          title="Belum ada riwayat"
          message="Riwayat akan muncul di sini setelah scan pertama."
        />
      ) : (
        <>
          {/* Filter */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-[#1d1d1f] text-white'
                    : 'border border-black/10 bg-white text-zinc-600 hover:bg-[#f5f5f7]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* List */}
            <div className="lg:col-span-1">
              {filtered.length === 0 ? (
                <EmptyState title="Tidak ada scan untuk filter ini" />
              ) : (
                <ScanHistoryList
                  scans={filtered}
                  activeScanId={selectedScan?.id}
                  onSelect={loadScanDetail}
                  primaryWallet={primaryWallet}
                />
              )}
            </div>

            {/* Detail scan terpilih. min-w-0: sama alasannya dgn Dashboard —
                biar AssetTable bisa scroll horizontal, bukan melar/kepotong. */}
            <div className="min-w-0 space-y-6 lg:col-span-2">
              {selectedScan ? (
                <>
                  <ScanSummary scan={selectedScan} />
                  <AssetTable assets={selectedScan.assetSnapshots || []} />
                </>
              ) : (
                <EmptyState
                  title="Pilih satu scan"
                  message="Klik salah satu item riwayat untuk melihat detailnya."
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

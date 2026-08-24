import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { interpretHhi, HHI_LEVELS } from '../utils/riskRules.js';
import { formatNumber, formatPercent } from '../utils/formatters.js';
import PortfolioComposition from '../features/risk-assessment/PortfolioComposition.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';

/**
 * CompositionPage (spec §7.5) — analisa konsentrasi portofolio (HHI).
 *   - AllocationChart   : donut alokasi (reuse PortfolioComposition)
 *   - HHIScoreCard      : nilai HHI + interpretasi
 *   - HHIFormulaDisplay : rumus + perhitungan nyata dari portofolio user (PRIORITAS)
 *   - ConcentrationTable: kontribusi tiap aset (weight & weight²)
 */
export default function CompositionPage() {
  const { selectedScan, loading, error } = usePortfolio();
  const assets = useMemo(
    () => selectedScan?.assetSnapshots || [],
    [selectedScan],
  );

  // Hitung ulang weight & kontribusi HHI dari valueUsd biar derivasinya transparan
  const { rows, hhi } = useMemo(() => {
    const total = assets.reduce((s, a) => s + (a.valueUsd || 0), 0);
    if (total <= 0) return { rows: [], hhi: 0 };
    const r = assets
      .map((a) => {
        const weight = a.valueUsd / total;
        return {
          symbol: a.symbol,
          coingeckoId: a.coingeckoId,
          valueUsd: a.valueUsd,
          weight,
          contribution: weight * weight, // wᵢ²
        };
      })
      .sort((x, y) => y.weight - x.weight);
    const sum = r.reduce((s, x) => s + x.contribution, 0);
    return { rows: r, hhi: sum };
  }, [assets]);

  if (loading && !selectedScan) return <LoadingState message="Memuat komposisi…" />;
  if (error && !selectedScan) return <ErrorState error={error} />;
  if (!selectedScan) {
    return (
      <EmptyState
        title="Belum ada portofolio"
        message="Jalankan scan di Dashboard dulu untuk melihat komposisi."
        action={
          <Link
            to="/dashboard"
            className="rounded-full bg-[#06c] px-5 py-2 text-sm font-medium text-white hover:bg-[#0077ed]"
          >
            Ke Dashboard
          </Link>
        }
      />
    );
  }

  const interp = interpretHhi(hhi);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">
          Komposisi & Konsentrasi
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Seberapa terdiversifikasi portofolio, diukur dengan Herfindahl-Hirschman
          Index (HHI).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Donut */}
        <div className="rounded-3xl border border-black/5 bg-white p-6 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-[#1d1d1f]">
            Alokasi Aset
          </h2>
          <PortfolioComposition assets={assets} />
        </div>

        {/* HHI score card */}
        <div className="rounded-3xl border border-black/5 bg-white p-6">
          <h2 className="text-sm font-semibold text-[#1d1d1f]">Skor HHI</h2>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-5xl font-semibold tracking-tight text-[#1d1d1f]">
              {formatNumber(hhi, 4)}
            </span>
          </div>
          <span className={`mt-2 inline-block text-sm font-semibold ${interp.color}`}>
            {interp.label}
          </span>

          <div className="mt-5 space-y-2 border-t border-black/[0.06] pt-4">
            {HHI_LEVELS.slice().reverse().map((l) => (
              <div
                key={l.label}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                  l.label === interp.label ? 'bg-[#f5f5f7]' : ''
                }`}
              >
                <span className={`font-medium ${l.color}`}>{l.label}</span>
                <span className="font-mono text-xs text-zinc-500">{l.range}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HHI Formula Display — PRIORITAS spec */}
      <div className="rounded-3xl border border-black/5 bg-white p-6">
        <h2 className="text-sm font-semibold text-[#1d1d1f]">
          Bagaimana HHI Dihitung
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          HHI adalah jumlah kuadrat bobot tiap aset. Bobot = nilai aset ÷ total
          nilai portofolio.
        </p>

        <div className="mt-4 rounded-2xl bg-[#f5f5f7] px-5 py-4 text-center">
          <code className="text-[#06c]">HHI = Σ (wᵢ)²</code>
        </div>

        {/* Perhitungan nyata */}
        <div className="mt-4 overflow-x-auto rounded-2xl border border-black/[0.06]">
          <table className="min-w-full divide-y divide-black/[0.06] text-sm">
            <thead className="bg-[#f5f5f7] text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Aset</th>
                <th className="px-4 py-2.5 text-right font-medium">Bobot (wᵢ)</th>
                <th className="px-4 py-2.5 text-right font-medium">wᵢ²</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {rows.map((r) => (
                <tr key={r.coingeckoId || r.symbol}>
                  <td className="px-4 py-2.5 font-medium text-[#1d1d1f]">
                    {r.symbol}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-600">
                    {formatPercent(r.weight)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-zinc-600">
                    {formatNumber(r.contribution, 4)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black/10 bg-[#f5f5f7]">
                <td className="px-4 py-3 font-semibold text-[#1d1d1f]" colSpan={2}>
                  Total (HHI)
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-[#06c]">
                  {formatNumber(hhi, 4)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { computeBreakdown, OVERALL_LEVELS, classifyScore } from '../utils/riskRules.js';
import { formatUsd } from '../utils/formatters.js';
import RiskBadge from '../components/RiskBadge.jsx';
import ChainIcon from '../components/common/ChainIcon.jsx';
import ValueDisplay from '../components/common/ValueDisplay.jsx';
import EmptyState from '../components/common/EmptyState.jsx';

/**
 * CoinDetailPage (spec §7.4) — drill-down 1 aset.
 *   - CoinHeader            : nama, simbol, chain, harga
 *   - VariableBreakdown     : 4 kartu — nilai mentah + threshold + poin
 *   - ClassificationExplainer (PRIORITAS): kenapa koin ini dapat level X
 *   - RawDataAccordion      : data mentah (collapsible) — bukti sumber data
 *
 * Catatan: backend gak punya endpoint per-coin, jadi aset diambil dari scan
 * aktif di PortfolioContext. Identifikasi pakai coingeckoId (bukan chain/address)
 * karena itu kunci yang dipakai backend.
 */
export default function CoinDetailPage() {
  const { coingeckoId } = useParams();
  const { selectedScan } = usePortfolio();
  const [rawOpen, setRawOpen] = useState(false);

  const asset = useMemo(
    () => selectedScan?.assetSnapshots?.find((a) => a.coingeckoId === coingeckoId),
    [selectedScan, coingeckoId],
  );

  const breakdown = useMemo(() => (asset ? computeBreakdown(asset) : []), [asset]);
  const totalPoints = breakdown.reduce((s, b) => s + b.points, 0);

  if (!asset) {
    return (
      <EmptyState
        title="Aset tidak ditemukan"
        message="Buka aset dari tabel di Dashboard agar datanya termuat."
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

  return (
    <div className="space-y-6">
      <Link to="/dashboard" className="text-sm font-medium text-[#06c] hover:underline">
        &lsaquo; Kembali ke Dashboard
      </Link>

      {/* CoinHeader */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-black/5 bg-white p-6">
        <div className="flex items-center gap-4">
          {asset.image && (
            <img src={asset.image} alt="" className="h-12 w-12 rounded-full" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">
                {asset.name}
              </h1>
              <ChainIcon chain={asset.chainType} size="sm" />
            </div>
            <p className="text-sm text-zinc-500">
              {asset.symbol} · {formatUsd(asset.priceUsd)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <RiskBadge level={asset.riskLevel} />
          <p className="mt-1 text-sm text-zinc-500">
            Skor {totalPoints} / 12
          </p>
        </div>
      </div>

      {/* VariableBreakdown */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-[#1d1d1f]">
          Rincian per Variabel
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {breakdown.map((b) => (
            <div key={b.key} className="rounded-3xl border border-black/5 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-500">{b.title}</span>
                <span className="rounded-full bg-[#06c]/10 px-2 py-0.5 text-xs font-semibold text-[#06c]">
                  +{b.points}
                </span>
              </div>
              <div className="mt-2 text-xl font-semibold text-[#1d1d1f]">
                <ValueDisplay
                  value={b.value}
                  type={b.type === 'currency' ? 'compact' : 'percent'}
                />
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                {b.label} · {b.range}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ClassificationExplainer — PRIORITAS */}
      <div className="rounded-3xl border border-black/5 bg-white p-6">
        <h2 className="text-sm font-semibold text-[#1d1d1f]">
          Mengapa {asset.symbol} mendapat label ini?
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Setiap variabel menyumbang poin sesuai posisinya terhadap ambang batas.
          Total poin menentukan level risiko.
        </p>

        <ol className="mt-5 space-y-3">
          {breakdown.map((b) => (
            <li
              key={b.key}
              className="flex items-center gap-4 rounded-2xl bg-[#f5f5f7] px-4 py-3"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-sm font-semibold text-[#06c]">
                +{b.points}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[#1d1d1f]">{b.title}</div>
                <div className="text-xs text-zinc-500">
                  Nilai masuk kategori <strong>{b.label}</strong> ({b.range}) →
                  menyumbang {b.points} poin.
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Total + mapping level */}
        <div className="mt-5 rounded-2xl border border-black/[0.06] p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Total skor</span>
            <span className="text-lg font-semibold text-[#1d1d1f]">
              {totalPoints} / 12
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {OVERALL_LEVELS.slice().reverse().map((l) => {
              const isActive = classifyScore(totalPoints) === l.level;
              return (
                <div
                  key={l.level}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    isActive
                      ? 'bg-[#1d1d1f] text-white'
                      : 'bg-[#f5f5f7] text-zinc-500'
                  }`}
                >
                  <span className="font-semibold">{l.level}</span>
                  <span className="font-mono text-xs">
                    {l.level === 'High'
                      ? '≥ 9'
                      : l.level === 'Medium'
                        ? '5 – 8'
                        : '< 5'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RawDataAccordion */}
      <div className="rounded-3xl border border-black/5 bg-white p-6">
        <button
          onClick={() => setRawOpen((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-semibold text-[#1d1d1f]"
        >
          Data Mentah
          <span className="text-zinc-400">{rawOpen ? '−' : '+'}</span>
        </button>
        {rawOpen && (
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#1d1d1f] p-4 text-xs leading-relaxed text-zinc-200">
            {JSON.stringify(
              {
                coingeckoId: asset.coingeckoId,
                symbol: asset.symbol,
                chainType: asset.chainType,
                balance: asset.balance,
                priceUsd: asset.priceUsd,
                valueUsd: asset.valueUsd,
                marketCap: asset.marketCap,
                volume24h: asset.volume24h,
                volatility30d: asset.volatility ?? asset.volatility30d,
                liquidityRatio: asset.liquidityRatio,
                riskScore: asset.riskScore,
                riskLevel: asset.riskLevel,
                weight: asset.weight,
              },
              null,
              2,
            )}
          </pre>
        )}
      </div>
    </div>
  );
}

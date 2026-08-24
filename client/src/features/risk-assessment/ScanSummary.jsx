import { motion } from 'motion/react';
import RiskBadge from '../../components/RiskBadge.jsx';
import ConcentrationBadge from '../../components/ConcentrationBadge.jsx';
import { formatUsd, formatNumber, formatDate } from '../../utils/formatters.js';

/**
 * ScanSummary — kartu KPI hasil scan:
 *   - Total value
 *   - Overall risk (level + score + bar gradient 0–12)
 *   - HHI concentration (level + value + bar)
 *   - Asset count + timestamp
 *
 * Accepts both triggerScan shape (nested `summary`) dan getScanDetail shape (flat).
 */
function pickSummary(scan) {
  // Flat shape dari getScanDetail
  if (scan.totalValueUsd != null) {
    return {
      totalValueUsd: scan.totalValueUsd,
      hhi: scan.hhi,
      // Scan lama dari DB cuma punya enum hhiLevel (LOW/MEDIUM/HIGH); scan baru
      // punya hhiLabel (Terdiversifikasi/...). Badge nerima dua-duanya.
      hhiLabel: scan.hhiLabel,
      hhiLevel: scan.hhiLevel,
      overallRiskScore: scan.overallRiskScore,
      overallRiskLevel: scan.overallRiskLevel,
      assetCount: scan.assetCount,
      scannedAt: scan.scannedAt,
    };
  }
  // Nested shape dari triggerScan
  return {
    ...scan.summary,
    assetCount: scan.summary?.classifiedCount,
    scannedAt: scan.scannedAt,
  };
}

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
};

function MetricCard({ label, value, sub, badge, bar }) {
  return (
    <motion.div
      variants={cardVariant}
      className="min-w-0 rounded-3xl border border-black/5 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.18)]"
    >
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      {/* break-words biar konten panjang (tanggal) wrap, gak nembus card */}
      <div className="mt-1.5 break-words text-2xl font-semibold tracking-tight text-[#1d1d1f]">
        {value}
      </div>
      {bar}
      <div className="mt-2.5 flex items-center gap-2">
        {badge}
        {sub && <span className="text-xs text-zinc-500">{sub}</span>}
      </div>
    </motion.div>
  );
}

/* Bar gradient hijau→merah dengan lebar sesuai porsi nilai (0..1).
   Dipakai buat skor risiko (x/12) dan HHI (0..1) biar angka kebaca visual. */
function GradientBar({ fraction }) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ delay: 0.35, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500"
      />
    </div>
  );
}

export default function ScanSummary({ scan }) {
  if (!scan) return null;
  const s = pickSummary(scan);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <MetricCard
        label="Total Value"
        // Compact ($10K, $1.23M) — currency string tanpa spasi gak bisa wrap,
        // jadi versi ringkas ini yang mastiin muat di card berapapun nilainya.
        // Konsisten dgn compact yang dipakai market cap/volume di AssetTable.
        value={formatUsd(s.totalValueUsd, { compact: true })}
        sub={`${s.assetCount} asset${s.assetCount === 1 ? '' : 's'}`}
      />
      <MetricCard
        label="Overall Risk"
        value={
          <>
            {formatNumber(s.overallRiskScore, 2)}
            <span className="ml-1 text-sm font-normal text-zinc-400">/ 12</span>
          </>
        }
        badge={<RiskBadge level={s.overallRiskLevel} />}
        bar={<GradientBar fraction={(s.overallRiskScore ?? 0) / 12} />}
      />
      <MetricCard
        label="HHI Concentration"
        value={formatNumber(s.hhi, 4)}
        badge={<ConcentrationBadge level={s.hhiLabel ?? s.hhiLevel} />}
        bar={<GradientBar fraction={s.hhi ?? 0} />}
      />
      <MetricCard
        label="Scanned At"
        value={formatDate(s.scannedAt)}
        sub="Last scan timestamp"
      />
    </motion.div>
  );
}

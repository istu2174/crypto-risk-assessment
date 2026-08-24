import RiskBadge from '../../components/RiskBadge.jsx';
import { formatUsd, formatDate, shortenAddress } from '../../utils/formatters.js';

/**
 * ScanHistoryList — list scan sebelumnya. Klik untuk pilih scan & tampilin detail.
 *
 * Props:
 *   scans: array dari listScans (flat shape)
 *   activeScanId: ID scan yang lagi di-pilih (highlighted)
 *   onSelect: (scanId) => void
 *   primaryWallet: address wallet login — buat nandain scan "Primary" vs tracked
 */
// Penanda skenario demo → label ramah (dipakai buat scannedAddress DEMO-*).
const DEMO_LABELS = {
  'DEMO-DIVERSIFIED': 'Demo · Terdiversifikasi',
  'DEMO-MODERATE': 'Demo · Moderat',
  'DEMO-CONCENTRATED': 'Demo · Terkonsentrasi',
  'DEMO-PORTFOLIO': 'Demo portfolio', // scan demo lama (sebelum fitur skenario)
};

// Label wallet yang di-scan: skenario demo, "Primary", address singkat, atau "—".
function walletLabel(scannedAddress, primaryWallet) {
  if (!scannedAddress) return '— wallet tak tercatat';
  if (DEMO_LABELS[scannedAddress]) return DEMO_LABELS[scannedAddress];
  if (scannedAddress === primaryWallet) return 'Primary wallet';
  return shortenAddress(scannedAddress, 6);
}

export default function ScanHistoryList({ scans, activeScanId, onSelect, primaryWallet }) {
  if (!scans || scans.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-zinc-500">
        Belum ada riwayat scan. Trigger scan pertama lo di atas.
      </div>
    );
  }

  return (
    <ul className="overflow-hidden rounded-3xl border border-black/5 bg-white divide-y divide-black/[0.04]">
      {scans.map((s) => {
        const isActive = s.id === activeScanId;
        return (
          <li key={s.id}>
            <button
              onClick={() => onSelect?.(s.id)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                isActive ? 'bg-[#06c]/[0.06]' : 'hover:bg-[#f5f5f7]'
              }`}
            >
              <div className="min-w-0">
                <div className="truncate font-mono text-sm font-medium text-[#1d1d1f]">
                  {walletLabel(s.scannedAddress, primaryWallet)}
                </div>
                <div className="text-xs text-zinc-500">
                  {formatDate(s.scannedAt)}
                </div>
                <div className="text-xs text-zinc-500">
                  {formatUsd(s.totalValueUsd)} · {s.assetCount} asset{s.assetCount === 1 ? '' : 's'}
                </div>
              </div>
              <RiskBadge level={s.overallRiskLevel} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

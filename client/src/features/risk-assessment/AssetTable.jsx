import { useNavigate } from 'react-router-dom';
import RiskBadge from '../../components/RiskBadge.jsx';
import ChainIcon from '../../components/common/ChainIcon.jsx';
import ValueDisplay from '../../components/common/ValueDisplay.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

/**
 * AssetTable — tabel aset hasil klasifikasi (spec §7.3).
 * Kolom: koin | chain | value | market cap | vol 24h | volatilitas | likuiditas | risk
 * Klik row → halaman Coin Detail (/coin/:coingeckoId).
 *
 * Props:
 *   assets: array assetSnapshots (getScanDetail) atau classifiedAssets (triggerScan)
 */
const TH = 'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500';

export default function AssetTable({ assets }) {
  const navigate = useNavigate();

  if (!assets || assets.length === 0) {
    return <EmptyState title="Tidak ada aset terklasifikasi" />;
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-black/5 bg-white">
      {/* min-w-[800px]: 8 kolom butuh ruang; kalau viewport sempit → scroll
          horizontal (bukan kolom saling himpit / kepotong). */}
      <table className="w-full min-w-[800px] divide-y divide-black/[0.06]">
        <thead className="bg-[#f5f5f7]">
          <tr>
            <th className={`${TH} text-left`}>Aset</th>
            <th className={`${TH} text-center`}>Chain</th>
            <th className={`${TH} text-right`}>Value</th>
            <th className={`${TH} text-right`}>Market Cap</th>
            <th className={`${TH} text-right`}>Vol 24h</th>
            <th className={`${TH} text-right`}>Volatilitas</th>
            <th className={`${TH} text-right`}>Likuiditas</th>
            <th className={`${TH} text-center`}>Risk</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.04]">
          {assets.map((a) => (
            <tr
              key={a.id || a.coingeckoId}
              onClick={() => a.coingeckoId && navigate(`/coin/${a.coingeckoId}`)}
              className="cursor-pointer transition-colors hover:bg-[#f5f5f7]"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {a.image && (
                    <img src={a.image} alt="" className="h-7 w-7 rounded-full" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-[#1d1d1f]">
                      {a.symbol}
                    </div>
                    <div className="text-xs text-zinc-500">{a.name}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <ChainIcon chain={a.chainType} size="sm" />
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-[#1d1d1f]">
                <ValueDisplay value={a.valueUsd} type="currency" />
              </td>
              <td className="px-4 py-3 text-right text-sm text-zinc-600">
                <ValueDisplay value={a.marketCap} type="compact" />
              </td>
              <td className="px-4 py-3 text-right text-sm text-zinc-600">
                <ValueDisplay value={a.volume24h} type="compact" />
              </td>
              <td className="px-4 py-3 text-right text-sm text-zinc-600">
                <ValueDisplay value={a.volatility ?? a.volatility30d} type="percent" />
              </td>
              <td className="px-4 py-3 text-right text-sm text-zinc-600">
                <ValueDisplay value={a.liquidityRatio} type="percent" />
              </td>
              <td className="px-4 py-3 text-center">
                <RiskBadge level={a.riskLevel} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

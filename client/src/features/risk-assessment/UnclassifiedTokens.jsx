import { formatNumber, shortenAddress } from '../../utils/formatters.js';

/**
 * UnclassifiedTokens — daftar token yang TIDAK bisa diklasifikasi sistem.
 *
 * Token masuk sini kalau:
 *   - NOT_IN_COINGECKO       → mint gak terdaftar di CoinGecko (biasanya spam/airdrop)
 *   - INCOMPLETE_MARKET_DATA → data market kosong (coin baru/delisted)
 *   - INSUFFICIENT_HISTORY   → history harga < 2 data point
 *   - ENRICHMENT_FAILED      → gagal fetch (rate limit, dll)
 *
 * Token-token ini sengaja di-exclude dari kalkulasi risiko — wallet sering
 * kena airdrop token spam tanpa nilai/likuiditas yang bisa ngerusak HHI &
 * overall risk score.
 *
 * Props:
 *   tokens: array unclassifiedAssets dari response triggerScan
 *           shape: { mint, symbol, name, balance, reason, message, coingeckoId? }
 */

// Mapping reason → label pendek + warna chip
const REASON_META = {
  NOT_IN_COINGECKO: { label: 'Tidak terdaftar', color: 'bg-zinc-100 text-zinc-600' },
  INCOMPLETE_MARKET_DATA: { label: 'Data tidak lengkap', color: 'bg-amber-100 text-amber-700' },
  INSUFFICIENT_HISTORY: { label: 'History kurang', color: 'bg-amber-100 text-amber-700' },
  ENRICHMENT_FAILED: { label: 'Gagal fetch', color: 'bg-rose-100 text-rose-700' },
};

function ReasonChip({ reason }) {
  const meta = REASON_META[reason] || { label: reason, color: 'bg-zinc-100 text-zinc-600' };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.color}`}>
      {meta.label}
    </span>
  );
}

export default function UnclassifiedTokens({ tokens }) {
  if (!tokens || tokens.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-3xl border border-black/5 bg-white">
      <div className="border-b border-black/[0.06] px-5 py-4">
        <h3 className="text-sm font-semibold text-[#1d1d1f]">
          Token Tidak Terklasifikasi
          <span className="ml-2 text-xs font-normal text-zinc-500">
            ({tokens.length} token di-exclude dari kalkulasi risiko)
          </span>
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Token ini gak punya data market valid di CoinGecko (biasanya airdrop/spam)
          jadi gak dihitung dalam HHI & overall risk.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-black/[0.06]">
          <thead className="bg-[#f5f5f7]">
            <tr>
              <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Token
              </th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Mint
              </th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Balance
              </th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Alasan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {tokens.map((t) => (
              <tr key={t.mint} className="transition-colors hover:bg-[#f5f5f7]">
                <td className="px-5 py-2.5">
                  <div className="text-sm font-medium text-[#1d1d1f]">{t.symbol || '???'}</div>
                  <div className="text-xs text-zinc-500">{t.name || 'Unknown token'}</div>
                </td>
                <td className="px-5 py-2.5 font-mono text-xs text-zinc-500" title={t.mint}>
                  {shortenAddress(t.mint, 6)}
                </td>
                <td className="px-5 py-2.5 text-right text-sm text-zinc-700">
                  {formatNumber(t.balance, 4)}
                </td>
                <td className="px-5 py-2.5">
                  <ReasonChip reason={t.reason} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

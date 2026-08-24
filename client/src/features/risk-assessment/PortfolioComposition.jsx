import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatUsd, formatPercent } from '../../utils/formatters.js';

/**
 * PortfolioComposition — pie chart komposisi aset by valueUsd.
 *
 * Props:
 *   assets: array { symbol, valueUsd, weight, riskLevel }
 */

// Warna pie — dimulai dari biru brand biar nyambung sama tema app
const COLORS = [
  '#0a84ff', // biru brand
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#8b5cf6', // violet-500
  '#f43f5e', // rose-500
  '#84cc16', // lime-500
];

// Custom tooltip — bikin display lebih informatif
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { symbol, valueUsd, weight } = payload[0].payload;
  return (
    <div className="rounded-xl border border-black/5 bg-white/95 px-3 py-2 text-sm shadow-[0_12px_28px_-12px_rgba(0,0,0,0.25)] backdrop-blur">
      <p className="font-semibold text-[#1d1d1f]">{symbol}</p>
      <p className="text-zinc-600">{formatUsd(valueUsd)}</p>
      <p className="text-zinc-500">{formatPercent(weight)}</p>
    </div>
  );
}

export default function PortfolioComposition({ assets }) {
  if (!assets || assets.length === 0) {
    return (
      <div className="py-8 text-center text-zinc-500">
        Belum ada data komposisi.
      </div>
    );
  }

  // Recharts butuh array dengan field konsisten — kita sediain `value` (dipakai PieChart)
  // dan field lain buat tooltip.
  const data = assets.map((a) => ({
    symbol: a.symbol,
    valueUsd: a.valueUsd,
    weight: a.weight,
    value: a.valueUsd, // Recharts default `dataKey`
  }));

  return (
    // height numerik + minWidth={0} di ResponsiveContainer ngilangin warning
    // "width(-1)/height(-1)" yang muncul saat container belum ke-ukur di frame pertama.
    <div className="w-full">
      <ResponsiveContainer width="100%" height={288} minWidth={0}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="symbol"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={45}
            paddingAngle={1}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => <span className="text-xs text-zinc-700">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================
// RISK RULES — config threshold Rule-Based terpusat (sisi client)
// ============================================================
// Mirror dari server/src/services/riskClassifier.js. Satu-satunya tempat
// threshold ditulis di frontend (spec §9: jangan hardcode di komponen).
// Dipakai ClassificationExplainer, VariableBreakdown, & MethodologyPage biar
// penjelasan "kenapa skornya sekian" konsisten sama perhitungan backend.
//
// Catatan operator (penting, sama kayak backend):
//   - marketCap / volume24h / liquidityRatio → pakai '<' (strict less than)
//   - volatility → pakai '>' (strict greater than)

export const RISK_RULES = {
  marketCap: {
    title: 'Market Cap',
    type: 'currency',
    note: 'Kapitalisasi pasar. Makin kecil → makin berisiko.',
    tiers: [
      { test: (v) => v < 1e8, points: 3, label: 'Micro Cap', range: '< $100 Jt' },
      { test: (v) => v < 1e9, points: 2, label: 'Small Cap', range: '$100 Jt – $1 M' },
      { test: (v) => v < 1e10, points: 1, label: 'Mid Cap', range: '$1 M – $10 M' },
      { test: () => true, points: 0, label: 'Large Cap', range: '≥ $10 M' },
    ],
  },
  volume24h: {
    title: 'Volume 24 Jam',
    type: 'currency',
    note: 'Likuiditas pasar. Volume rendah → susah keluar.',
    tiers: [
      { test: (v) => v < 1e6, points: 3, label: 'Sangat rendah', range: '< $1 Jt' },
      { test: (v) => v < 1e7, points: 2, label: 'Rendah', range: '$1 Jt – $10 Jt' },
      { test: (v) => v < 1e8, points: 1, label: 'Sedang', range: '$10 Jt – $100 Jt' },
      { test: () => true, points: 0, label: 'Tinggi', range: '≥ $100 Jt' },
    ],
  },
  volatility: {
    title: 'Volatilitas 30 Hari',
    type: 'percent',
    note: 'Standar deviasi return harian. Makin tinggi → makin berisiko.',
    tiers: [
      { test: (v) => v > 0.15, points: 3, label: 'Sangat tinggi', range: '> 15%' },
      { test: (v) => v > 0.08, points: 2, label: 'Tinggi', range: '8% – 15%' },
      { test: (v) => v > 0.04, points: 1, label: 'Sedang', range: '4% – 8%' },
      { test: () => true, points: 0, label: 'Rendah', range: '≤ 4%' },
    ],
  },
  liquidityRatio: {
    title: 'Rasio Likuiditas',
    type: 'percent',
    note: 'Volume 24 jam ÷ market cap. Rasio kecil → sulit exit.',
    tiers: [
      { test: (v) => v < 0.01, points: 3, label: 'Sangat rendah', range: '< 1%' },
      { test: (v) => v < 0.05, points: 2, label: 'Rendah', range: '1% – 5%' },
      { test: (v) => v < 0.1, points: 1, label: 'Sedang', range: '5% – 10%' },
      { test: () => true, points: 0, label: 'Tinggi', range: '≥ 10%' },
    ],
  },
};

// Urutan tampilan variabel
export const VARIABLE_ORDER = ['marketCap', 'volume24h', 'volatility', 'liquidityRatio'];

// Pemetaan skor total → level (mirror determineRiskLevel)
export const OVERALL_LEVELS = [
  { level: 'High', min: 9, color: 'text-rose-600', dot: 'bg-rose-500' },
  { level: 'Medium', min: 5, color: 'text-amber-600', dot: 'bg-amber-500' },
  { level: 'Low', min: 0, color: 'text-emerald-600', dot: 'bg-emerald-500' },
];

// Interpretasi HHI (mirror interpretHHI)
export const HHI_LEVELS = [
  { label: 'Terkonsentrasi', level: 'High', min: 0.25, range: 'HHI ≥ 0.25', color: 'text-rose-600' },
  { label: 'Moderat', level: 'Medium', min: 0.15, range: '0.15 – 0.25', color: 'text-amber-600' },
  { label: 'Terdiversifikasi', level: 'Low', min: 0, range: 'HHI < 0.15', color: 'text-emerald-600' },
];

/**
 * Skor 1 variabel berdasarkan nilai mentah. Return tier yang cocok (pertama
 * yang lolos test, urutan dari paling berisiko).
 */
export function scoreVariable(key, value) {
  const rule = RISK_RULES[key];
  if (!rule || value == null || Number.isNaN(value)) {
    return { points: 0, label: '-', range: '-' };
  }
  const tier = rule.tiers.find((t) => t.test(value));
  return { points: tier.points, label: tier.label, range: tier.range };
}

/**
 * Breakdown lengkap 1 aset → array per-variabel buat ditampilkan.
 * Asset snapshot dari DB pakai `volatility30d`; hasil scan baru pakai
 * `volatility`. Kita terima dua-duanya.
 */
export function computeBreakdown(asset) {
  const values = {
    marketCap: asset.marketCap,
    volume24h: asset.volume24h,
    volatility: asset.volatility ?? asset.volatility30d,
    liquidityRatio: asset.liquidityRatio,
  };

  return VARIABLE_ORDER.map((key) => {
    const rule = RISK_RULES[key];
    const value = values[key];
    const score = scoreVariable(key, value);
    return {
      key,
      title: rule.title,
      type: rule.type,
      note: rule.note,
      value,
      ...score,
    };
  });
}

// Level final dari skor total
export function classifyScore(score) {
  return OVERALL_LEVELS.find((l) => score >= l.min)?.level ?? 'Low';
}

// Interpretasi HHI dari nilai
export function interpretHhi(hhi) {
  return HHI_LEVELS.find((l) => hhi >= l.min) ?? HHI_LEVELS[HHI_LEVELS.length - 1];
}

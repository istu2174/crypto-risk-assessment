/**
 * Rule-Based Classifier untuk risiko aset cryptocurrency.
 * 4 Variabel Risiko (skor 0-3 per variabel, total 0-12):
 *   1. Market Cap        → semakin kecil = semakin berisiko
 *   2. Volume 24h        → likuiditas market, low volume = high risk
 *   3. Volatilitas (30d) → standar deviasi return harian
 *   4. Rasio Likuiditas  → volume_24h / market_cap, makin rendah = makin susah exit

 * Klasifikasi final:
 *   score >= 9 → High
 *   score >= 5 → Medium
 *   score <  5 → Low
 *
 
 *   - Market Cap, Volume, Liquidity Ratio pakai operator '<' (strict less than).
 *   - Volatility pakai operator '>' (strict greater than).
 *   - Konsekuensi: nilai TEPAT di batas threshold masuk ke bucket dengan
 *     skor lebih rendah (kecuali volatilitas yg sebaliknya).
 */

// --- Per-rule scoring ---

export function scoreMarketCap(value) {
  assertNonNegativeNumber('marketCap', value);
  if (value < 1e8) return { points: 3, bucket: 'Micro Cap (< $100M)' };
  if (value < 1e9) return { points: 2, bucket: 'Small Cap ($100M – $1B)' };
  if (value < 1e10) return { points: 1, bucket: 'Mid Cap ($1B – $10B)' };
  return { points: 0, bucket: 'Large Cap (>= $10B)' };
}

export function scoreVolume24h(value) {
  assertNonNegativeNumber('volume24h', value);
  if (value < 1e6) return { points: 3, bucket: 'Sangat rendah (< $1M)' };
  if (value < 1e7) return { points: 2, bucket: 'Rendah ($1M – $10M)' };
  if (value < 1e8) return { points: 1, bucket: 'Sedang ($10M – $100M)' };
  return { points: 0, bucket: 'Tinggi (>= $100M)' };
}

export function scoreVolatility(value) {
  assertNonNegativeNumber('volatility', value);
  if (value > 0.15) return { points: 3, bucket: 'Sangat tinggi (> 15%)' };
  if (value > 0.08) return { points: 2, bucket: 'Tinggi (8% – 15%)' };
  if (value > 0.04) return { points: 1, bucket: 'Sedang (4% – 8%)' };
  return { points: 0, bucket: 'Rendah (<= 4%)' };
}

export function scoreLiquidityRatio(value) {
  assertNonNegativeNumber('liquidityRatio', value);
  if (value < 0.01) return { points: 3, bucket: 'Sangat rendah (< 1%)' };
  if (value < 0.05) return { points: 2, bucket: 'Rendah (1% – 5%)' };
  if (value < 0.1) return { points: 1, bucket: 'Sedang (5% – 10%)' };
  return { points: 0, bucket: 'Tinggi (>= 10%)' };
}

// --- Final classification dari total skor ---

export function determineRiskLevel(score) {
  if (score >= 9) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
}

// --- Input validation ---

function assertNonNegativeNumber(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(
      `Parameter '${name}' harus angka non-negatif yang finite. Diterima: ${value}`,
    );
  }
}

/**
 * Klasifikasi risiko sebuah aset.
 *
 * @param {object} input
 * @param {number} input.marketCap        - dalam USD
 * @param {number} input.volume24h        - dalam USD
 * @param {number} input.volatility       - desimal (0.05 = 5%)
 * @param {number} input.liquidityRatio   - desimal (volume24h / marketCap)
 * @returns {{
 *   riskLevel: 'Low' | 'Medium' | 'High',
 *   riskScore: number,
 *   breakdown: {
 *     marketCap:      { value: number, points: number, bucket: string },
 *     volume24h:      { value: number, points: number, bucket: string },
 *     volatility:     { value: number, points: number, bucket: string },
 *     liquidityRatio: { value: number, points: number, bucket: string }
 *   }
 * }}
 */
export function classifyAsset({ marketCap, volume24h, volatility, liquidityRatio }) {
  assertNonNegativeNumber('marketCap', marketCap);
  assertNonNegativeNumber('volume24h', volume24h);
  assertNonNegativeNumber('volatility', volatility);
  assertNonNegativeNumber('liquidityRatio', liquidityRatio);

  const mc = scoreMarketCap(marketCap);
  const vol = scoreVolume24h(volume24h);
  const vt = scoreVolatility(volatility);
  const lq = scoreLiquidityRatio(liquidityRatio);

  const riskScore = mc.points + vol.points + vt.points + lq.points;
  const riskLevel = determineRiskLevel(riskScore);

  return {
    riskLevel,
    riskScore,
    breakdown: {
      marketCap:      { value: marketCap,      points: mc.points, bucket: mc.bucket },
      volume24h:      { value: volume24h,      points: vol.points, bucket: vol.bucket },
      volatility:     { value: volatility,     points: vt.points,  bucket: vt.bucket },
      liquidityRatio: { value: liquidityRatio, points: lq.points,  bucket: lq.bucket },
    },
  };
}

import {
  classifyAsset,
  scoreMarketCap,
  scoreVolume24h,
  scoreVolatility,
  scoreLiquidityRatio,
  determineRiskLevel,
} from '../riskClassifier.js';

describe('riskClassifier', () => {
  // ============================================================
  // RULE 1 — Market Cap
  // Threshold (< strict): 1e8, 1e9, 1e10
  // Nilai TEPAT di threshold masuk bucket lebih rendah skornya.
  // ============================================================
  describe('scoreMarketCap', () => {
    test.each([
      // [value,         expectedPoints, bucketRegex]
      [0,               3, /Micro/],
      [99_999_999,      3, /Micro/],          // tepat di bawah $100M
      [100_000_000,     2, /Small/],          // tepat $100M → masuk bucket berikutnya
      [500_000_000,     2, /Small/],
      [999_999_999,     2, /Small/],
      [1_000_000_000,   1, /Mid/],            // tepat $1B
      [9_999_999_999,   1, /Mid/],
      [10_000_000_000,  0, /Large/],          // tepat $10B
      [1_500_000_000_000, 0, /Large/],        // BTC scale
    ])('marketCap=%i → %i pts', (value, expectedPoints, bucketRegex) => {
      const r = scoreMarketCap(value);
      expect(r.points).toBe(expectedPoints);
      expect(r.bucket).toMatch(bucketRegex);
    });
  });

  // ============================================================
  // RULE 2 — Volume 24h
  // Threshold (< strict): 1e6, 1e7, 1e8
  // ============================================================
  describe('scoreVolume24h', () => {
    test.each([
      [0,             3],
      [999_999,       3],
      [1_000_000,     2],   // tepat $1M
      [9_999_999,     2],
      [10_000_000,    1],   // tepat $10M
      [99_999_999,    1],
      [100_000_000,   0],   // tepat $100M
      [25_000_000_000, 0],  // BTC scale
    ])('volume24h=%i → %i pts', (value, expected) => {
      expect(scoreVolume24h(value).points).toBe(expected);
    });
  });

  // ============================================================
  // RULE 3 — Volatilitas (> strict — kebalikan dari yang lain)
  // Threshold: 0.04, 0.08, 0.15
  // Nilai TEPAT di threshold masuk bucket lebih rendah skornya.
  // ============================================================
  describe('scoreVolatility', () => {
    test.each([
      [0,     0],
      [0.04,  0],     // tepat 4% → tidak > 0.04 → 0 pts
      [0.041, 1],
      [0.08,  1],     // tepat 8% → tidak > 0.08
      [0.081, 2],
      [0.15,  2],     // tepat 15% → tidak > 0.15
      [0.151, 3],
      [1.0,   3],     // 100% (extreme)
    ])('volatility=%f → %i pts', (value, expected) => {
      expect(scoreVolatility(value).points).toBe(expected);
    });
  });

  // ============================================================
  // RULE 4 — Rasio Likuiditas
  // Threshold (< strict): 0.01, 0.05, 0.1
  // ============================================================
  describe('scoreLiquidityRatio', () => {
    test.each([
      [0,     3],
      [0.009, 3],
      [0.01,  2],     // tepat 1% → masuk bucket 1-5%
      [0.049, 2],
      [0.05,  1],     // tepat 5%
      [0.099, 1],
      [0.1,   0],     // tepat 10%
      [0.5,   0],
    ])('liquidityRatio=%f → %i pts', (value, expected) => {
      expect(scoreLiquidityRatio(value).points).toBe(expected);
    });
  });

  // ============================================================
  // Threshold final klasifikasi
  // ============================================================
  describe('determineRiskLevel', () => {
    test.each([
      [0,  'Low'],
      [4,  'Low'],
      [5,  'Medium'],   // tepat di batas Low/Medium
      [7,  'Medium'],
      [8,  'Medium'],
      [9,  'High'],     // tepat di batas Medium/High
      [12, 'High'],     // max
    ])('score=%i → %s', (score, level) => {
      expect(determineRiskLevel(score)).toBe(level);
    });
  });

  // ============================================================
  // Integration — skenario nyata
  // ============================================================
  describe('classifyAsset — skenario realistis', () => {
    test('Bitcoin profile (large cap, high vol $, low volatilitas) → Low', () => {
      // marketCap=$1.5T (0) + vol=$25B (0) + volatility=2.5% (0) + liqRatio≈0.0167 (2) = 2
      const r = classifyAsset({
        marketCap: 1_500_000_000_000,
        volume24h: 25_000_000_000,
        volatility: 0.025,
        liquidityRatio: 25_000_000_000 / 1_500_000_000_000,
      });
      expect(r.riskScore).toBe(2);
      expect(r.riskLevel).toBe('Low');
    });

    test('Mid altcoin profile → Medium', () => {
      // mc=$500M (2) + vol=$5M (2) + volatility=6% (1) + liqRatio=1% (2) = 7
      const r = classifyAsset({
        marketCap: 500_000_000,
        volume24h: 5_000_000,
        volatility: 0.06,
        liquidityRatio: 0.01,
      });
      expect(r.riskScore).toBe(7);
      expect(r.riskLevel).toBe('Medium');
    });

    test('Shitcoin profile (worst case) → High score=12', () => {
      // semua 3 → 12
      const r = classifyAsset({
        marketCap: 5_000_000,
        volume24h: 50_000,
        volatility: 0.3,
        liquidityRatio: 0.005,
      });
      expect(r.riskScore).toBe(12);
      expect(r.riskLevel).toBe('High');
    });

    test('Tepat batas Low/Medium (score = 5)', () => {
      // 2 + 2 + 1 + 0 = 5
      const r = classifyAsset({
        marketCap: 500_000_000,   // 2
        volume24h: 5_000_000,     // 2
        volatility: 0.05,         // 1 (>0.04)
        liquidityRatio: 0.5,      // 0
      });
      expect(r.riskScore).toBe(5);
      expect(r.riskLevel).toBe('Medium');
    });

    test('Tepat batas Medium/High (score = 9)', () => {
      // 3 + 3 + 3 + 0 = 9
      const r = classifyAsset({
        marketCap: 50_000_000,   // 3
        volume24h: 500_000,       // 3
        volatility: 0.2,          // 3
        liquidityRatio: 0.5,      // 0
      });
      expect(r.riskScore).toBe(9);
      expect(r.riskLevel).toBe('High');
    });

    test('Skor minimum (semua large cap & stable) → Low score=0', () => {
      const r = classifyAsset({
        marketCap: 1e11,
        volume24h: 1e10,
        volatility: 0.02,
        liquidityRatio: 0.5,
      });
      expect(r.riskScore).toBe(0);
      expect(r.riskLevel).toBe('Low');
    });

    test('Breakdown harus berisi value, points, bucket per rule', () => {
      const r = classifyAsset({
        marketCap: 1e9,
        volume24h: 1e7,
        volatility: 0.05,
        liquidityRatio: 0.02,
      });
      expect(r.breakdown).toEqual({
        marketCap: { value: 1e9, points: expect.any(Number), bucket: expect.any(String) },
        volume24h: { value: 1e7, points: expect.any(Number), bucket: expect.any(String) },
        volatility: { value: 0.05, points: expect.any(Number), bucket: expect.any(String) },
        liquidityRatio: { value: 0.02, points: expect.any(Number), bucket: expect.any(String) },
      });
      // Total breakdown points harus sama dengan riskScore
      const sum = Object.values(r.breakdown).reduce((acc, x) => acc + x.points, 0);
      expect(sum).toBe(r.riskScore);
    });
  });

  // ============================================================
  // Validasi input
  // ============================================================
  describe('classifyAsset — input validation', () => {
    const valid = {
      marketCap: 1e9,
      volume24h: 1e7,
      volatility: 0.05,
      liquidityRatio: 0.02,
    };

    test.each([
      ['marketCap',      null],
      ['volume24h',      undefined],
      ['volatility',     'string-bukan-number'],
      ['liquidityRatio', NaN],
      ['marketCap',      -1],
      ['volatility',     Infinity],
      ['volume24h',      -1e6],
    ])('throws kalau %s = %p', (field, badValue) => {
      const input = { ...valid, [field]: badValue };
      expect(() => classifyAsset(input)).toThrow(new RegExp(field));
    });
  });
});

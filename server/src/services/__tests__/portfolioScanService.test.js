import {
  DEMO_COINS,
  DEMO_SCENARIOS,
  DEMO_TOTAL_USD,
  normalizeWeights,
  computeDemoBalances,
} from '../portfolioScanService.js';
import { calculateHHI, interpretHHI } from '../portfolioAnalyzer.js';

const EPS = 1e-9;

// Harga MOCK (bukan CoinGecko beneran) — nilainya bebas, yang penting > 0.
// Kelas HHI harus tetap sama berapa pun harganya, karena valueUsd = bobot×total.
const MOCK_PRICES = {
  bitcoin: 60000,
  ethereum: 3000,
  solana: 150,
  chainlink: 15,
  uniswap: 8,
  'jupiter-exchange-solana': 0.9,
  'shiba-inu': 0.000025,
  pepe: 0.0000012,
  bonk: 0.00002,
  dogwifcoin: 2.5,
};

// Helper: dari skenario → array valueUsd tiap aset (buat hitung HHI).
function scenarioValues(scenario, prices = MOCK_PRICES) {
  const weights = normalizeWeights(DEMO_COINS, DEMO_SCENARIOS[scenario]);
  const holdings = computeDemoBalances({
    coins: DEMO_COINS,
    weights,
    prices,
    totalUsd: DEMO_TOTAL_USD,
  });
  // valueUsd = balance × harga (persis kayak pipeline enrich)
  return holdings.map((h) => ({ valueUSD: h.balance * prices[h.coingeckoId] }));
}

describe('normalizeWeights', () => {
  test.each(['diversified', 'moderate', 'concentrated'])(
    'skenario %s → total bobot = 1 persis',
    (scenario) => {
      const w = normalizeWeights(DEMO_COINS, DEMO_SCENARIOS[scenario]);
      const total = Object.values(w).reduce((s, x) => s + x, 0);
      expect(total).toBeCloseTo(1, 12);
    }
  );

  test('koin terakhir nyerap sisa pembulatan (concentrated: WIF > 0.0333 mentah)', () => {
    const raw = DEMO_SCENARIOS.concentrated;
    const w = normalizeWeights(DEMO_COINS, raw);
    // dogwifcoin (koin terakhir) harus lebih besar dari nilai mentahnya karena
    // nyerap residu 8 koin lain yang di-hardcode 0.0333.
    expect(w.dogwifcoin).toBeGreaterThan(raw.dogwifcoin);
    expect(w.dogwifcoin).toBeCloseTo(1 - (0.7 + 8 * 0.0333), 12);
  });

  test('bobot koin non-terakhir tidak diubah', () => {
    const w = normalizeWeights(DEMO_COINS, DEMO_SCENARIOS.moderate);
    expect(w.bitcoin).toBeCloseTo(0.33, 12);
    expect(w.ethereum).toBeCloseTo(0.25, 12);
  });
});

describe('computeDemoBalances', () => {
  test('amount = (bobot × totalUsd) / harga', () => {
    const weights = normalizeWeights(DEMO_COINS, DEMO_SCENARIOS.diversified);
    const holdings = computeDemoBalances({
      coins: DEMO_COINS,
      weights,
      prices: MOCK_PRICES,
      totalUsd: DEMO_TOTAL_USD,
    });
    const btc = holdings.find((h) => h.coingeckoId === 'bitcoin');
    // 0.10 × 10.000 / 60.000 = 0.0166666...
    expect(btc.balance).toBeCloseTo((0.1 * DEMO_TOTAL_USD) / 60000, EPS);
    expect(btc.mint).toBe('bitcoin'); // resolveMap identity
  });

  test('valueUsd tiap aset = bobot × totalUsd (harga apapun)', () => {
    const weights = normalizeWeights(DEMO_COINS, DEMO_SCENARIOS.moderate);
    const holdings = computeDemoBalances({
      coins: DEMO_COINS,
      weights,
      prices: MOCK_PRICES,
      totalUsd: DEMO_TOTAL_USD,
    });
    for (const h of holdings) {
      const valueUsd = h.balance * MOCK_PRICES[h.coingeckoId];
      expect(valueUsd).toBeCloseTo(weights[h.coingeckoId] * DEMO_TOTAL_USD, 6);
    }
  });

  test('throws kalau harga tidak valid (≤ 0 / bukan number)', () => {
    const weights = normalizeWeights(DEMO_COINS, DEMO_SCENARIOS.diversified);
    const badPrices = { ...MOCK_PRICES, bitcoin: 0 };
    expect(() =>
      computeDemoBalances({ coins: DEMO_COINS, weights, prices: badPrices, totalUsd: DEMO_TOTAL_USD })
    ).toThrow(/tidak valid/);
  });
});

describe('kelas HHI per skenario (pakai harga mock)', () => {
  test('diversified → Terdiversifikasi (HHI ≈ 0.10, < 0.15)', () => {
    const hhi = calculateHHI(scenarioValues('diversified'));
    expect(hhi).toBeCloseTo(0.1, 3);
    expect(interpretHHI(hhi).label).toBe('Terdiversifikasi');
  });

  test('moderate → Moderat (0.15 ≤ HHI < 0.25)', () => {
    const hhi = calculateHHI(scenarioValues('moderate'));
    expect(hhi).toBeGreaterThanOrEqual(0.15);
    expect(hhi).toBeLessThan(0.25);
    expect(interpretHHI(hhi).label).toBe('Moderat');
  });

  test('concentrated → Terkonsentrasi (HHI ≈ 0.50, ≥ 0.25)', () => {
    const hhi = calculateHHI(scenarioValues('concentrated'));
    expect(hhi).toBeGreaterThanOrEqual(0.25);
    expect(hhi).toBeCloseTo(0.5, 2);
    expect(interpretHHI(hhi).label).toBe('Terkonsentrasi');
  });

  test('kelas HHI tidak berubah walau harga beda (uji ketahanan bobot)', () => {
    // Harga digeser drastis — kelas harus tetap sama.
    const skewedPrices = Object.fromEntries(
      Object.entries(MOCK_PRICES).map(([k, v]) => [k, v * (1 + Math.random() * 5)])
    );
    for (const [scenario, expected] of [
      ['diversified', 'Terdiversifikasi'],
      ['moderate', 'Moderat'],
      ['concentrated', 'Terkonsentrasi'],
    ]) {
      const hhi = calculateHHI(scenarioValues(scenario, skewedPrices));
      expect(interpretHHI(hhi).label).toBe(expected);
    }
  });
});

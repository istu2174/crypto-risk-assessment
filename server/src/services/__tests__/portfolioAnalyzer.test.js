import {
  calculateVolatility,
  calculateHHI,
  interpretHHI,
  CONCENTRATION_ENUM,
} from '../portfolioAnalyzer.js';

// Toleransi floating-point untuk perbandingan angka desimal
const EPS = 1e-9;

describe('calculateVolatility', () => {
  test('harga konstan → volatilitas 0', () => {
    expect(calculateVolatility([100, 100, 100, 100])).toBeCloseTo(0, 10);
  });

  test('dataset known: [100, 110, 100] → stdev populasi', () => {
    // returns: r1 = 0.1, r2 = -10/110 = -0.09090909...
    // mean   = (0.1 - 10/110) / 2 = 0.00454545...
    // Karena n=2, |dev1| = |dev2|, jadi stdev = |dev1| = 0.09545454545
    const result = calculateVolatility([100, 110, 100]);
    expect(result).toBeCloseTo(0.0954545454545, 9);
  });

  test('uptrend konsisten ~5% per hari → volatilitas mendekati 0 (return uniform)', () => {
    // Tiap step pertumbuhan multiplikatif konstan 1.05 ⇒ return per step persis sama
    // ⇒ deviasi dari mean = 0 ⇒ volatilitas = 0.
    const prices = [100, 105, 110.25, 115.7625, 121.550625];
    expect(calculateVolatility(prices)).toBeCloseTo(0, 10);
  });

  test('mixed returns: positif & negatif besar → volatilitas tinggi', () => {
    const prices = [100, 150, 80, 200, 60];
    const vol = calculateVolatility(prices);
    expect(vol).toBeGreaterThan(0.3); // sanity: > 30% stdev
  });

  test('2 harga (minimum input) → 1 return → stdev = 0', () => {
    // Karena cuma 1 return, mean = return itu sendiri, stdev = 0.
    expect(calculateVolatility([100, 120])).toBeCloseTo(0, 10);
  });

  // --- Validasi error ---
  test('throws kalau bukan array', () => {
    expect(() => calculateVolatility('bukan-array')).toThrow(/array/);
  });

  test('throws kalau array kurang dari 2', () => {
    expect(() => calculateVolatility([])).toThrow(/Minimum 2/);
    expect(() => calculateVolatility([100])).toThrow(/Minimum 2/);
  });

  test('throws kalau ada harga 0 atau negatif', () => {
    expect(() => calculateVolatility([100, 0, 50])).toThrow(/Harga harus > 0/);
    expect(() => calculateVolatility([-10, 100])).toThrow(/Harga harus > 0/);
  });

  test('throws kalau ada elemen non-number', () => {
    expect(() => calculateVolatility([100, '110', 120])).toThrow(/Harga tidak valid/);
    expect(() => calculateVolatility([100, NaN, 110])).toThrow(/Harga tidak valid/);
  });
});

describe('calculateHHI', () => {
  test('portfolio kosong → HHI 0', () => {
    expect(calculateHHI([])).toBe(0);
  });

  test('1 aset tunggal → HHI = 1 (konsentrasi maksimum)', () => {
    expect(calculateHHI([{ valueUSD: 1000 }])).toBeCloseTo(1, 10);
  });

  test('2 aset equal weight → HHI = 0.5', () => {
    expect(calculateHHI([
      { valueUSD: 1000 },
      { valueUSD: 1000 },
    ])).toBeCloseTo(0.5, 10);
  });

  test('4 aset equal weight → HHI = 0.25', () => {
    expect(calculateHHI([
      { valueUSD: 250 },
      { valueUSD: 250 },
      { valueUSD: 250 },
      { valueUSD: 250 },
    ])).toBeCloseTo(0.25, 10);
  });

  test('split 80/20 → HHI = 0.68', () => {
    // 0.8^2 + 0.2^2 = 0.64 + 0.04 = 0.68
    expect(calculateHHI([
      { valueUSD: 800 },
      { valueUSD: 200 },
    ])).toBeCloseTo(0.68, 10);
  });

  test('split 50/30/20 → HHI = 0.38', () => {
    // 0.25 + 0.09 + 0.04 = 0.38
    expect(calculateHHI([
      { valueUSD: 500 },
      { valueUSD: 300 },
      { valueUSD: 200 },
    ])).toBeCloseTo(0.38, 10);
  });

  test('total value 0 → HHI 0 (avoid division by zero)', () => {
    expect(calculateHHI([
      { valueUSD: 0 },
      { valueUSD: 0 },
    ])).toBe(0);
  });

  test('throws kalau bukan array', () => {
    expect(() => calculateHHI(null)).toThrow(/array/);
    expect(() => calculateHHI({})).toThrow(/array/);
  });

  test('throws kalau valueUSD negatif', () => {
    expect(() => calculateHHI([{ valueUSD: -100 }])).toThrow(/valueUSD tidak valid/);
  });

  test('throws kalau valueUSD non-number', () => {
    expect(() => calculateHHI([{ valueUSD: 'banyak' }])).toThrow(/valueUSD tidak valid/);
  });

  test('treats missing valueUSD as 0 (defensif)', () => {
    expect(calculateHHI([{ valueUSD: 1000 }, {}])).toBeCloseTo(1, 10);
  });
});

describe('interpretHHI', () => {
  // Kelas HHI pakai istilah konsentrasi, BUKAN Low/Medium/High (itu risiko aset).
  test.each([
    [0,    'Terdiversifikasi'],
    [0.05, 'Terdiversifikasi'],
    [0.14, 'Terdiversifikasi'],
    [0.15, 'Moderat'],          // tepat di batas Terdiversifikasi/Moderat
    [0.20, 'Moderat'],
    [0.24, 'Moderat'],
    [0.25, 'Terkonsentrasi'],   // tepat di batas Moderat/Terkonsentrasi
    [0.50, 'Terkonsentrasi'],
    [1.0,  'Terkonsentrasi'],
  ])('HHI=%f → %s', (hhi, expectedLabel) => {
    expect(interpretHHI(hhi).label).toBe(expectedLabel);
  });

  test('tidak mengembalikan istilah risiko (Low/Medium/High) sebagai label', () => {
    for (const hhi of [0.05, 0.2, 0.5]) {
      expect(['Low', 'Medium', 'High']).not.toContain(interpretHHI(hhi).label);
    }
  });

  test('throws kalau HHI di luar [0, 1]', () => {
    expect(() => interpretHHI(-0.1)).toThrow();
    expect(() => interpretHHI(1.5)).toThrow();
    expect(() => interpretHHI(NaN)).toThrow();
    expect(() => interpretHHI('0.5')).toThrow();
  });
});

describe('CONCENTRATION_ENUM', () => {
  test('memetakan tiap label kelas HHI ke enum kolom DB', () => {
    expect(CONCENTRATION_ENUM.Terdiversifikasi).toBe('LOW');
    expect(CONCENTRATION_ENUM.Moderat).toBe('MEDIUM');
    expect(CONCENTRATION_ENUM.Terkonsentrasi).toBe('HIGH');
  });

  test('setiap output interpretHHI punya mapping enum', () => {
    for (const hhi of [0.1, 0.2, 0.6]) {
      expect(CONCENTRATION_ENUM[interpretHHI(hhi).label]).toBeDefined();
    }
  });
});

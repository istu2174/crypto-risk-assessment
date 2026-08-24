/**
 * VALIDASI BASIS ATURAN — riskClassifier.js
 *
 * Berkas ini dibuat untuk menjawab dua pertanyaan penguji seminar hasil:
 *   (a) Apakah nilai variabel yang masuk ke sistem sudah benar?
 *   (b) Apakah setiap nilai ditempatkan pada kelas skor yang benar?
 *
 * PRINSIP PENTING:
 *   Spesifikasi ambang batas di bawah ditulis ULANG sebagai konstanta lokal,
 *   BUKAN diimpor dari kode sumber. Tujuannya supaya test membandingkan
 *   IMPLEMENTASI terhadap DOKUMEN SKRIPSI (Tabel 3.1 – 3.4), bukan kode
 *   terhadap dirinya sendiri (tautologi). Kalau kode sumber diubah, test
 *   ini harus gagal.
 *
 * Struktur:
 *   Uji 1 — Equivalence Partitioning (4 kelas per variabel)
 *   Uji 2 — Boundary Value Analysis (3 titik per ambang)
 *   Uji 3 — Property-based testing (100.000 masukan acak per variabel)
 *   Uji 4 — Penanganan masukan tidak valid
 */

import {
  scoreMarketCap,
  scoreVolume24h,
  scoreVolatility,
  scoreLiquidityRatio,
  determineRiskLevel,
  classifyAsset,
} from '../riskClassifier.js';

// ============================================================
// SPESIFIKASI DARI DOKUMEN SKRIPSI (ditulis ulang, tidak diimpor)
// ============================================================

/**
 * direction:
 *   'lower-is-riskier' → operator '<'. Nilai TEPAT di ambang masuk bucket
 *                        dengan skor LEBIH RENDAH.
 *   'higher-is-riskier'→ operator '>'. Nilai TEPAT di ambang masuk bucket
 *                        dengan skor LEBIH RENDAH juga (karena strict '>').
 */
const SPEC = {
  marketCap: {
    label: 'Market Cap',
    fn: scoreMarketCap,
    thresholds: [1e8, 1e9, 1e10], // Tabel 3.1
    direction: 'lower-is-riskier',
    // Nilai wakil per kelas ekuivalen → skor 3, 2, 1, 0
    representatives: [
      { value: 5e7, expected: 3 }, // < $100M         → Micro Cap
      { value: 5e8, expected: 2 }, // $100M – $1B     → Small Cap
      { value: 5e9, expected: 1 }, // $1B – $10B      → Mid Cap
      { value: 5e10, expected: 0 }, // >= $10B        → Large Cap
    ],
    // Rentang sampling untuk property-based test
    sampleMax: 5e12,
  },
  volume24h: {
    label: 'Volume 24 Jam',
    fn: scoreVolume24h,
    thresholds: [1e6, 1e7, 1e8], // Tabel 3.2
    direction: 'lower-is-riskier',
    representatives: [
      { value: 5e5, expected: 3 }, // < $1M
      { value: 5e6, expected: 2 }, // $1M – $10M
      { value: 5e7, expected: 1 }, // $10M – $100M
      { value: 5e8, expected: 0 }, // >= $100M
    ],
    sampleMax: 5e10,
  },
  volatility: {
    label: 'Volatilitas 30 Hari',
    fn: scoreVolatility,
    thresholds: [0.04, 0.08, 0.15], // Tabel 3.3
    direction: 'higher-is-riskier',
    representatives: [
      { value: 0.02, expected: 0 }, // <= 4%
      { value: 0.06, expected: 1 }, // 4% – 8%
      { value: 0.11, expected: 2 }, // 8% – 15%
      { value: 0.3, expected: 3 }, // > 15%
    ],
    sampleMax: 2.0,
  },
  liquidityRatio: {
    label: 'Rasio Likuiditas',
    fn: scoreLiquidityRatio,
    thresholds: [0.01, 0.05, 0.1], // Tabel 3.4
    direction: 'lower-is-riskier',
    representatives: [
      { value: 0.005, expected: 3 }, // < 1%
      { value: 0.03, expected: 2 }, // 1% – 5%
      { value: 0.07, expected: 1 }, // 5% – 10%
      { value: 0.5, expected: 0 }, // >= 10%
    ],
    sampleMax: 5.0,
  },
};

const VARIABLES = Object.keys(SPEC);

/**
 * Skor yang DIHARAPKAN menurut dokumen skripsi — implementasi acuan
 * (oracle) yang ditulis independen dari kode sumber.
 */
function expectedScore(spec, value) {
  const [t1, t2, t3] = spec.thresholds;
  if (spec.direction === 'lower-is-riskier') {
    if (value < t1) return 3;
    if (value < t2) return 2;
    if (value < t3) return 1;
    return 0;
  }
  // higher-is-riskier (operator '>')
  if (value > t3) return 3;
  if (value > t2) return 2;
  if (value > t1) return 1;
  return 0;
}

// ============================================================
// UJI 1 — EQUIVALENCE PARTITIONING
// Satu nilai wakil per kelas ekuivalen, 4 kelas per variabel.
// ============================================================

describe('UJI 1 — Equivalence Partitioning', () => {
  describe.each(VARIABLES)('%s', (key) => {
    const spec = SPEC[key];

    test.each(spec.representatives.map((r) => [r.value, r.expected]))(
      `${spec.label}: nilai %p menghasilkan skor %p`,
      (value, expected) => {
        const result = spec.fn(value);
        expect(result.points).toBe(expected);
        expect(typeof result.bucket).toBe('string');
        expect(result.bucket.length).toBeGreaterThan(0);
      },
    );

    test(`${spec.label}: keempat skor 0, 1, 2, 3 semuanya tercapai`, () => {
      const achieved = spec.representatives
        .map((r) => spec.fn(r.value).points)
        .sort((a, b) => a - b);
      expect(achieved).toEqual([0, 1, 2, 3]);
    });

    test(`${spec.label}: keempat kelas menghasilkan bucket yang berbeda-beda`, () => {
      const buckets = spec.representatives.map((r) => spec.fn(r.value).bucket);
      expect(new Set(buckets).size).toBe(4);
    });
  });

  test('determineRiskLevel: ketiga level Low, Medium, High semuanya tercapai', () => {
    // Batas menurut dokumen: >= 9 High, >= 5 Medium, sisanya Low
    expect(determineRiskLevel(0)).toBe('Low');
    expect(determineRiskLevel(4)).toBe('Low');
    expect(determineRiskLevel(5)).toBe('Medium');
    expect(determineRiskLevel(8)).toBe('Medium');
    expect(determineRiskLevel(9)).toBe('High');
    expect(determineRiskLevel(12)).toBe('High');
  });
});

// ============================================================
// UJI 2 — BOUNDARY VALUE ANALYSIS
// Tiap ambang diuji pada 3 titik: tepat di bawah, tepat di ambang,
// tepat di atas. Memakai Math.nextafter-equivalent supaya benar-benar
// "tepat" di level presisi floating point.
// ============================================================

/** Nilai floating-point terdekat di bawah x (setara Math.nextafter(x, -Inf)). */
function justBelow(x) {
  const buf = new Float64Array(1);
  const bits = new BigInt64Array(buf.buffer);
  buf[0] = x;
  bits[0] = x > 0 ? bits[0] - 1n : bits[0] + 1n;
  return buf[0];
}

/** Nilai floating-point terdekat di atas x (setara Math.nextafter(x, +Inf)). */
function justAbove(x) {
  const buf = new Float64Array(1);
  const bits = new BigInt64Array(buf.buffer);
  buf[0] = x;
  bits[0] = x >= 0 ? bits[0] + 1n : bits[0] - 1n;
  return buf[0];
}

describe('UJI 2 — Boundary Value Analysis', () => {
  describe.each(VARIABLES)('%s', (key) => {
    const spec = SPEC[key];

    spec.thresholds.forEach((t, idx) => {
      describe(`${spec.label} — ambang ke-${idx + 1} = ${t}`, () => {
        test('tepat di bawah ambang sesuai dokumen', () => {
          const v = justBelow(t);
          expect(spec.fn(v).points).toBe(expectedScore(spec, v));
        });

        test('tepat DI ambang sesuai dokumen (semantik operator)', () => {
          expect(spec.fn(t).points).toBe(expectedScore(spec, t));
        });

        test('tepat di atas ambang sesuai dokumen', () => {
          const v = justAbove(t);
          expect(spec.fn(v).points).toBe(expectedScore(spec, v));
        });

        test('skor benar-benar BERUBAH tepat di titik ambang ini', () => {
          const below = spec.fn(justBelow(t)).points;
          const above = spec.fn(justAbove(t)).points;
          expect(below).not.toBe(above);
        });

        test('semantik operator sesuai arah variabel', () => {
          const atThreshold = spec.fn(t).points;
          const below = spec.fn(justBelow(t)).points;
          const above = spec.fn(justAbove(t)).points;

          if (spec.direction === 'lower-is-riskier') {
            // Operator '<' : nilai TEPAT di ambang ikut sisi ATAS
            // (bucket skor lebih rendah).
            expect(atThreshold).toBe(above);
            expect(atThreshold).not.toBe(below);
            expect(below).toBeGreaterThan(above);
          } else {
            // Operator '>' : nilai TEPAT di ambang ikut sisi BAWAH
            // (bucket skor lebih rendah juga).
            expect(atThreshold).toBe(below);
            expect(atThreshold).not.toBe(above);
            expect(above).toBeGreaterThan(below);
          }
        });
      });
    });
  });

  describe('determineRiskLevel — batas skor akhir', () => {
    test.each([
      [4, 'Low'],
      [5, 'Medium'],
      [8, 'Medium'],
      [9, 'High'],
    ])('skor %p menghasilkan level %p', (score, level) => {
      expect(determineRiskLevel(score)).toBe(level);
    });

    test('perpindahan level terjadi tepat di skor 5 dan 9', () => {
      expect(determineRiskLevel(4)).not.toBe(determineRiskLevel(5));
      expect(determineRiskLevel(8)).not.toBe(determineRiskLevel(9));
    });
  });
});

// ============================================================
// UJI 3 — PROPERTY-BASED TESTING
// 100.000 masukan acak per variabel, campuran uniform & log-uniform
// supaya rentang kecil (mis. rasio likuiditas < 1%) ikut terwakili padat.
// ============================================================

const N_SAMPLES = 100_000;

/**
 * PRNG deterministik (mulberry32) supaya hasil test bisa direproduksi
 * oleh penguji. Seed tetap = 20260812.
 */
function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Bangkitkan N sampel: campuran uniform, log-uniform, dan nilai di sekitar
 * ambang (near-threshold) supaya batas benar-benar terprobing padat.
 */
function generateSamples(spec, n, rng) {
  const samples = new Array(n);
  const minLog = Math.log10(spec.thresholds[0]) - 3; // 3 dekade di bawah ambang terkecil
  const maxLog = Math.log10(spec.sampleMax);

  for (let i = 0; i < n; i++) {
    const mode = i % 3;
    if (mode === 0) {
      // Uniform di seluruh rentang
      samples[i] = rng() * spec.sampleMax;
    } else if (mode === 1) {
      // Log-uniform → rentang kecil terwakili padat
      samples[i] = 10 ** (minLog + rng() * (maxLog - minLog));
    } else {
      // Near-threshold: jitter +/- 10% di sekitar salah satu ambang
      const t = spec.thresholds[i % spec.thresholds.length];
      samples[i] = t * (0.9 + rng() * 0.2);
    }
  }
  return samples;
}

describe('UJI 3 — Property-based testing (100.000 masukan acak per variabel)', () => {
  describe.each(VARIABLES)('%s', (key) => {
    const spec = SPEC[key];
    const rng = makeRng(20260812);
    const samples = generateSamples(spec, N_SAMPLES, rng);

    test(`jumlah masukan uji tepat ${N_SAMPLES.toLocaleString('id-ID')}`, () => {
      expect(samples).toHaveLength(N_SAMPLES);
      expect(samples.every((v) => Number.isFinite(v) && v >= 0)).toBe(true);
    });

    // --- PROPERTI 1: eksaustif dan eksklusif mutual ---
    test('Properti 1 — setiap masukan valid menghasilkan tepat satu skor bulat 0..3 dengan bucket string tidak kosong', () => {
      const seenScores = new Set();
      let violations = 0;
      let firstViolation = null;

      for (const v of samples) {
        const r = spec.fn(v);
        const ok =
          r !== null &&
          typeof r === 'object' &&
          Number.isInteger(r.points) &&
          r.points >= 0 &&
          r.points <= 3 &&
          typeof r.bucket === 'string' &&
          r.bucket.length > 0;

        if (!ok) {
          violations++;
          if (firstViolation === null) firstViolation = { v, r };
        } else {
          seenScores.add(r.points);
        }
      }

      expect({ violations, firstViolation }).toEqual({
        violations: 0,
        firstViolation: null,
      });
      // Eksaustif: keempat skor terpakai pada populasi sampel
      expect([...seenScores].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
    });

    // --- PROPERTI 2: monotonisitas ---
    test('Properti 2 — skor tidak pernah bergerak melawan arah risiko variabel', () => {
      const sorted = [...samples].sort((a, b) => a - b);
      let violations = 0;
      let firstViolation = null;

      for (let i = 1; i < sorted.length; i++) {
        const prev = spec.fn(sorted[i - 1]).points;
        const curr = spec.fn(sorted[i]).points;

        // lower-is-riskier → nilai naik, skor harus turun atau tetap
        // higher-is-riskier → nilai naik, skor harus naik atau tetap
        const bad =
          spec.direction === 'lower-is-riskier' ? curr > prev : curr < prev;

        if (bad) {
          violations++;
          if (firstViolation === null) {
            firstViolation = {
              from: sorted[i - 1],
              to: sorted[i],
              scoreFrom: prev,
              scoreTo: curr,
            };
          }
        }
      }

      expect({ violations, firstViolation }).toEqual({
        violations: 0,
        firstViolation: null,
      });
    });

    // --- PROPERTI 3: tidak ada ambang tersembunyi ---
    test('Properti 3 — perpindahan skor HANYA terjadi pada tiga ambang yang ditetapkan', () => {
      const sorted = [...samples].sort((a, b) => a - b);
      const unexpectedTransitions = [];

      for (let i = 1; i < sorted.length; i++) {
        const lo = sorted[i - 1];
        const hi = sorted[i];
        if (spec.fn(lo).points === spec.fn(hi).points) continue;

        // Ada perpindahan di antara lo dan hi → harus ada ambang resmi
        // yang terletak di dalam interval (lo, hi].
        const containsThreshold = spec.thresholds.some(
          (t) => t > lo && t <= hi,
        );
        if (!containsThreshold) {
          unexpectedTransitions.push({
            lo,
            hi,
            scoreLo: spec.fn(lo).points,
            scoreHi: spec.fn(hi).points,
          });
        }
      }

      expect(unexpectedTransitions.slice(0, 5)).toEqual([]);
      expect(unexpectedTransitions).toHaveLength(0);
    });

    // --- PROPERTI 3b: ketiga ambang terbukti aktif ---
    test('Properti 3b — ketiga ambang yang ditetapkan semuanya terbukti aktif dan terdeteksi', () => {
      const activeThresholds = spec.thresholds.filter((t) => {
        const below = spec.fn(justBelow(t)).points;
        const above = spec.fn(justAbove(t)).points;
        return below !== above;
      });
      expect(activeThresholds).toEqual(spec.thresholds);

      // Selain aktif, tiap ambang harus benar-benar terdeteksi dari data
      // sampel: ada pasangan berurutan yang menyeberanginya.
      const sorted = [...samples].sort((a, b) => a - b);
      const detected = new Set();
      for (let i = 1; i < sorted.length; i++) {
        if (spec.fn(sorted[i - 1]).points === spec.fn(sorted[i]).points) continue;
        for (const t of spec.thresholds) {
          if (t > sorted[i - 1] && t <= sorted[i]) detected.add(t);
        }
      }
      expect([...detected].sort((a, b) => a - b)).toEqual(spec.thresholds);
    });

    // --- Konsistensi terhadap oracle dokumen ---
    test('Seluruh masukan uji cocok dengan skor acuan menurut dokumen skripsi', () => {
      let mismatches = 0;
      let firstMismatch = null;
      for (const v of samples) {
        const actual = spec.fn(v).points;
        const expectedVal = expectedScore(spec, v);
        if (actual !== expectedVal) {
          mismatches++;
          if (firstMismatch === null) {
            firstMismatch = { value: v, actual, expected: expectedVal };
          }
        }
      }
      expect({ mismatches, firstMismatch }).toEqual({
        mismatches: 0,
        firstMismatch: null,
      });
    });
  });
});

// ============================================================
// UJI 4 — PENANGANAN MASUKAN TIDAK VALID
// Fungsi harus melempar error; kalau tidak melempar, tidak boleh
// mengembalikan skor bulat yang tampak valid.
// ============================================================

const INVALID_INPUTS = [
  ['null', null],
  ['undefined', undefined],
  ['NaN', NaN],
  ['string', 'seratus juta'],
  ['objek', { value: 1e9 }],
];

describe('UJI 4 — Penanganan masukan tidak valid', () => {
  describe.each(VARIABLES)('%s', (key) => {
    const spec = SPEC[key];

    test.each(INVALID_INPUTS)(
      `${spec.label}: masukan %s ditolak atau tidak menghasilkan skor yang tampak valid`,
      (_label, badValue) => {
        let threw = false;
        let result;
        try {
          result = spec.fn(badValue);
        } catch {
          threw = true;
        }

        if (threw) {
          expect(threw).toBe(true);
          return;
        }

        // Tidak melempar → hasilnya TIDAK BOLEH tampak seperti skor valid.
        const looksValid =
          result !== null &&
          typeof result === 'object' &&
          Number.isInteger(result.points) &&
          result.points >= 0 &&
          result.points <= 3;

        expect({
          variabel: key,
          masukan: String(badValue),
          skorDikembalikan: result?.points,
          bucketDikembalikan: result?.bucket,
          looksValid,
        }).toMatchObject({ looksValid: false });
      },
    );
  });

  describe('classifyAsset — validasi input terpadu (assertNonNegativeNumber)', () => {
    const validInput = {
      marketCap: 1e9,
      volume24h: 1e7,
      volatility: 0.05,
      liquidityRatio: 0.02,
    };

    test('masukan valid tidak melempar error', () => {
      expect(() => classifyAsset(validInput)).not.toThrow();
    });

    test.each(
      ['marketCap', 'volume24h', 'volatility', 'liquidityRatio'].flatMap((field) =>
        INVALID_INPUTS.map(([label, bad]) => [field, label, bad]),
      ),
    )('field %s dengan masukan %s melempar error', (field, _label, badValue) => {
      expect(() =>
        classifyAsset({ ...validInput, [field]: badValue }),
      ).toThrow();
    });

    test.each(['marketCap', 'volume24h', 'volatility', 'liquidityRatio'])(
      'field %s dengan nilai negatif melempar error',
      (field) => {
        expect(() => classifyAsset({ ...validInput, [field]: -1 })).toThrow();
      },
    );

    test.each(['marketCap', 'volume24h', 'volatility', 'liquidityRatio'])(
      'field %s dengan Infinity melempar error',
      (field) => {
        expect(() =>
          classifyAsset({ ...validInput, [field]: Infinity }),
        ).toThrow();
      },
    );
  });
});

/**
 * Portfolio Analyzer
 *
 * Berisi 2 metrik utama:
 *   1. calculateVolatility — standar deviasi return harian
 *   2. calculateHHI        — Herfindahl-Hirschman Index (konsentrasi portofolio)
 *
 * Referensi: Skripsi BAB 3 — "Perancangan Sistem".
 */

// ============================================================
// 1. Volatility — stdev dari daily returns
// ============================================================

/**
 * Hitung volatilitas (standar deviasi populasi) dari array harga harian.
 *
 *   1. Ubah harga jadi return harian: r_t = (P_t - P_{t-1}) / P_{t-1}
 *   2. Hitung mean & variance (populasi, bukan sample → bagi N bukan N-1).
 *   3. Volatilitas = sqrt(variance).
 *
 * @param {number[]} prices  - Array harga (urutan kronologis lama → baru). Minimal 2 elemen.
 * @returns {number}         - Volatilitas dalam desimal (0.05 = 5%).
 */
export function calculateVolatility(prices) {
  if (!Array.isArray(prices)) {
    throw new Error("Parameter 'prices' harus berupa array.");
  }
  if (prices.length < 2) {
    throw new Error('Minimum 2 harga dibutuhkan untuk menghitung volatilitas.');
  }

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const curr = prices[i];
    if (
      typeof prev !== 'number' ||
      typeof curr !== 'number' ||
      !Number.isFinite(prev) ||
      !Number.isFinite(curr)
    ) {
      throw new Error(`Harga tidak valid di index ${i - 1} atau ${i}.`);
    }
    if (prev <= 0) {
      throw new Error(`Harga harus > 0. Ditemukan ${prev} di index ${i - 1}.`);
    }
    returns.push((curr - prev) / prev);
  }

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

// ============================================================
// 2. HHI — Herfindahl-Hirschman Index
// ============================================================

/**
 * Hitung HHI dari portofolio.
 *
 *   HHI = Σ (weight_i)^2,  weight_i = valueUSD_i / total_value
 *
 * Range: 0 (terdiversifikasi sempurna) sampai 1 (1 aset tunggal).
 *
 * @param {{valueUSD: number}[]} holdings - Array holdings, tiap item butuh field valueUSD.
 * @returns {number}                       - HHI value (0..1).
 */
export function calculateHHI(holdings) {
  if (!Array.isArray(holdings)) {
    throw new Error("Parameter 'holdings' harus berupa array.");
  }
  if (holdings.length === 0) return 0;

  const total = holdings.reduce((sum, h) => {
    const v = h?.valueUSD ?? 0;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
      throw new Error(`valueUSD tidak valid pada holding: ${JSON.stringify(h)}`);
    }
    return sum + v;
  }, 0);

  if (total === 0) return 0;

  return holdings.reduce((sum, h) => {
    const weight = (h.valueUSD ?? 0) / total;
    return sum + weight * weight;
  }, 0);
}

/**
 * Pemetaan LABEL kelas HHI → kode enum kolom DB `ConcentrationLevel`.
 * Enum DB (LOW/MEDIUM/HIGH) cuma kode storage internal — BUKAN yang ditampilkan
 * ke user. Yang dipakai di response API & UI selalu label-nya.
 */
export const CONCENTRATION_ENUM = {
  Terdiversifikasi: 'LOW',
  Moderat: 'MEDIUM',
  Terkonsentrasi: 'HIGH',
};

/**
 * Interpretasi kelas konsentrasi dari nilai HHI.
 *
 * Kelas HHI SENGAJA pakai istilah konsentrasi (Terdiversifikasi / Moderat /
 * Terkonsentrasi), BUKAN Low/Medium/High. Low/Medium/High itu istilah buat
 * risiko per aset (RiskLevel) — konsep beda, jangan dicampur.
 *
 * Threshold (sesuai CLAUDE.md):
 *   HHI < 0.15         → Terdiversifikasi
 *   0.15 <= HHI < 0.25 → Moderat
 *   HHI >= 0.25        → Terkonsentrasi
 *
 * @returns {{ label: 'Terdiversifikasi' | 'Moderat' | 'Terkonsentrasi' }}
 */
export function interpretHHI(hhi) {
  if (typeof hhi !== 'number' || !Number.isFinite(hhi) || hhi < 0 || hhi > 1) {
    throw new Error(`HHI harus angka antara 0 dan 1. Diterima: ${hhi}`);
  }
  if (hhi >= 0.25) {
    return { label: 'Terkonsentrasi' };
  }
  if (hhi >= 0.15) {
    return { label: 'Moderat' };
  }
  return { label: 'Terdiversifikasi' };
}

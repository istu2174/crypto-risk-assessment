import { computeBtcSats } from '../blockstreamService.js';

// ============================================================
describe('computeBtcSats', () => {
  test('balance = funded - spent (chain only)', () => {
    const data = {
      chain_stats: { funded_txo_sum: 150000000, spent_txo_sum: 50000000 },
      mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0 },
    };
    // 150000000 - 50000000 = 100000000 sats = 1 BTC
    expect(computeBtcSats(data)).toBe(100000000);
  });

  test('ikut hitung delta mempool (tx belum confirm)', () => {
    const data = {
      chain_stats: { funded_txo_sum: 100000000, spent_txo_sum: 0 },
      mempool_stats: { funded_txo_sum: 50000000, spent_txo_sum: 20000000 },
    };
    // chain 100000000 + mempool (50000000 - 20000000) = 130000000
    expect(computeBtcSats(data)).toBe(130000000);
  });

  test('field hilang → dianggap 0 (gak NaN)', () => {
    expect(computeBtcSats({})).toBe(0);
    expect(computeBtcSats({ chain_stats: { funded_txo_sum: 5000 } })).toBe(5000);
  });

  test('address kosong (belum pernah ada tx) → 0', () => {
    const data = {
      chain_stats: { funded_txo_sum: 0, spent_txo_sum: 0 },
      mempool_stats: { funded_txo_sum: 0, spent_txo_sum: 0 },
    };
    expect(computeBtcSats(data)).toBe(0);
  });
});

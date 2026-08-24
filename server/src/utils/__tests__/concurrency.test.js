import { mapSettledWithConcurrency } from '../concurrency.js';

const tick = () => new Promise((r) => setTimeout(r, 5));

describe('mapSettledWithConcurrency', () => {
  test('hasil urut sesuai input', async () => {
    const items = [1, 2, 3, 4];
    const out = await mapSettledWithConcurrency(items, 2, async (n) => n * 10);
    expect(out.map((r) => r.value)).toEqual([10, 20, 30, 40]);
    expect(out.every((r) => r.status === 'fulfilled')).toBe(true);
  });

  test('semantik allSettled: 1 item reject gak ngebunuh yang lain', async () => {
    const items = [1, 2, 3];
    const out = await mapSettledWithConcurrency(items, 2, async (n) => {
      if (n === 2) throw new Error('gagal di 2');
      return n;
    });
    expect(out[0]).toEqual({ status: 'fulfilled', value: 1 });
    expect(out[1].status).toBe('rejected');
    expect(out[1].reason.message).toBe('gagal di 2');
    expect(out[2]).toEqual({ status: 'fulfilled', value: 3 });
  });

  test('gak pernah ngelewatin batas konkurensi', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const items = Array.from({ length: 10 }, (_, i) => i);

    await mapSettledWithConcurrency(items, 3, async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await tick();
      inFlight -= 1;
    });

    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  test('array kosong → hasil kosong, gak error', async () => {
    const out = await mapSettledWithConcurrency([], 3, async (x) => x);
    expect(out).toEqual([]);
  });

  test('limit lebih besar dari jumlah item tetap aman', async () => {
    const out = await mapSettledWithConcurrency([1, 2], 99, async (n) => n);
    expect(out.map((r) => r.value)).toEqual([1, 2]);
  });
});

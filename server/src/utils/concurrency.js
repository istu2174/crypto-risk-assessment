/**
 * Concurrency helper — jalanin async fn atas banyak item TAPI batasi berapa
 * yang jalan barengan (worker pool).
 *
 * Kenapa perlu:
 *   Saat scan portfolio, tiap aset butuh 2 call CoinGecko. Kalau wallet punya
 *   banyak aset dan kita `Promise.all` semua sekaligus, bisa burst & kena
 *   rate limit (429). Batasi konkurensi = nembak API lebih sopan.
 *
 * Semantik mirip Promise.allSettled: 1 item gagal gak ngebunuh yang lain.
 * Hasil dikembalikan URUT sesuai input, tiap elemen { status, value|reason }.
 *
 * @param {Array} items          - data yang mau diproses
 * @param {number} limit         - max worker barengan (>=1)
 * @param {(item, index) => Promise} fn
 * @returns {Promise<Array<{status:'fulfilled', value} | {status:'rejected', reason}>>}
 */
export async function mapSettledWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  const max = Math.max(1, Math.min(limit, items.length || 1));
  let cursor = 0;

  // Tiap worker ngambil index berikutnya sampai habis (shared cursor).
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = { status: 'fulfilled', value: await fn(items[index], index) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(Array.from({ length: max }, () => worker()));
  return results;
}

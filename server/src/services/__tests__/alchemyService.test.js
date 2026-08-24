import {
  hexToTokenAmount,
  normalizeNativeEth,
  NATIVE_ETH_MINT,
} from '../alchemyService.js';

// ============================================================
describe('hexToTokenAmount', () => {
  test('hex wei → ETH (18 desimal)', () => {
    // 1 ETH = 1e18 wei = 0xde0b6b3a7640000
    expect(hexToTokenAmount('0xde0b6b3a7640000', 18)).toBe(1);
  });

  test('hex dengan desimal token lain (USDC 6 desimal)', () => {
    // 1000000 (raw) / 10^6 = 1 USDC. 1000000 = 0xf4240
    expect(hexToTokenAmount('0xf4240', 6)).toBe(1);
  });

  test('balance 0 dalam berbagai bentuk → 0', () => {
    expect(hexToTokenAmount('0x0', 18)).toBe(0);
    expect(hexToTokenAmount('0x', 18)).toBe(0);
    expect(hexToTokenAmount(null, 18)).toBe(0);
    expect(hexToTokenAmount(undefined, 18)).toBe(0);
  });

  test('angka besar tetep di-handle (BigInt) tanpa error', () => {
    // 1000 ETH
    const thousandEthWei = '0x3635c9adc5dea00000'; // 1000 * 1e18
    expect(hexToTokenAmount(thousandEthWei, 18)).toBe(1000);
  });
});

// ============================================================
describe('normalizeNativeEth', () => {
  test('balance > 0 → objek holding ETH dengan sentinel mint', () => {
    const result = normalizeNativeEth('0xde0b6b3a7640000'); // 1 ETH
    expect(result).toMatchObject({
      mint: NATIVE_ETH_MINT,
      symbol: 'ETH',
      name: 'Ethereum',
      balance: 1,
      decimals: 18,
    });
  });

  test('balance 0 → null (gak masuk holdings)', () => {
    expect(normalizeNativeEth('0x0')).toBeNull();
    expect(normalizeNativeEth('0x')).toBeNull();
  });

  test('priceUsd/valueUsd null (harga authoritative dari CoinGecko)', () => {
    const result = normalizeNativeEth('0xde0b6b3a7640000');
    expect(result.priceUsd).toBeNull();
    expect(result.valueUsd).toBeNull();
  });
});

import {
  normalizeFungibleItem,
  normalizeNativeSol,
} from '../heliusService.js';

// Fixture sample dari shape response DAS Helius (disederhanain).
// Reference: https://docs.helius.dev/compression-and-das-api/digital-asset-standard-das-api/get-assets-by-owner

const usdcFungible = {
  interface: 'FungibleToken',
  id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // mint USDC
  content: {
    metadata: { name: 'USD Coin', symbol: 'USDC' },
  },
  token_info: {
    balance: 1500000000, // raw, decimals 6 → 1500 USDC
    decimals: 6,
    symbol: 'USDC',
    price_info: {
      price_per_token: 1.0,
      total_price: 1500.0,
      currency: 'USDC',
    },
  },
};

const bonkFungibleAsset = {
  // Some tokens use 'FungibleAsset' interface (e.g. compressed)
  interface: 'FungibleAsset',
  id: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  content: {
    metadata: { name: 'Bonk', symbol: 'Bonk' },
  },
  token_info: {
    balance: 1000000000000, // 10000 BONK (decimals 5)
    decimals: 5,
    symbol: 'Bonk',
    price_info: {
      price_per_token: 0.00002,
      total_price: 0.2,
    },
  },
};

const nftItem = {
  interface: 'V1_NFT',
  id: 'NFTmintAddress...',
  content: { metadata: { name: 'Cool NFT' } },
  token_info: { balance: 1, decimals: 0 },
};

// ============================================================
describe('normalizeFungibleItem', () => {
  test('FungibleToken dengan semua field → normalized lengkap', () => {
    const result = normalizeFungibleItem(usdcFungible);
    expect(result).toEqual({
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      name: 'USD Coin',
      balance: 1500, // 1.5e9 / 10^6
      decimals: 6,
      priceUsd: 1.0,
      valueUsd: 1500.0,
    });
  });

  test('FungibleAsset interface juga di-normalize', () => {
    const result = normalizeFungibleItem(bonkFungibleAsset);
    expect(result).not.toBeNull();
    expect(result.symbol).toBe('Bonk');
    expect(result.balance).toBeCloseTo(10000000, 5); // 1e12 / 10^5
  });

  test('NFT (interface V1_NFT) → return null (di-skip)', () => {
    expect(normalizeFungibleItem(nftItem)).toBeNull();
  });

  test('Token dengan balance 0 → return null', () => {
    const zero = {
      ...usdcFungible,
      token_info: { ...usdcFungible.token_info, balance: 0 },
    };
    expect(normalizeFungibleItem(zero)).toBeNull();
  });

  test('Token tanpa price_info → priceUsd & valueUsd null (gak crash)', () => {
    const noPrice = {
      ...usdcFungible,
      token_info: {
        balance: 1500000000,
        decimals: 6,
        symbol: 'USDC',
      },
    };
    const result = normalizeFungibleItem(noPrice);
    expect(result.balance).toBe(1500);
    expect(result.priceUsd).toBeNull();
    expect(result.valueUsd).toBeNull();
  });

  test('Symbol fallback: token_info.symbol kosong → content.metadata.symbol', () => {
    const noTokenSymbol = {
      interface: 'FungibleToken',
      id: 'someMint',
      content: { metadata: { name: 'Foo', symbol: 'FOO' } },
      token_info: { balance: 100, decimals: 0 },
    };
    expect(normalizeFungibleItem(noTokenSymbol).symbol).toBe('FOO');
  });

  test('Symbol benar-benar gak ada → fallback "UNKNOWN"', () => {
    const noSymbolAtAll = {
      interface: 'FungibleToken',
      id: 'someMint',
      content: { metadata: {} },
      token_info: { balance: 100, decimals: 0 },
    };
    expect(normalizeFungibleItem(noSymbolAtAll).symbol).toBe('UNKNOWN');
  });

  test('Decimals 0 (token integer murni) → balance gak di-divide', () => {
    const intToken = {
      interface: 'FungibleToken',
      id: 'mint',
      content: { metadata: { name: 'IntToken', symbol: 'INT' } },
      token_info: { balance: 42, decimals: 0 },
    };
    expect(normalizeFungibleItem(intToken).balance).toBe(42);
  });
});

// ============================================================
describe('normalizeNativeSol', () => {
  test('nativeBalance lengkap → SOL holding object dengan konversi lamports', () => {
    const result = normalizeNativeSol({
      lamports: 2500000000, // 2.5 SOL
      price_per_sol: 140.5,
      total_price: 351.25,
    });

    expect(result).toEqual({
      mint: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      name: 'Solana',
      balance: 2.5,
      decimals: 9,
      priceUsd: 140.5,
      valueUsd: 351.25,
    });
  });

  test('nativeBalance null → return null', () => {
    expect(normalizeNativeSol(null)).toBeNull();
    expect(normalizeNativeSol(undefined)).toBeNull();
  });

  test('lamports = 0 → return null (wallet kosong)', () => {
    expect(normalizeNativeSol({ lamports: 0 })).toBeNull();
  });

  test('lamports ada tapi gak ada price → priceUsd & valueUsd null', () => {
    const result = normalizeNativeSol({ lamports: 1000000000 });
    expect(result.balance).toBe(1);
    expect(result.priceUsd).toBeNull();
    expect(result.valueUsd).toBeNull();
  });

  test('1 lamport (dust) → balance = 1e-9, gak di-skip', () => {
    const result = normalizeNativeSol({ lamports: 1 });
    expect(result.balance).toBe(1e-9);
  });
});

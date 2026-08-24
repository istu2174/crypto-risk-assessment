import { buildSolanaMintMap, buildEthContractMap, _internal } from '../coinResolver.js';

const { NATIVE_SOL_MINT, NATIVE_ETH_MINT } = _internal;

// Sample CoinGecko /coins/list?include_platform=true (minimal shape)
const sampleCoinList = [
  {
    id: 'usd-coin',
    symbol: 'usdc',
    name: 'USD Coin',
    platforms: {
      ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      solana: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    },
  },
  {
    id: 'tether',
    symbol: 'usdt',
    name: 'Tether',
    platforms: {
      ethereum: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      solana: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    },
  },
  {
    id: 'bonk',
    symbol: 'bonk',
    name: 'Bonk',
    platforms: { solana: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  },
  {
    id: 'ethereum',
    symbol: 'eth',
    name: 'Ethereum',
    platforms: { ethereum: '' }, // gak ada di Solana — harus di-skip
  },
  {
    id: 'wrapped-solana-bridge',
    symbol: 'wsol',
    name: 'Wrapped SOL Bridge',
    // Coba kasih mint yang sama persis dengan NATIVE_SOL_MINT — special case harus menang
    platforms: { solana: NATIVE_SOL_MINT },
  },
];

// ============================================================
describe('buildSolanaMintMap', () => {
  test('return Map dengan special cases hardcoded (SOL)', () => {
    const map = buildSolanaMintMap([]);
    expect(map.get(NATIVE_SOL_MINT)).toBe('solana');
    expect(map.size).toBe(1); // cuma SOL
  });

  test('map mint Solana ke coingeckoId dari list', () => {
    const map = buildSolanaMintMap(sampleCoinList);
    expect(map.get('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe('usd-coin');
    expect(map.get('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')).toBe('tether');
    expect(map.get('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263')).toBe('bonk');
  });

  test('skip coin yang gak ada platforms.solana', () => {
    const map = buildSolanaMintMap(sampleCoinList);
    // ETH gak ada di Solana, jangan masuk
    for (const value of map.values()) {
      expect(value).not.toBe('ethereum');
    }
  });

  test('skip empty string mint', () => {
    const list = [
      { id: 'foo', platforms: { solana: '' } },
      { id: 'bar', platforms: { solana: 'realmint123' } },
    ];
    const map = buildSolanaMintMap(list);
    expect(map.has('')).toBe(false);
    expect(map.get('realmint123')).toBe('bar');
  });

  test('skip coin tanpa field platforms', () => {
    const list = [
      { id: 'no-platforms-field', symbol: 'np' },
      { id: 'has-platforms', platforms: { solana: 'mint-x' } },
    ];
    const map = buildSolanaMintMap(list);
    expect(map.get('mint-x')).toBe('has-platforms');
  });

  test('special case (SOL) menang atas entry list dengan mint sama', () => {
    const map = buildSolanaMintMap(sampleCoinList);
    // sampleCoinList punya 'wrapped-solana-bridge' dengan mint = NATIVE_SOL_MINT
    // Tapi special case kita map ke 'solana' — harus dipertahanin
    expect(map.get(NATIVE_SOL_MINT)).toBe('solana');
  });

  test('coin pertama yang punya mint X menang (kalau duplikat & bukan special case)', () => {
    const list = [
      { id: 'first-claim', platforms: { solana: 'dup-mint' } },
      { id: 'second-claim', platforms: { solana: 'dup-mint' } },
    ];
    const map = buildSolanaMintMap(list);
    expect(map.get('dup-mint')).toBe('first-claim');
  });

  test('input bukan array → throw', () => {
    expect(() => buildSolanaMintMap(null)).toThrow('coinList harus array.');
    expect(() => buildSolanaMintMap({})).toThrow('coinList harus array.');
    expect(() => buildSolanaMintMap('string')).toThrow('coinList harus array.');
  });

  test('map size sesuai jumlah entry valid + special cases', () => {
    const map = buildSolanaMintMap(sampleCoinList);
    // 5 sample entries: 3 valid Solana, 1 ETH (skipped), 1 collision with SOL (skipped)
    // + 1 special case (SOL) = 4 total
    expect(map.size).toBe(4);
  });
});

// ============================================================
describe('buildEthContractMap', () => {
  test('return Map dengan special case native ETH', () => {
    const map = buildEthContractMap([]);
    expect(map.get(NATIVE_ETH_MINT)).toBe('ethereum');
    expect(map.size).toBe(1);
  });

  test('map contract Ethereum (lowercase) ke coingeckoId dari list', () => {
    const map = buildEthContractMap(sampleCoinList);
    // USDC contract di sample pakai mixed-case → harus ke-lowercase
    expect(map.get('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')).toBe('usd-coin');
    expect(map.get('0xdac17f958d2ee523a2206206994597c13d831ec7')).toBe('tether');
  });

  test('lookup case-insensitive lewat key lowercase', () => {
    const map = buildEthContractMap(sampleCoinList);
    // Map nyimpen lowercase; contract asli mixed-case gak ada sebagai key
    expect(map.has('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')).toBe(false);
    expect(map.has('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')).toBe(true);
  });

  test('skip coin yang gak ada platforms.ethereum & empty string', () => {
    const map = buildEthContractMap(sampleCoinList);
    // bonk cuma Solana → gak boleh ada coingeckoId 'bonk'
    for (const value of map.values()) {
      expect(value).not.toBe('bonk');
    }
    // 'ethereum' entry punya platforms.ethereum: '' → ke-skip
    expect([...map.values()].filter((v) => v === 'ethereum').length).toBe(1); // cuma special case
  });

  test('input bukan array → throw', () => {
    expect(() => buildEthContractMap(null)).toThrow('coinList harus array.');
  });
});

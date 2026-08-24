// ============================================================
// CHAINS — metadata & validasi address per blockchain (sisi client)
// ============================================================
// Mirror dari server/src/utils/chainAddress.js. Validasi di client cuma buat
// UX cepet (feedback sebelum kirim) — backend tetap validasi ulang.

export const CHAINS = {
  SOLANA: {
    label: 'Solana',
    pattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    placeholder: 'Alamat wallet Solana (base58)',
  },
  ETHEREUM: {
    label: 'Ethereum',
    pattern: /^0x[a-fA-F0-9]{40}$/,
    placeholder: 'Alamat Ethereum (0x...)',
  },
  BITCOIN: {
    label: 'Bitcoin',
    pattern: /^(bc1[a-z0-9]{6,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,39})$/,
    placeholder: 'Alamat Bitcoin (bc1... / 1... / 3...)',
  },
};

// Daftar chain yang bisa di-track (semua chain). Login cuma SOLANA & ETHEREUM
// (BTC gak punya standar sign-in web).
export const TRACKABLE_CHAINS = Object.keys(CHAINS);

export function chainLabel(chainType) {
  return CHAINS[chainType]?.label ?? chainType;
}

export function isValidAddress(chainType, address) {
  const c = CHAINS[chainType];
  return c ? c.pattern.test(address) : false;
}

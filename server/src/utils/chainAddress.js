// ============================================================
// CHAIN ADDRESS — validasi format address per blockchain
// ============================================================
// Dipakai bareng di scanController & walletController biar aturan format
// address gak ke-duplikat. Validasi ini cuma cek FORMAT (bukan keberadaan
// on-chain) — fail-fast sebelum nembak API external.

export const ADDRESS_PATTERNS = {
  // Solana: base58, 32-44 char (tanpa 0, O, I, l)
  SOLANA: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  // Ethereum: 0x + 40 hex char (case-insensitive, EIP-55 opsional)
  ETHEREUM: /^0x[a-fA-F0-9]{40}$/,
  // Bitcoin: bech32 (bc1...) atau legacy/P2SH (1.../3...). Longgar — Blockstream
  // tetep reject yang bener-bener invalid pas fetch.
  BITCOIN: /^(bc1[a-z0-9]{6,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,39})$/,
};

// Chain yang didukung sistem (buat enum validasi).
export const SUPPORTED_CHAINS = Object.keys(ADDRESS_PATTERNS);

/**
 * Cek format address sesuai chain-nya. Return false kalau chain gak dikenal.
 */
export function isValidAddress(chainType, address) {
  const pattern = ADDRESS_PATTERNS[chainType];
  return pattern ? pattern.test(address) : false;
}

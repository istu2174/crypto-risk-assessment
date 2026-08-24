/**
 * Formatters — helper buat display nominal di UI.
 */

// USD currency dengan compact notation buat angka gede (e.g. $1.2M)
export function formatUsd(value, { compact = false } = {}) {
  if (value == null || isNaN(value)) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 2 : 2,
  }).format(value);
}

// Persen dari angka 0-1 → "12.34%"
export function formatPercent(value, digits = 2) {
  if (value == null || isNaN(value)) return '-';
  return `${(value * 100).toFixed(digits)}%`;
}

// Number dengan ribuan separator
export function formatNumber(value, digits = 2) {
  if (value == null || isNaN(value)) return '-';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

// Wallet address shortener: "ABC123...XYZ789"
export function shortenAddress(address, chars = 4) {
  if (!address) return '-';
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

// ISO date → "28 May 2026, 14:30"
export function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

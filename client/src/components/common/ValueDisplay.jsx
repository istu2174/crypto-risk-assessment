import { formatUsd, formatPercent, formatNumber } from '../../utils/formatters.js';

/**
 * ValueDisplay — format angka konsisten di seluruh app.
 *
 * Props:
 *   value : angka mentah
 *   type  : 'currency' | 'compact' | 'percent' | 'number'
 *           - currency : $1,234.56
 *           - compact  : $1.2M  (buat angka besar: market cap, volume)
 *           - percent  : 12.34% (input 0–1)
 *           - number   : 1,234.56
 *   digits: jumlah desimal (default per-type)
 */
export default function ValueDisplay({ value, type = 'currency', digits, className = '' }) {
  let text;
  switch (type) {
    case 'compact':
      text = formatUsd(value, { compact: true });
      break;
    case 'percent':
      text = formatPercent(value, digits ?? 2);
      break;
    case 'number':
      text = formatNumber(value, digits ?? 2);
      break;
    case 'currency':
    default:
      text = formatUsd(value);
      break;
  }

  return <span className={className}>{text}</span>;
}

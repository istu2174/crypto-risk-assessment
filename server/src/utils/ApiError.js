// Custom error class buat propagate kode error konsisten ke response client
export default class ApiError extends Error {
  constructor(code, message, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;          // contoh: 'COINGECKO_RATE_LIMIT', 'COIN_NOT_FOUND'
    this.statusCode = statusCode; // HTTP status yg dikirim ke client
  }
}

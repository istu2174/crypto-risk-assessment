import { jest } from '@jest/globals';
import { z } from 'zod';
import errorHandler from '../errorHandler.js';
import ApiError from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';

// ============================================================
// Helper: mock Express res dengan status()/json() chainable + spy.
// ============================================================
function mockRes() {
  const res = {};
  res.status = jest.fn(() => res); // chainable: res.status(x).json(y)
  res.json = jest.fn(() => res);
  return res;
}

const req = {}; // errorHandler gak baca req di branch yang dites
const next = jest.fn();

// Silence logger biar output test bersih (errorHandler nge-log di branch 503 & 500)
beforeEach(() => {
  jest.spyOn(logger, 'error').mockImplementation(() => {});
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ============================================================
describe('errorHandler — ZodError', () => {
  test('mapping ke 400 VALIDATION_ERROR dengan pesan dari issues', () => {
    // Bikin ZodError asli dari parse yang gagal
    const result = z.object({ name: z.string() }).safeParse({ name: 123 });
    const res = mockRes();

    errorHandler(result.error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('name');
  });
});

describe('errorHandler — ApiError', () => {
  test('pakai statusCode & code dari ApiError', () => {
    const res = mockRes();
    errorHandler(new ApiError('COIN_NOT_FOUND', 'Coin gak ketemu.', 404), req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('COIN_NOT_FOUND');
    expect(body.error.message).toBe('Coin gak ketemu.');
  });
});

describe('errorHandler — error koneksi database', () => {
  test('Prisma error code P1001 → 503 DATABASE_UNAVAILABLE', () => {
    const res = mockRes();
    errorHandler({ code: 'P1001', message: "Can't reach database server" }, req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json.mock.calls[0][0].error.code).toBe('DATABASE_UNAVAILABLE');
  });

  test('pesan ENOTFOUND / tenant-user (Supabase paused) → 503 DATABASE_UNAVAILABLE', () => {
    const res = mockRes();
    const err = new Error(
      'DriverAdapterError: (ENOTFOUND) tenant/user postgres.abc not found'
    );
    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json.mock.calls[0][0].error.code).toBe('DATABASE_UNAVAILABLE');
  });

  test('ECONNREFUSED → 503 DATABASE_UNAVAILABLE', () => {
    const res = mockRes();
    errorHandler(new Error('connect ECONNREFUSED 127.0.0.1:5432'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json.mock.calls[0][0].error.code).toBe('DATABASE_UNAVAILABLE');
  });
});

describe('errorHandler — error tak terduga', () => {
  test('Error biasa → 500 INTERNAL_ERROR (detail disembunyiin)', () => {
    const res = mockRes();
    errorHandler(new Error('boom unexpected'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('INTERNAL_ERROR');
    // Pastiin pesan internal asli gak bocor ke client
    expect(body.error.message).not.toContain('boom unexpected');
  });

  test('Prisma code yang BUKAN koneksi (mis. P2002) jatuh ke 500, bukan 503', () => {
    const res = mockRes();
    errorHandler({ code: 'P2002', message: 'Unique constraint failed' }, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error.code).toBe('INTERNAL_ERROR');
  });
});

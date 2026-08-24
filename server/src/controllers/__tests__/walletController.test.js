import { jest } from '@jest/globals';

// ============================================================
// Mock Prisma SEBELUM import controller (ESM: pakai unstable_mockModule).
// Controller pakai prisma.trackedWallet.{findFirst,create,findMany,deleteMany}.
// ============================================================
const mockPrisma = {
  trackedWallet: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.unstable_mockModule('../../utils/prisma.js', () => ({ default: mockPrisma }));

// Dynamic import SETELAH mock terpasang
const { addTrackedWallet, listTrackedWallets, deleteTrackedWallet } = await import(
  '../walletController.js'
);

// ============================================================
// Test fixtures & helpers
// ============================================================
const PRIMARY = 'So11111111111111111111111111111111111111112'; // wallet login (fixture)
const TRACKED = '4AXLn3osKPoziZSxywac4MrbEFzhtxpeapDthc6bh84x'; // wallet yang mau di-track

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

// Bikin req dengan user terautentikasi (mirror dari requireAuth)
function makeReq({ body = {}, params = {} } = {}) {
  return { user: { userId: 'user-1', walletAddress: PRIMARY }, body, params };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================
describe('addTrackedWallet', () => {
  test('sukses → create + status 201 + data wallet', async () => {
    const created = {
      id: 'tw-1',
      address: TRACKED,
      chainType: 'SOLANA',
      label: 'Trading',
      addedAt: new Date(),
    };
    mockPrisma.trackedWallet.findFirst.mockResolvedValue(null); // belum ada duplikat
    mockPrisma.trackedWallet.create.mockResolvedValue(created);

    const req = makeReq({ body: { address: TRACKED, label: 'Trading' } });
    const res = mockRes();
    const next = jest.fn();

    await addTrackedWallet(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockPrisma.trackedWallet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          address: TRACKED,
          chainType: 'SOLANA',
          label: 'Trading',
        }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0]).toEqual({ success: true, data: created });
  });

  test('tolak kalau address = wallet login → ALREADY_PRIMARY (400), gak create', async () => {
    const req = makeReq({ body: { address: PRIMARY } });
    const res = mockRes();
    const next = jest.fn();

    await addTrackedWallet(req, res, next);

    expect(mockPrisma.trackedWallet.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.code).toBe('ALREADY_PRIMARY');
    expect(err.statusCode).toBe(400);
  });

  test('tolak duplikat → ALREADY_TRACKED (409), gak create', async () => {
    mockPrisma.trackedWallet.findFirst.mockResolvedValue({ id: 'existing' });

    const req = makeReq({ body: { address: TRACKED } });
    const res = mockRes();
    const next = jest.fn();

    await addTrackedWallet(req, res, next);

    expect(mockPrisma.trackedWallet.create).not.toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.code).toBe('ALREADY_TRACKED');
    expect(err.statusCode).toBe(409);
  });

  test('address gak valid → ZodError ke next, gak nyentuh DB', async () => {
    const req = makeReq({ body: { address: 'abc' } }); // kependekan
    const res = mockRes();
    const next = jest.fn();

    await addTrackedWallet(req, res, next);

    expect(mockPrisma.trackedWallet.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.trackedWallet.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].name).toBe('ZodError');
  });
});

describe('listTrackedWallets', () => {
  test('return list wallet milik user', async () => {
    const wallets = [{ id: 'tw-1', address: TRACKED, chainType: 'SOLANA', label: null }];
    mockPrisma.trackedWallet.findMany.mockResolvedValue(wallets);

    const req = makeReq();
    const res = mockRes();
    await listTrackedWallets(req, res, jest.fn());

    expect(mockPrisma.trackedWallet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } })
    );
    expect(res.json.mock.calls[0][0]).toEqual({ success: true, data: { wallets } });
  });
});

describe('deleteTrackedWallet', () => {
  const VALID_UUID = '11111111-1111-4111-8111-111111111111';

  test('sukses hapus → json { id }', async () => {
    mockPrisma.trackedWallet.deleteMany.mockResolvedValue({ count: 1 });

    const req = makeReq({ params: { id: VALID_UUID } });
    const res = mockRes();
    const next = jest.fn();

    await deleteTrackedWallet(req, res, next);

    // Filter userId wajib ada (ownership check)
    expect(mockPrisma.trackedWallet.deleteMany).toHaveBeenCalledWith({
      where: { id: VALID_UUID, userId: 'user-1' },
    });
    expect(next).not.toHaveBeenCalled();
    expect(res.json.mock.calls[0][0]).toEqual({ success: true, data: { id: VALID_UUID } });
  });

  test('gak ketemu / bukan punya user → NOT_FOUND (404)', async () => {
    mockPrisma.trackedWallet.deleteMany.mockResolvedValue({ count: 0 });

    const req = makeReq({ params: { id: VALID_UUID } });
    const res = mockRes();
    const next = jest.fn();

    await deleteTrackedWallet(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.code).toBe('NOT_FOUND');
    expect(err.statusCode).toBe(404);
  });

  test('id bukan UUID → ZodError ke next, gak nyentuh DB', async () => {
    const req = makeReq({ params: { id: 'not-a-uuid' } });
    const res = mockRes();
    const next = jest.fn();

    await deleteTrackedWallet(req, res, next);

    expect(mockPrisma.trackedWallet.deleteMany).not.toHaveBeenCalled();
    expect(next.mock.calls[0][0].name).toBe('ZodError');
  });
});

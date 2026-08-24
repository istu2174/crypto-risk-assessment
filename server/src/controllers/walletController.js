import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import prisma from '../utils/prisma.js';
import { getSolanaWalletHoldings } from '../services/heliusService.js';
import { getEthereumWalletHoldings } from '../services/alchemyService.js';
import { getBitcoinWalletHoldings } from '../services/blockstreamService.js';
import { SUPPORTED_CHAINS, isValidAddress } from '../utils/chainAddress.js';
import ApiError from '../utils/ApiError.js';

// Param chain + address (chainType di URL boleh lowercase).
const chainAddressParam = z.object({
  chainType: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(z.enum(SUPPORTED_CHAINS)),
  address: z.string().min(1).max(120),
});

// Dispatcher ambil holdings sesuai chain.
const HOLDINGS_FETCHERS = {
  SOLANA: getSolanaWalletHoldings,
  ETHEREUM: getEthereumWalletHoldings,
  BITCOIN: getBitcoinWalletHoldings,
};

/**
 * Cek apakah `address` adalah primary wallet user, atau tracked wallet
 * milik user (per chainType). Throw 403 kalau bukan dua-duanya.
 *
 * Catatan: data holdings sebenernya public di blockchain, tapi kita tetep
 * batasin akses biar endpoint kita gak jadi proxy gratis ke RPC eksternal.
 */
async function assertOwnsAddress(userId, primaryWallet, address, chainType) {
  if (primaryWallet === address) return; // wallet yang login = OK

  const tracked = await prisma.trackedWallet.findFirst({
    where: { userId, address, chainType },
    select: { id: true },
  });

  if (!tracked) {
    throw new ApiError(
      'FORBIDDEN',
      'Address ini bukan wallet lo (atau belum di-track).',
      403
    );
  }
}

// GET /api/wallet/:chainType/:address/holdings  (protected)
export const getWalletHoldings = asyncHandler(async (req, res) => {
  const { chainType, address } = chainAddressParam.parse(req.params);

  if (!isValidAddress(chainType, address)) {
    throw new ApiError(
      'INVALID_ADDRESS',
      `Address tidak valid untuk chain ${chainType}.`,
      400
    );
  }

  await assertOwnsAddress(req.user.userId, req.user.walletAddress, address, chainType);

  const data = await HOLDINGS_FETCHERS[chainType](address);
  res.json({ success: true, data });
});

// ============================================================
// TRACKED WALLET — CRUD
// User bisa nambah address lain (selain wallet login) buat dipantau.
// ============================================================

const trackedWalletBody = z
  .object({
    address: z.string().min(1).max(120),
    // Label opsional buat user — mis. "Wallet trading". Di-trim, max 50 char.
    label: z.string().trim().max(50).optional(),
    // Multi-chain: SOLANA/ETHEREUM/BITCOIN. Default SOLANA kalau gak dikirim.
    chainType: z.enum(SUPPORTED_CHAINS).default('SOLANA'),
  })
  // Validasi format address nyesuain chainType-nya (base58 vs hex vs btc).
  .superRefine((data, ctx) => {
    if (!isValidAddress(data.chainType, data.address)) {
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message: `Address tidak valid untuk chain ${data.chainType}.`,
      });
    }
  });

const idParam = z.object({
  id: z.uuid('id harus UUID v4 yang valid'),
});

// POST /api/wallet/tracked  (protected)
// Body: { address, label?, chainType? } → tambah wallet ke daftar pantau user.
export const addTrackedWallet = asyncHandler(async (req, res) => {
  const { address, label, chainType } = trackedWalletBody.parse(req.body);

  // Gak boleh nge-track wallet yang dipake login — itu udah otomatis "punya" user.
  if (address === req.user.walletAddress) {
    throw new ApiError(
      'ALREADY_PRIMARY',
      'Address ini adalah wallet login lo, gak perlu di-track lagi.',
      400
    );
  }

  // Cek duplikat dulu (biar pesannya jelas, bukan generic unique-constraint error)
  const existing = await prisma.trackedWallet.findFirst({
    where: { userId: req.user.userId, address, chainType },
    select: { id: true },
  });
  if (existing) {
    throw new ApiError('ALREADY_TRACKED', 'Wallet ini udah ada di daftar pantau lo.', 409);
  }

  const tracked = await prisma.trackedWallet.create({
    data: {
      userId: req.user.userId,
      address,
      chainType,
      label: label || null,
    },
    select: { id: true, address: true, chainType: true, label: true, addedAt: true },
  });

  res.status(201).json({ success: true, data: tracked });
});

// GET /api/wallet/tracked  (protected)
// List semua tracked wallet milik user, terbaru duluan.
export const listTrackedWallets = asyncHandler(async (req, res) => {
  const wallets = await prisma.trackedWallet.findMany({
    where: { userId: req.user.userId },
    orderBy: { addedAt: 'desc' },
    select: { id: true, address: true, chainType: true, label: true, addedAt: true },
  });

  res.json({ success: true, data: { wallets } });
});

// DELETE /api/wallet/tracked/:id  (protected)
// Hapus tracked wallet. Pakai deleteMany + filter userId biar gak bisa
// hapus punya orang lain (ownership check sekaligus).
export const deleteTrackedWallet = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);

  const result = await prisma.trackedWallet.deleteMany({
    where: { id, userId: req.user.userId },
  });

  if (result.count === 0) {
    throw new ApiError('NOT_FOUND', 'Tracked wallet tidak ditemukan.', 404);
  }

  res.json({ success: true, data: { id } });
});

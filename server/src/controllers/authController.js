import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import prisma from '../utils/prisma.js';
import {
  generateNonce,
  verifyAuthRequest,
  issueJwt,
} from '../services/authService.js';
import ApiError from '../utils/ApiError.js';

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

// Solana base58 address: 32-44 char alfanumerik (tanpa 0, O, I, l)
const solanaAddress = z
  .string()
  .min(32)
  .max(44)
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Address bukan format base58 valid');

// Solana signature: base58, 64-128 char
const solanaSignature = z
  .string()
  .min(64)
  .max(128)
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Signature bukan format base58 valid');

// Ethereum address: 0x + 40 hex char. Case-insensitive (EIP-55 checksum opsional).
const ethAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Address bukan format Ethereum (0x + 40 hex) valid');

// Ethereum signature personal_sign: 0x + 130 hex char (65 byte: r,s,v)
const ethSignature = z
  .string()
  .regex(/^0x[a-fA-F0-9]{130}$/, 'Signature bukan format Ethereum valid');

// Validasi address/signature beda per chain → pakai discriminated union biar
// tiap chain dapet aturan format yang bener (Solana base58 vs ETH hex).
// BITCOIN sengaja gak ada di sini: BTC gak bisa login, cuma bisa di-track.
const nonceBody = z.discriminatedUnion('chainType', [
  z.object({ chainType: z.literal('SOLANA'), walletAddress: solanaAddress }),
  z.object({ chainType: z.literal('ETHEREUM'), walletAddress: ethAddress }),
]);

const verifyBody = z.discriminatedUnion('chainType', [
  z.object({
    chainType: z.literal('SOLANA'),
    walletAddress: solanaAddress,
    signature: solanaSignature,
  }),
  z.object({
    chainType: z.literal('ETHEREUM'),
    walletAddress: ethAddress,
    signature: ethSignature,
  }),
]);

// ============================================================
// HANDLERS
// ============================================================

// POST /api/auth/nonce
// Body: { walletAddress, chainType }
// Return: { nonce, message } — user sign `message` di wallet
export const requestNonce = asyncHandler(async (req, res) => {
  // Validasi udah batasi chainType ke SOLANA/ETHEREUM lewat discriminated union.
  const { walletAddress } = nonceBody.parse(req.body);

  const { nonce, message } = generateNonce(walletAddress);
  res.json({ success: true, data: { nonce, message } });
});

// POST /api/auth/verify
// Body: { walletAddress, chainType, signature }
// Return: { token, user }
export const verifyAndLogin = asyncHandler(async (req, res) => {
  const { walletAddress, chainType, signature } = verifyBody.parse(req.body);

  // 1. Verify nonce + signature (throw ApiError kalau gagal)
  verifyAuthRequest({ walletAddress, chainType, signature });

  // 2. Upsert user — kalau wallet baru, bikin record; kalau udah ada, update lastLoginAt
  const user = await prisma.user.upsert({
    where: { primaryWallet: walletAddress },
    update: { lastLoginAt: new Date() },
    create: { primaryWallet: walletAddress, chainType },
    select: {
      id: true,
      primaryWallet: true,
      chainType: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  // 3. Issue JWT
  const token = issueJwt({
    userId: user.id,
    walletAddress: user.primaryWallet,
    chainType: user.chainType,
  });

  res.json({ success: true, data: { token, user } });
});

// GET /api/auth/me (protected)
// Return profile user yang login (berdasarkan JWT)
export const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      primaryWallet: true,
      chainType: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    // Token valid tapi user udah ke-delete dari DB (edge case)
    throw new ApiError('USER_NOT_FOUND', 'User tidak ditemukan.', 404);
  }

  res.json({ success: true, data: { user } });
});

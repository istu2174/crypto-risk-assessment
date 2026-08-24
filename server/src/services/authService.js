import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { recoverPersonalSignature } from '@metamask/eth-sig-util';
import cache from '../utils/cache.js';
import ApiError from '../utils/ApiError.js';
import { env } from '../config/env.js';

// ============================================================
// NONCE
// ============================================================
// Flow: user minta nonce → kita simpan di cache (TTL 5 menit) → user sign
// message yang berisi nonce → kita verify signature + cek nonce masih ada
// di cache. Nonce sekali pakai (delete setelah verify) buat cegah replay.
// ============================================================

// Format key cache: "nonce:<walletAddress>"
function nonceKey(walletAddress) {
  return `nonce:${walletAddress}`;
}

// Bikin message yang user bakal sign. Format-nya harus konsisten antara
// generate & verify, dan harus include nonce + domain biar phishing-resistant.
function buildSignMessage(nonce) {
  return [
    'CryptoRisk Auth',
    '',
    'Sign this message untuk login. Aksi ini gratis & gak ngirim transaksi.',
    '',
    `Nonce: ${nonce}`,
  ].join('\n');
}

// Generate nonce baru, simpan ke cache, return { nonce, message }
export function generateNonce(walletAddress) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const message = buildSignMessage(nonce);
  cache.set(nonceKey(walletAddress), nonce, env.CACHE_TTL_NONCE);
  return { nonce, message };
}

// Ambil nonce dari cache & langsung hapus (one-time use). Return null kalau expired.
function consumeNonce(walletAddress) {
  const key = nonceKey(walletAddress);
  const nonce = cache.get(key);
  if (nonce) cache.del(key);
  return nonce ?? null;
}

// ============================================================
// SIGNATURE VERIFICATION
// ============================================================

// Verify Ed25519 signature dari Solana wallet (Phantom, Solflare, dll).
// - walletAddress: base58-encoded public key (44 char)
// - signature: base58-encoded signature (88 char)
// - message: plaintext yang di-sign
export function verifySolanaSignature({ walletAddress, signature, message }) {
  try {
    const pubKey = bs58.decode(walletAddress);
    const sigBytes = bs58.decode(signature);
    const msgBytes = new TextEncoder().encode(message);
    return nacl.sign.detached.verify(msgBytes, sigBytes, pubKey);
  } catch {
    // Decode error / format invalid → treat as failed verification
    return false;
  }
}

// Verify signature EIP-191 dari Ethereum wallet (MetaMask, dll).
// MetaMask `personal_sign` nge-hash message pakai prefix EIP-191
// ("\x19Ethereum Signed Message:\n" + len) lalu sign pakai secp256k1.
// `recoverPersonalSignature` (lib resmi MetaMask) nge-recover address dari
// signature + message, jadi kita tinggal bandingin sama address yang ngaku.
// - walletAddress: hex address (0x + 40 hex char), bisa mixed-case (EIP-55)
// - signature: hex (0x + 130 hex char = 65 byte: r,s,v)
// - message: plaintext yang di-sign (UTF-8, bukan hex)
export function verifyEthereumSignature({ walletAddress, signature, message }) {
  try {
    // recoverPersonalSignature anggap `data` non-hex string sebagai UTF-8.
    // Message kita selalu diawali "CryptoRisk Auth", jadi aman dianggap UTF-8.
    const recovered = recoverPersonalSignature({ data: message, signature });
    // Address Ethereum case-insensitive (checksum cuma buat validasi typo),
    // jadi bandingin dalam lowercase.
    return recovered.toLowerCase() === walletAddress.toLowerCase();
  } catch {
    // Signature/format invalid → treat as failed verification
    return false;
  }
}

// ============================================================
// MAIN AUTH FLOW
// ============================================================

// Dipanggil dari controller /api/auth/verify. Cek nonce + signature,
// throw ApiError kalau gagal.
export function verifyAuthRequest({ walletAddress, chainType, signature }) {
  const nonce = consumeNonce(walletAddress);
  if (!nonce) {
    throw new ApiError(
      'NONCE_EXPIRED',
      'Nonce expired atau belum di-request. Minta nonce baru.',
      400
    );
  }

  const message = buildSignMessage(nonce);

  let isValid;
  if (chainType === 'SOLANA') {
    isValid = verifySolanaSignature({ walletAddress, signature, message });
  } else if (chainType === 'ETHEREUM') {
    isValid = verifyEthereumSignature({ walletAddress, signature, message });
  } else {
    // BITCOIN gak punya standar sign-in web → cuma bisa di-track (lihat
    // trackedWallet), gak bisa jadi primaryWallet/login.
    throw new ApiError(
      'CHAIN_NOT_SUPPORTED',
      `Auth untuk chain ${chainType} tidak didukung (tidak bisa login).`,
      400
    );
  }

  if (!isValid) {
    throw new ApiError('INVALID_SIGNATURE', 'Signature tidak valid.', 401);
  }
}

// ============================================================
// JWT
// ============================================================

// Sign JWT setelah signature verified. Payload minimal — info detail
// (lastLogin, dll) ambil dari DB on-demand.
export function issueJwt({ userId, walletAddress, chainType }) {
  return jwt.sign(
    { sub: userId, walletAddress, chainType },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

// Verify JWT. Throw ApiError 401 kalau expired/invalid.
export function verifyJwt(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError('TOKEN_EXPIRED', 'Token sudah expired, silakan login ulang.', 401);
    }
    throw new ApiError('INVALID_TOKEN', 'Token tidak valid.', 401);
  }
}

import nacl from 'tweetnacl';
import bs58 from 'bs58';
import jwt from 'jsonwebtoken';
import { personalSign, recoverPersonalSignature } from '@metamask/eth-sig-util';
import {
  generateNonce,
  verifySolanaSignature,
  verifyEthereumSignature,
  verifyAuthRequest,
  issueJwt,
  verifyJwt,
} from '../authService.js';
import cache from '../../utils/cache.js';
import ApiError from '../../utils/ApiError.js';
import { env } from '../../config/env.js';

// Helper: bikin Solana keypair + sign message, return data dalam bentuk
// yang bakal di-kirim client (semua base58-encoded).
function makeSignedRequest(message) {
  const keypair = nacl.sign.keyPair();
  const walletAddress = bs58.encode(keypair.publicKey);
  const messageBytes = new TextEncoder().encode(message);
  const sigBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
  const signature = bs58.encode(sigBytes);
  return { walletAddress, signature, keypair };
}

// Private key test secp256k1 (fixed, valid). Address di-derive lewat
// recoverPersonalSignature biar gak perlu lib derivasi terpisah.
const ETH_PRIVATE_KEY = Buffer.from(
  '4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318',
  'hex'
);

// Helper: sign message ala MetaMask personal_sign, return { walletAddress, signature }.
function makeEthSignedRequest(message) {
  const signature = personalSign({ privateKey: ETH_PRIVATE_KEY, data: message });
  const walletAddress = recoverPersonalSignature({ data: message, signature });
  return { walletAddress, signature };
}

// Reset cache state biar tiap test isolated (nonce dari test sebelumnya gak bocor)
beforeEach(() => {
  cache.flushAll();
});

// ============================================================
describe('generateNonce', () => {
  test('return object dengan field nonce (hex 32 char) dan message', () => {
    const { nonce, message } = generateNonce('FakeWallet1');
    expect(nonce).toMatch(/^[0-9a-f]{32}$/); // 16 byte = 32 hex char
    expect(message).toContain('CryptoRisk Auth');
    expect(message).toContain(nonce);
  });

  test('nonce kesimpan di cache sesuai walletAddress', () => {
    const { nonce } = generateNonce('Wallet-A');
    expect(cache.get('nonce:Wallet-A')).toBe(nonce);
  });

  test('dua kali generate buat wallet sama → nonce kedua replace nonce pertama', () => {
    const first = generateNonce('Wallet-B').nonce;
    const second = generateNonce('Wallet-B').nonce;
    expect(first).not.toBe(second);
    expect(cache.get('nonce:Wallet-B')).toBe(second);
  });

  test('nonce unik antar generate call', () => {
    const nonces = new Set();
    for (let i = 0; i < 50; i++) {
      nonces.add(generateNonce(`Wallet-${i}`).nonce);
    }
    expect(nonces.size).toBe(50);
  });
});

// ============================================================
describe('verifySolanaSignature', () => {
  test('signature valid → true', () => {
    const message = 'test message 123';
    const { walletAddress, signature } = makeSignedRequest(message);
    expect(verifySolanaSignature({ walletAddress, signature, message })).toBe(true);
  });

  test('signature valid tapi message di-tampered → false', () => {
    const { walletAddress, signature } = makeSignedRequest('original message');
    const result = verifySolanaSignature({
      walletAddress,
      signature,
      message: 'tampered message',
    });
    expect(result).toBe(false);
  });

  test('signature valid tapi pakai publickey lain → false', () => {
    const message = 'hello';
    const { signature } = makeSignedRequest(message);
    const otherKeypair = nacl.sign.keyPair();
    const otherAddress = bs58.encode(otherKeypair.publicKey);
    expect(verifySolanaSignature({ walletAddress: otherAddress, signature, message })).toBe(false);
  });

  test('signature garbage (random bytes) → false', () => {
    const message = 'whatever';
    const { walletAddress } = makeSignedRequest(message);
    const fakeSig = bs58.encode(nacl.randomBytes(64));
    expect(verifySolanaSignature({ walletAddress, signature: fakeSig, message })).toBe(false);
  });

  test('walletAddress malformed (bukan base58) → false (gak throw)', () => {
    const result = verifySolanaSignature({
      walletAddress: 'not-a-valid-base58-!!!',
      signature: '11111111',
      message: 'x',
    });
    expect(result).toBe(false);
  });

  test('signature malformed (panjang salah) → false (gak throw)', () => {
    const { walletAddress } = makeSignedRequest('x');
    const result = verifySolanaSignature({
      walletAddress,
      signature: '123', // terlalu pendek
      message: 'x',
    });
    expect(result).toBe(false);
  });
});

// ============================================================
describe('verifyEthereumSignature', () => {
  test('signature valid → true', () => {
    const message = 'test message 123';
    const { walletAddress, signature } = makeEthSignedRequest(message);
    expect(verifyEthereumSignature({ walletAddress, signature, message })).toBe(true);
  });

  test('case-insensitive: address lowercase tetap valid', () => {
    const message = 'cek casing';
    const { walletAddress, signature } = makeEthSignedRequest(message);
    expect(
      verifyEthereumSignature({
        walletAddress: walletAddress.toLowerCase(),
        signature,
        message,
      })
    ).toBe(true);
  });

  test('message di-tampered → false', () => {
    const { walletAddress, signature } = makeEthSignedRequest('original');
    expect(
      verifyEthereumSignature({ walletAddress, signature, message: 'tampered' })
    ).toBe(false);
  });

  test('address lain → false', () => {
    const message = 'hello';
    const { signature } = makeEthSignedRequest(message);
    const otherAddress = '0x1111111111111111111111111111111111111111';
    expect(verifyEthereumSignature({ walletAddress: otherAddress, signature, message })).toBe(false);
  });

  test('signature garbage → false (gak throw)', () => {
    const { walletAddress } = makeEthSignedRequest('x');
    expect(
      verifyEthereumSignature({
        walletAddress,
        signature: '0xdeadbeef',
        message: 'x',
      })
    ).toBe(false);
  });
});

// ============================================================
describe('verifyAuthRequest', () => {
  test('flow lengkap: generate → sign → verify → success (gak throw)', () => {
    const { walletAddress, keypair } = makeSignedRequest('dummy');
    const { message } = generateNonce(walletAddress);

    // User sign message dari nonce
    const sigBytes = nacl.sign.detached(new TextEncoder().encode(message), keypair.secretKey);
    const signature = bs58.encode(sigBytes);

    expect(() =>
      verifyAuthRequest({ walletAddress, chainType: 'SOLANA', signature })
    ).not.toThrow();
  });

  test('nonce belum di-generate → throw NONCE_EXPIRED', () => {
    const { walletAddress, signature } = makeSignedRequest('anything');
    expect(() =>
      verifyAuthRequest({ walletAddress, chainType: 'SOLANA', signature })
    ).toThrow(ApiError);
    try {
      verifyAuthRequest({ walletAddress, chainType: 'SOLANA', signature });
    } catch (err) {
      expect(err.code).toBe('NONCE_EXPIRED');
      expect(err.statusCode).toBe(400);
    }
  });

  test('nonce one-time use: verify kedua dengan nonce sama → NONCE_EXPIRED', () => {
    const { walletAddress, keypair } = makeSignedRequest('x');
    const { message } = generateNonce(walletAddress);
    const sigBytes = nacl.sign.detached(new TextEncoder().encode(message), keypair.secretKey);
    const signature = bs58.encode(sigBytes);

    // Pertama: sukses
    expect(() =>
      verifyAuthRequest({ walletAddress, chainType: 'SOLANA', signature })
    ).not.toThrow();

    // Kedua dengan signature/nonce yang sama: harus reject (replay protection)
    try {
      verifyAuthRequest({ walletAddress, chainType: 'SOLANA', signature });
    } catch (err) {
      expect(err.code).toBe('NONCE_EXPIRED');
    }
  });

  test('signature gak sesuai message dari nonce → INVALID_SIGNATURE', () => {
    const { walletAddress, keypair } = makeSignedRequest('x');
    generateNonce(walletAddress);

    // Sign message LAIN (bukan message dari generateNonce)
    const wrongMessage = 'this is not the auth message';
    const sigBytes = nacl.sign.detached(
      new TextEncoder().encode(wrongMessage),
      keypair.secretKey
    );
    const signature = bs58.encode(sigBytes);

    try {
      verifyAuthRequest({ walletAddress, chainType: 'SOLANA', signature });
    } catch (err) {
      expect(err.code).toBe('INVALID_SIGNATURE');
      expect(err.statusCode).toBe(401);
    }
  });

  test('chainType ETHEREUM: flow lengkap generate → sign → verify → success', () => {
    // Generate nonce dulu buat dapet message yang harus di-sign
    const { walletAddress } = makeEthSignedRequest('placeholder');
    const { message } = generateNonce(walletAddress);
    // User sign message dari nonce pakai key yang sama
    const signature = personalSign({ privateKey: ETH_PRIVATE_KEY, data: message });

    expect(() =>
      verifyAuthRequest({ walletAddress, chainType: 'ETHEREUM', signature })
    ).not.toThrow();
  });

  test('chainType ETHEREUM: signature dari address lain → INVALID_SIGNATURE', () => {
    const { walletAddress } = makeEthSignedRequest('x');
    const { message } = generateNonce(walletAddress);
    const signature = personalSign({ privateKey: ETH_PRIVATE_KEY, data: message });

    // Klaim address lain tapi signature dari key kita
    const otherAddress = '0x1111111111111111111111111111111111111111';
    // Nonce di-generate buat walletAddress asli; ganti ke otherAddress butuh
    // nonce sendiri → generate dulu biar lolos cek nonce, gagal di signature.
    generateNonce(otherAddress);
    try {
      verifyAuthRequest({ walletAddress: otherAddress, chainType: 'ETHEREUM', signature });
    } catch (err) {
      expect(err.code).toBe('INVALID_SIGNATURE');
    }
  });

  test('chainType BITCOIN → CHAIN_NOT_SUPPORTED (BTC gak bisa login)', () => {
    const { walletAddress, signature } = makeSignedRequest('x');
    generateNonce(walletAddress);
    try {
      verifyAuthRequest({ walletAddress, chainType: 'BITCOIN', signature });
      throw new Error('harusnya throw');
    } catch (err) {
      expect(err.code).toBe('CHAIN_NOT_SUPPORTED');
    }
  });
});

// ============================================================
describe('issueJwt + verifyJwt', () => {
  test('roundtrip: issue → verify return payload yang sama', () => {
    const token = issueJwt({
      userId: 'user-123',
      walletAddress: 'wallet-abc',
      chainType: 'SOLANA',
    });
    expect(typeof token).toBe('string');

    const payload = verifyJwt(token);
    expect(payload.sub).toBe('user-123');
    expect(payload.walletAddress).toBe('wallet-abc');
    expect(payload.chainType).toBe('SOLANA');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  test('token expired → throw TOKEN_EXPIRED', () => {
    // Sign manual dengan expiry di masa lalu
    const expired = jwt.sign(
      { sub: 'x', walletAddress: 'y', chainType: 'SOLANA' },
      env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    try {
      verifyJwt(expired);
    } catch (err) {
      expect(err.code).toBe('TOKEN_EXPIRED');
      expect(err.statusCode).toBe(401);
    }
  });

  test('token random garbage → throw INVALID_TOKEN', () => {
    try {
      verifyJwt('not-a-real-jwt-string');
    } catch (err) {
      expect(err.code).toBe('INVALID_TOKEN');
      expect(err.statusCode).toBe(401);
    }
  });

  test('token di-sign pakai secret lain → throw INVALID_TOKEN', () => {
    const fake = jwt.sign({ sub: 'x' }, 'wrong-secret', { expiresIn: '1h' });
    try {
      verifyJwt(fake);
    } catch (err) {
      expect(err.code).toBe('INVALID_TOKEN');
    }
  });
});

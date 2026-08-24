import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import prisma from '../utils/prisma.js';
import { scanPortfolio, scanDemoPortfolio } from '../services/portfolioScanService.js';
import { CONCENTRATION_ENUM } from '../services/portfolioAnalyzer.js';
import { SUPPORTED_CHAINS, isValidAddress } from '../utils/chainAddress.js';
import ApiError from '../utils/ApiError.js';

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

// chainType di URL boleh lowercase (solana) → normalisasi ke enum uppercase.
const chainParam = z.object({
  chainType: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(z.enum(SUPPORTED_CHAINS)),
  address: z.string().min(1).max(120),
});

// Format address beda per chain. Validasi fail-fast sebelum nembak API external.
function validateAddressFormat(chainType, address) {
  if (!isValidAddress(chainType, address)) {
    throw new ApiError(
      'INVALID_ADDRESS',
      `Address tidak valid untuk chain ${chainType}.`,
      400
    );
  }
}

const scanIdParam = z.object({
  scanId: z.uuid('scanId harus UUID v4 yang valid'),
});

// Body demo scan: pilihan skenario komposisi. Default 'concentrated' biar
// bare POST /scan/demo (tanpa body) tetap jalan → backward-compatible.
const demoScanBody = z.object({
  scenario: z
    .enum(['diversified', 'moderate', 'concentrated'])
    .default('concentrated'),
});

const listScansQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================
// HELPERS
// ============================================================

// Cek ownership address (sama dengan walletController, di-duplicate biar
// scanController gak coupled ke walletController internals)
async function assertOwnsAddress(userId, primaryWallet, address, chainType) {
  if (primaryWallet === address) return;

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

// Convert 'Low'/'Medium'/'High' → Prisma enum 'LOW'/'MEDIUM'/'HIGH'
const toEnumLevel = (level) => level.toUpperCase();

// ============================================================
// HANDLERS
// ============================================================

// POST /api/scan/:chainType/:address
// Trigger scan baru + save ke DB. Return scan result lengkap.
export const triggerScan = asyncHandler(async (req, res) => {
  const { chainType, address } = chainParam.parse(req.params);
  validateAddressFormat(chainType, address);
  await assertOwnsAddress(req.user.userId, req.user.walletAddress, address, chainType);

  // Run scan (bisa makan waktu beberapa detik karena fetch CoinGecko per asset)
  const result = await scanPortfolio(chainType, address);

  // Save Scan + AssetSnapshot[] dalam 1 transaction
  const scan = await prisma.$transaction(async (tx) => {
    const createdScan = await tx.scan.create({
      data: {
        userId: req.user.userId,
        scannedAddress: address,
        scannedAt: result.scannedAt,
        totalValueUsd: result.summary.totalValueUsd,
        hhi: result.summary.hhi,
        // Kelas HHI di-map dari label (Terdiversifikasi/Moderat/Terkonsentrasi)
        // ke enum kolom DB (LOW/MEDIUM/HIGH). Enum = kode storage, bukan label.
        hhiLevel: CONCENTRATION_ENUM[result.summary.hhiLabel],
        overallRiskScore: result.summary.overallRiskScore,
        overallRiskLevel: toEnumLevel(result.summary.overallRiskLevel),
        assetCount: result.summary.classifiedCount,
      },
      select: { id: true, scannedAt: true },
    });

    await tx.assetSnapshot.createMany({
      data: result.classifiedAssets.map((a) => ({
        scanId: createdScan.id,
        coingeckoId: a.coingeckoId,
        symbol: a.symbol,
        name: a.name ?? a.symbol,
        chainType: result.chainType,
        balance: a.balance,
        priceUsd: a.priceUsd,
        valueUsd: a.valueUsd,
        marketCap: a.marketCap,
        volume24h: a.volume24h,
        volatility30d: a.volatility,
        liquidityRatio: a.liquidityRatio,
        riskScore: a.riskScore,
        riskLevel: toEnumLevel(a.riskLevel),
        weight: a.weight,
      })),
    });

    return createdScan;
  });

  res.json({
    success: true,
    data: {
      scanId: scan.id,
      ...result,
    },
  });
});

// POST /api/scan/demo
// Trigger scan portfolio DEMO (seed coin asli, balance dummy) + save ke DB.
// Gak perlu ownership/address check — ini portfolio sintetis buat testing.
export const triggerDemoScan = asyncHandler(async (req, res) => {
  // Body opsional — kalau kosong, default ke 'concentrated' (backward-compatible).
  const { scenario } = demoScanBody.parse(req.body ?? {});
  const result = await scanDemoPortfolio(scenario);

  const scan = await prisma.$transaction(async (tx) => {
    const createdScan = await tx.scan.create({
      data: {
        userId: req.user.userId,
        scannedAddress: result.walletAddress, // 'DEMO-PORTFOLIO'
        scannedAt: result.scannedAt,
        totalValueUsd: result.summary.totalValueUsd,
        hhi: result.summary.hhi,
        // Kelas HHI di-map dari label (Terdiversifikasi/Moderat/Terkonsentrasi)
        // ke enum kolom DB (LOW/MEDIUM/HIGH). Enum = kode storage, bukan label.
        hhiLevel: CONCENTRATION_ENUM[result.summary.hhiLabel],
        overallRiskScore: result.summary.overallRiskScore,
        overallRiskLevel: toEnumLevel(result.summary.overallRiskLevel),
        assetCount: result.summary.classifiedCount,
      },
      select: { id: true, scannedAt: true },
    });

    await tx.assetSnapshot.createMany({
      // chainType pakai per-asset (demo = campuran multi-chain), bukan result-level
      data: result.classifiedAssets.map((a) => ({
        scanId: createdScan.id,
        coingeckoId: a.coingeckoId,
        symbol: a.symbol,
        name: a.name ?? a.symbol,
        chainType: a.chainType,
        balance: a.balance,
        priceUsd: a.priceUsd,
        valueUsd: a.valueUsd,
        marketCap: a.marketCap,
        volume24h: a.volume24h,
        volatility30d: a.volatility,
        liquidityRatio: a.liquidityRatio,
        riskScore: a.riskScore,
        riskLevel: toEnumLevel(a.riskLevel),
        weight: a.weight,
      })),
    });

    return createdScan;
  });

  res.json({
    success: true,
    data: {
      scanId: scan.id,
      ...result,
    },
  });
});

// GET /api/scan?limit=10&offset=0
// List scans milik user, latest first. Untuk halaman "riwayat scan".
export const listScans = asyncHandler(async (req, res) => {
  const { limit, offset } = listScansQuery.parse(req.query);

  const [scans, total] = await Promise.all([
    prisma.scan.findMany({
      where: { userId: req.user.userId },
      orderBy: { scannedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        scannedAddress: true,
        scannedAt: true,
        totalValueUsd: true,
        hhi: true,
        hhiLevel: true,
        overallRiskScore: true,
        overallRiskLevel: true,
        assetCount: true,
      },
    }),
    prisma.scan.count({ where: { userId: req.user.userId } }),
  ]);

  res.json({
    success: true,
    data: { scans, pagination: { limit, offset, total } },
  });
});

// GET /api/scan/:scanId
// Detail 1 scan + asset snapshots. Cek ownership lewat userId di Scan.
export const getScanDetail = asyncHandler(async (req, res) => {
  const { scanId } = scanIdParam.parse(req.params);

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: {
      assetSnapshots: {
        orderBy: { weight: 'desc' }, // asset terbesar duluan
      },
    },
  });

  if (!scan) {
    throw new ApiError('SCAN_NOT_FOUND', 'Scan tidak ditemukan.', 404);
  }

  if (scan.userId !== req.user.userId) {
    throw new ApiError('FORBIDDEN', 'Scan ini bukan punya lo.', 403);
  }

  res.json({ success: true, data: scan });
});

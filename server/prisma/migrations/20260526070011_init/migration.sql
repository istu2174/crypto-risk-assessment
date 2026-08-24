-- CreateEnum
CREATE TYPE "ChainType" AS ENUM ('SOLANA', 'ETHEREUM', 'BITCOIN');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ConcentrationLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "primaryWallet" TEXT NOT NULL,
    "chainType" "ChainType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chainType" "ChainType" NOT NULL,
    "label" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackedWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalValueUsd" DOUBLE PRECISION NOT NULL,
    "hhi" DOUBLE PRECISION NOT NULL,
    "hhiLevel" "ConcentrationLevel" NOT NULL,
    "overallRiskScore" DOUBLE PRECISION NOT NULL,
    "overallRiskLevel" "RiskLevel" NOT NULL,
    "assetCount" INTEGER NOT NULL,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetSnapshot" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "coingeckoId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chainType" "ChainType" NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "priceUsd" DOUBLE PRECISION NOT NULL,
    "valueUsd" DOUBLE PRECISION NOT NULL,
    "marketCap" DOUBLE PRECISION NOT NULL,
    "volume24h" DOUBLE PRECISION NOT NULL,
    "volatility30d" DOUBLE PRECISION NOT NULL,
    "liquidityRatio" DOUBLE PRECISION NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AssetSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceCache" (
    "coingeckoId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceUsd" DOUBLE PRECISION NOT NULL,
    "marketCap" DOUBLE PRECISION,
    "volume24h" DOUBLE PRECISION,
    "volatility30d" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceCache_pkey" PRIMARY KEY ("coingeckoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_primaryWallet_key" ON "User"("primaryWallet");

-- CreateIndex
CREATE INDEX "User_primaryWallet_idx" ON "User"("primaryWallet");

-- CreateIndex
CREATE INDEX "TrackedWallet_userId_idx" ON "TrackedWallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedWallet_userId_address_chainType_key" ON "TrackedWallet"("userId", "address", "chainType");

-- CreateIndex
CREATE INDEX "Scan_userId_scannedAt_idx" ON "Scan"("userId", "scannedAt");

-- CreateIndex
CREATE INDEX "AssetSnapshot_scanId_idx" ON "AssetSnapshot"("scanId");

-- CreateIndex
CREATE INDEX "AssetSnapshot_coingeckoId_idx" ON "AssetSnapshot"("coingeckoId");

-- AddForeignKey
ALTER TABLE "TrackedWallet" ADD CONSTRAINT "TrackedWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSnapshot" ADD CONSTRAINT "AssetSnapshot_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

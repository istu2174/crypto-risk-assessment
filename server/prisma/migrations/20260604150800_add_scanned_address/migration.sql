-- AlterTable
-- Tambah kolom scannedAddress (nullable) ke Scan biar history kebedain per wallet.
-- Nullable karena scan lama (sebelum fitur tracked wallet) gak punya info ini.
ALTER TABLE "Scan" ADD COLUMN "scannedAddress" TEXT;

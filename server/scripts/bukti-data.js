// ============================================================
// SCRIPT BUKTI DATA — buat lampiran skripsi BAB 4
// ============================================================
// Nunjukin 2 hal yang dipisah jelas:
//   1) DATA MENTAH   → respons asli CoinGecko API + pembacaan wallet (Helius)
//   2) DATA TERPROSES → hasil enrich + klasifikasi risiko (rule-based + HHI)
//
// Cara jalanin (dari folder server/):
//   node scripts/bukti-data.js                     → CoinGecko + demo portfolio
//   node scripts/bukti-data.js <SOLANA_ADDRESS>    → + pembacaan wallet asli
//
// Output:
//   - File JSON rapi di  server/bukti-data/   (buka di VSCode, screenshot)
//   - Ringkasan tabel di terminal             (screenshot juga)
// ============================================================

import 'dotenv/config';
import axios from 'axios';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { scanDemoPortfolio } from '../src/services/portfolioScanService.js';
import { getSolanaWalletHoldings } from '../src/services/heliusService.js';

const OUT_DIR = resolve(process.cwd(), 'bukti-data');
mkdirSync(OUT_DIR, { recursive: true });

function save(name, data) {
  writeFileSync(resolve(OUT_DIR, name), JSON.stringify(data, null, 2), 'utf8');
  console.log(`   💾 disimpan → bukti-data/${name}`);
}

// Axios client CoinGecko (header sama persis kayak coingeckoService)
const cg = axios.create({
  baseURL: 'https://api.coingecko.com/api/v3',
  timeout: 15000,
  headers: process.env.COINGECKO_API_KEY
    ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY, accept: 'application/json' }
    : { accept: 'application/json' },
});

const COIN = process.env.BUKTI_COIN ?? 'bitcoin'; // bisa override: BUKTI_COIN=solana

async function main() {
  // ====================================================
  // 1. DATA MENTAH — Respons CoinGecko API
  // ====================================================
  console.log(`\n========== 1. DATA MENTAH: Respons CoinGecko API (${COIN}) ==========`);

  const { data: coinRaw } = await cg.get(`/coins/${COIN}`, {
    params: {
      localization: false,
      tickers: false,
      community_data: false,
      developer_data: false,
      sparkline: false,
    },
  });
  save('1-coingecko-coin-MENTAH.json', coinRaw);
  console.log('   Field mentah yang dipakai sistem:');
  console.table({
    id: coinRaw.id,
    'current_price.usd': coinRaw.market_data.current_price.usd,
    'market_cap.usd': coinRaw.market_data.market_cap.usd,
    'total_volume.usd': coinRaw.market_data.total_volume.usd,
  });

  const { data: histRaw } = await cg.get(`/coins/${COIN}/market_chart`, {
    params: { vs_currency: 'usd', days: 30, interval: 'daily' },
  });
  save('1b-coingecko-history-MENTAH.json', histRaw);
  console.log(`   History harga 30 hari: ${histRaw.prices.length} titik (input volatilitas)`);

  // ====================================================
  // 2. DATA MENTAH — Pembacaan Wallet (Helius / Solana)
  // ====================================================
  const walletAddress = process.argv[2];
  if (walletAddress) {
    console.log(`\n========== 2. DATA MENTAH: Pembacaan Wallet (${walletAddress}) ==========`);

    // 2a. Respons RPC ASLI dari Helius (sebelum dinormalisasi)
    const { data: heliusResp } = await axios.post(
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
      {
        jsonrpc: '2.0',
        id: 'skripsi',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: walletAddress,
          page: 1,
          limit: 1000,
          displayOptions: {
            showFungible: true,
            showNativeBalance: true,
            showZeroBalance: false,
          },
        },
      },
      { headers: { 'content-type': 'application/json' } }
    );
    save('2-wallet-helius-MENTAH.json', heliusResp.result);
    console.log(`   Item mentah dari blockchain (token + NFT): ${heliusResp.result.items?.length ?? 0}`);

    // 2b. Setelah dibaca & dibersihin sistem (filter fungible, balance > 0)
    const holdings = await getSolanaWalletHoldings(walletAddress);
    save('2b-wallet-holdings-BERSIH.json', holdings);
    console.log(`   Setelah difilter sistem: ${holdings.totalAssets} aset fungible`);
    if (holdings.holdings.length) {
      console.table(
        holdings.holdings.map((h) => ({
          symbol: h.symbol,
          balance: h.balance,
          mint: h.mint.slice(0, 12) + '…',
        }))
      );
    }
  } else {
    console.log('\n========== 2. Pembacaan Wallet — DILEWATI ==========');
    console.log('   (Mau ikut? jalanin: node scripts/bukti-data.js <ALAMAT_WALLET_SOLANA>)');
  }

  // ====================================================
  // 3. DATA TERPROSES — Hasil Klasifikasi Risiko
  // ====================================================
  console.log('\n========== 3. DATA TERPROSES: Klasifikasi Risiko (demo portfolio) ==========');
  console.log('   (10 coin asli, balance di-seed, lewat pipeline klasifikasi yang sama)…');

  const scan = await scanDemoPortfolio();
  save('3-data-TERPROSES.json', scan);

  console.table(
    scan.classifiedAssets.map((a) => ({
      symbol: a.symbol,
      'value (USD)': Math.round(a.valueUsd),
      'marketCap (B)': (a.marketCap / 1e9).toFixed(2),
      'volatility 30d': a.volatility.toFixed(4),
      'liq.ratio': a.liquidityRatio.toFixed(4),
      score: a.riskScore,
      risk: a.riskLevel,
    }))
  );

  console.log('   Ringkasan portofolio:');
  console.table({
    'Total Value (USD)': Math.round(scan.summary.totalValueUsd),
    HHI: scan.summary.hhi.toFixed(4),
    'HHI Level': `${scan.summary.hhiLevel} (${scan.summary.hhiLabel})`,
    'Overall Risk Score': scan.summary.overallRiskScore.toFixed(2),
    'Overall Risk Level': scan.summary.overallRiskLevel,
  });

  console.log('\n✅ Selesai. Semua file ada di folder: server/bukti-data/');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Gagal:', err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});

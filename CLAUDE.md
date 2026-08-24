# CLAUDE.md

File ini ngasih konteks ke Claude Code (claude.ai/code) waktu bantuin ngerjain kode di repository ini.

---

## 📌 Konteks Projek

**Judul Skripsi:** Sistem Penilaian Risiko Portofolio Cryptocurrency Berbasis Web Menggunakan Metode Rule-Based Classification

**Author:** Istu Amlu Baihaqqi (NIM 221420010) — Universitas Bina Darma

**Tujuan Sistem:** Web app yang ngitung & ngeklasifikasiin risiko portofolio crypto user berdasarkan data on-chain & market real-time. User connect wallet → sistem ambil holdings → kalkulasi metrik risiko → output klasifikasi (Low/Medium/High Risk) + rekomendasi.

---

## 🏗️ Arsitektur & Stack

### Frontend
- **React.js + Vite** (jangan pakai CRA, udah deprecated)
- **State management:** Context API + useReducer (pakai Redux/Zustand cuma kalau emang udah perlu)
- **Wallet integration:**
  - `@solana/wallet-adapter-react` + `@solana/wallet-adapter-phantom` buat Phantom
  - `@metamask/sdk-react` buat MetaMask (Ethereum)
- **Styling:** TailwindCSS (default), atau plain CSS modules kalau diminta
- **Chart/Visualisasi:** Recharts atau Chart.js buat risk dashboard
- **HTTP client:** Axios (dengan interceptor buat error handling konsisten)

### Backend
- **Node.js + Express** (ES modules, bukan CommonJS)
- **Struktur folder:** `routes/`, `controllers/`, `services/`, `utils/`, `middleware/`, `config/`
- **Validasi input:** `zod` atau `joi`
- **Caching:** `node-cache` in-memory (cukup buat skripsi, gak perlu Redis)
- **Logger:** `winston` atau `pino`
- **CORS:** restrict ke origin frontend doang

### External APIs
| API | Fungsi | Rate Limit | Catatan |
|-----|--------|------------|---------|
| **CoinGecko** | Harga, market cap, volume, volatilitas | 30 calls/min (free) | Selalu cek `/ping` dulu; cache agresif |
| **Phantom Wallet Adapter** | Connect wallet Solana | - | Client-side only |
| **MetaMask SDK** | Connect wallet Ethereum | - | Client-side only |
| **Infura** | RPC Ethereum (saldo, token holdings) | 100k req/day (free) | Simpan API key di `.env` |
| **Helius** | RPC Solana enhanced (token balances, metadata) | 100 req/sec (free) | Lebih bagus dari RPC public |
| **Blockstream** | RPC Bitcoin (kalau Bitcoin masuk scope) | Public, no key | Optional |

---

## 🧮 Logika Risk Assessment (Bagian Inti Skripsi)

### 4 Variabel Risiko

1. **Market Cap** — semakin kecil = semakin berisiko
2. **Volume 24h** — likuiditas market, low volume = high risk
3. **Volatilitas** — standar deviasi return harian (biasanya 30 hari window)
4. **Rasio Likuiditas** — `volume_24h / market_cap`, makin rendah = makin susah exit

### Rule-Based Classification

Implementasi rule-based pakai threshold yang dijelasin di skripsi. Contoh struktur (sesuaikan threshold final sama yang divalidasi supervisor):

```js
// services/riskClassifier.js
function classifyAsset({ marketCap, volume24h, volatility, liquidityRatio }) {
  let score = 0;

  // Rule 1: Market Cap
  if (marketCap < 1e8) score += 3;          // < $100M
  else if (marketCap < 1e9) score += 2;     // $100M–$1B
  else if (marketCap < 1e10) score += 1;    // $1B–$10B
  // else: 0 (large cap)

  // Rule 2: Volume 24h
  if (volume24h < 1e6) score += 3;
  else if (volume24h < 1e7) score += 2;
  else if (volume24h < 1e8) score += 1;

  // Rule 3: Volatilitas (30d)
  if (volatility > 0.15) score += 3;
  else if (volatility > 0.08) score += 2;
  else if (volatility > 0.04) score += 1;

  // Rule 4: Rasio Likuiditas
  if (liquidityRatio < 0.01) score += 3;
  else if (liquidityRatio < 0.05) score += 2;
  else if (liquidityRatio < 0.1) score += 1;

  // Final classification
  if (score >= 9) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
}
```

> ⚠️ **PENTING:** threshold di atas cuma placeholder. Pakai threshold final yang udah diapprove pembimbing & ada justifikasi di BAB 3 skripsi.

### HHI (Herfindahl-Hirschman Index) — Komposisi Portofolio

HHI ngukur konsentrasi portofolio (apakah terdiri dari 1 koin dominan atau terdiversifikasi):

```js
// HHI = Σ(weight_i)²  dimana weight_i = nilai_aset_i / total_nilai_portofolio
function calculateHHI(holdings) {
  const total = holdings.reduce((sum, h) => sum + h.valueUSD, 0);
  if (total === 0) return 0;
  return holdings.reduce((sum, h) => sum + Math.pow(h.valueUSD / total, 2), 0);
}

// Interpretasi:
// HHI < 0.15        → terdiversifikasi (low concentration risk)
// 0.15 ≤ HHI < 0.25 → moderat
// HHI ≥ 0.25        → terkonsentrasi (high concentration risk)
```

### Volatilitas — Rumus

```js
// 1. Ambil harga harian 30 hari terakhir dari CoinGecko /market_chart
// 2. Hitung daily return: r_t = (P_t - P_{t-1}) / P_{t-1}
// 3. Volatilitas = standar deviasi dari array return
function calculateVolatility(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}
```

---

## 🗂️ Struktur Folder yang Diharapkan

```
crypto-risk-assessment/
├── client/                          # Frontend React + Vite
│   ├── src/
│   │   ├── components/              # Komponen reusable (Button, Card, RiskBadge)
│   │   ├── features/                # Fitur per-domain
│   │   │   ├── wallet/              # Connect Phantom/MetaMask
│   │   │   ├── portfolio/           # Display holdings
│   │   │   └── risk-assessment/     # Dashboard hasil analisis
│   │   ├── hooks/                   # useWallet, usePortfolio, useRiskScore
│   │   ├── services/                # API calls ke backend
│   │   ├── context/                 # WalletContext, PortfolioContext
│   │   ├── utils/                   # Formatter, helper
│   │   └── App.jsx
│   ├── .env                         # VITE_API_URL, dll
│   └── vite.config.js
│
├── server/                          # Backend Express
│   ├── src/
│   │   ├── routes/                  # /api/portfolio, /api/risk, /api/market
│   │   ├── controllers/             # Handler per route
│   │   ├── services/
│   │   │   ├── coingeckoService.js
│   │   │   ├── heliusService.js
│   │   │   ├── infuraService.js
│   │   │   ├── riskClassifier.js    # Core rule-based logic
│   │   │   └── portfolioAnalyzer.js # HHI, agregasi
│   │   ├── middleware/              # errorHandler, rateLimiter, validator
│   │   ├── utils/                   # cache, logger
│   │   ├── config/                  # env loader
│   │   └── server.js
│   └── .env                         # COINGECKO_API_KEY, HELIUS_API_KEY, INFURA_PROJECT_ID
│
├── docs/                            # Dokumentasi tambahan buat skripsi
│   ├── api-spec.md
│   └── risk-rules.md                # Justifikasi threshold
│
├── CLAUDE.md                        # File ini
├── README.md
└── .gitignore
```

---

## 🎨 Konvensi Coding

### Umum
- **Bahasa komentar:** Indonesia (sesuai konteks skripsi)
- **Bahasa variable/function:** English (industry standard)
- **Naming:** `camelCase` buat variable/function, `PascalCase` buat komponen React/class
- **File komponen React:** `PascalCase.jsx` (contoh: `RiskBadge.jsx`)
- **File util/service:** `camelCase.js` (contoh: `riskClassifier.js`)

### Backend
- Pakai **async/await**, jangan callback hell
- Setiap controller wajib di-wrap `try/catch` atau pakai `express-async-handler`
- Response format konsisten:
  ```js
  // Success
  { success: true, data: {...} }
  // Error
  { success: false, error: { code: 'COINGECKO_RATE_LIMIT', message: '...' } }
  ```
- Jangan expose API key external ke frontend — semua call ke CoinGecko/Helius/Infura lewat backend

### Frontend
- Pakai **custom hooks** buat logic yang reusable (`useWallet`, `useRiskScore`)
- Komponen kecil & focused (max ~150 baris, kalau lebih split)
- Loading & error state wajib ada di setiap fetch
- Jangan hardcode URL — pakai `import.meta.env.VITE_API_URL`

---

## 🔐 Environment Variables

### `client/.env`
```
VITE_API_URL=http://localhost:5000/api
VITE_SOLANA_NETWORK=mainnet-beta
```

### `server/.env`
```
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# API Keys
COINGECKO_API_KEY=your_demo_key_here
HELIUS_API_KEY=your_key_here
INFURA_PROJECT_ID=your_id_here

# Cache TTL (detik)
CACHE_TTL_PRICE=60
CACHE_TTL_MARKET=300
```

**JANGAN COMMIT `.env`** — sudah masuk `.gitignore`. Bikin `.env.example` buat referensi.

---

## 🧪 Testing & Validasi

- Backend: pakai **Jest** + **Supertest** buat unit test `riskClassifier.js` (paling kritis karena ini inti skripsi)
- Frontend: **Vitest** + **React Testing Library** (opsional kalau waktu mepet)
- **Minimum yang harus ditest:**
  - `riskClassifier.js` — test semua kombinasi threshold (Low/Medium/High)
  - `calculateHHI()` — test edge case (1 aset, portfolio kosong, dll)
  - `calculateVolatility()` — test dengan data harga known

---

## 🚀 Command Penting

```bash
# Setup awal
cd client && npm install
cd ../server && npm install

# Dev mode (jalanin dua-duanya bareng pake concurrently, atau dua terminal)
cd server && npm run dev          # nodemon
cd client && npm run dev          # vite dev server

# Build production
cd client && npm run build
cd server && npm start

# Test
cd server && npm test
```

---

## 🎯 Prioritas Pengembangan (Roadmap Skripsi)

1. **MVP Fase 1 — Backend foundation**
   - Setup Express + folder structure
   - Integrasi CoinGecko (harga + market data)
   - Implementasi `riskClassifier.js` + unit test
   - Endpoint `/api/risk/asset/:id`

2. **MVP Fase 2 — Wallet integration**
   - Setup Phantom Wallet Adapter (Solana dulu, baru Ethereum)
   - Endpoint `/api/portfolio/:walletAddress` (ambil holdings via Helius/Infura)
   - Aggregasi nilai portofolio dalam USD

3. **MVP Fase 3 — Portfolio risk assessment**
   - Kalkulasi HHI
   - Risk dashboard di frontend (chart komposisi, badge risk level per aset, overall portfolio risk)

4. **MVP Fase 4 — Polish**
   - Error handling robust
   - Loading state
   - Responsive design
   - Caching biar gak kena rate limit

5. **Fase Skripsi**
   - Screenshot semua fitur buat BAB 4
   - Tabel testing (input → expected output) buat lampiran
   - Deploy ke Vercel (frontend) + Render/Railway (backend)

---

## ⚠️ Hal yang Harus Diperhatiin Claude

1. **Konteks akademik:** ini skripsi, bukan production app. Prioritas: kode yang **bisa dijelasin** > kode yang super optimal. Hindari abstraction berlebihan yang susah dijelasin pas sidang.

2. **Jangan asumsi threshold:** kalau gw nanya soal angka rule-based, **TANYA dulu** threshold final dari skripsi. Jangan ngarang.

3. **Verify, jangan ngarang:** kalau nyebut endpoint API external, pastiin endpoint itu emang ada. Lebih baik bilang "perlu cek dokumentasi" daripada bikin endpoint fiktif.

4. **Bahasa:** jawab pakai **Bahasa Indonesia informal (register gw/lo)**, code dalam English, komentar code boleh Indonesia.

5. **Output praktis:** kasih kode yang langsung bisa di-copy paste. Jelasin sebelum/sesudah, bukan ditengah-tengah blok kode panjang.

6. **Push-back kalau ada masalah:** kalau gw minta sesuatu yang menurut lo bakal bikin bug atau gak best practice, **kasih tau dulu**, kasih alternatif, baru lanjut kalau gw insist.

7. **Skripsi-friendly:** kalau bikin fitur kompleks, sertain catatan kecil "ini bisa masuk BAB X soal Y" biar gampang dokumentasiin.

---

## 📚 Referensi Penting

- CoinGecko API docs: https://docs.coingecko.com/
- Solana Wallet Adapter: https://github.com/anza-xyz/wallet-adapter
- Helius docs: https://docs.helius.dev/
- Infura docs: https://docs.infura.io/
- MetaMask SDK: https://docs.metamask.io/sdk/

---

*Last updated: [tanggal lo update file ini]*# CLAUDE.md

File ini ngasih konteks ke Claude Code (claude.ai/code) waktu bantuin ngerjain kode di repository ini.

---

## 📌 Konteks Projek

**Judul Skripsi:** Sistem Penilaian Risiko Portofolio Cryptocurrency Berbasis Web Menggunakan Metode Rule-Based Classification

**Author:** Istu Amlu Baihaqqi (NIM 221420010) — Universitas Bina Darma

**Tujuan Sistem:** Web app yang ngitung & ngeklasifikasiin risiko portofolio crypto user berdasarkan data on-chain & market real-time. User connect wallet → sistem ambil holdings → kalkulasi metrik risiko → output klasifikasi (Low/Medium/High Risk) + rekomendasi.

---

## 🏗️ Arsitektur & Stack

### Frontend
- **React.js + Vite** (jangan pakai CRA, udah deprecated)
- **State management:** Context API + useReducer (pakai Redux/Zustand cuma kalau emang udah perlu)
- **Wallet integration:**
  - `@solana/wallet-adapter-react` + `@solana/wallet-adapter-phantom` buat Phantom
  - `@metamask/sdk-react` buat MetaMask (Ethereum)
- **Styling:** TailwindCSS (default), atau plain CSS modules kalau diminta
- **Chart/Visualisasi:** Recharts atau Chart.js buat risk dashboard
- **HTTP client:** Axios (dengan interceptor buat error handling konsisten)

### Backend
- **Node.js + Express** (ES modules, bukan CommonJS)
- **Struktur folder:** `routes/`, `controllers/`, `services/`, `utils/`, `middleware/`, `config/`
- **Validasi input:** `zod` atau `joi`
- **Caching:** `node-cache` in-memory (cukup buat skripsi, gak perlu Redis)
- **Logger:** `winston` atau `pino`
- **CORS:** restrict ke origin frontend doang

### External APIs
| API | Fungsi | Rate Limit | Catatan |
|-----|--------|------------|---------|
| **CoinGecko** | Harga, market cap, volume, volatilitas | 30 calls/min (free) | Selalu cek `/ping` dulu; cache agresif |
| **Phantom Wallet Adapter** | Connect wallet Solana | - | Client-side only |
| **MetaMask SDK** | Connect wallet Ethereum | - | Client-side only |
| **Infura** | RPC Ethereum (saldo, token holdings) | 100k req/day (free) | Simpan API key di `.env` |
| **Helius** | RPC Solana enhanced (token balances, metadata) | 100 req/sec (free) | Lebih bagus dari RPC public |
| **Blockstream** | RPC Bitcoin (kalau Bitcoin masuk scope) | Public, no key | Optional |

---

## 🧮 Logika Risk Assessment (Bagian Inti Skripsi)

### 4 Variabel Risiko

1. **Market Cap** — semakin kecil = semakin berisiko
2. **Volume 24h** — likuiditas market, low volume = high risk
3. **Volatilitas** — standar deviasi return harian (biasanya 30 hari window)
4. **Rasio Likuiditas** — `volume_24h / market_cap`, makin rendah = makin susah exit

### Rule-Based Classification

Implementasi rule-based pakai threshold yang dijelasin di skripsi. Contoh struktur (sesuaikan threshold final sama yang divalidasi supervisor):

```js
// services/riskClassifier.js
function classifyAsset({ marketCap, volume24h, volatility, liquidityRatio }) {
  let score = 0;

  // Rule 1: Market Cap
  if (marketCap < 1e8) score += 3;          // < $100M
  else if (marketCap < 1e9) score += 2;     // $100M–$1B
  else if (marketCap < 1e10) score += 1;    // $1B–$10B
  // else: 0 (large cap)

  // Rule 2: Volume 24h
  if (volume24h < 1e6) score += 3;
  else if (volume24h < 1e7) score += 2;
  else if (volume24h < 1e8) score += 1;

  // Rule 3: Volatilitas (30d)
  if (volatility > 0.15) score += 3;
  else if (volatility > 0.08) score += 2;
  else if (volatility > 0.04) score += 1;

  // Rule 4: Rasio Likuiditas
  if (liquidityRatio < 0.01) score += 3;
  else if (liquidityRatio < 0.05) score += 2;
  else if (liquidityRatio < 0.1) score += 1;

  // Final classification
  if (score >= 9) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
}
```

> ⚠️ **PENTING:** threshold di atas cuma placeholder. Pakai threshold final yang udah diapprove pembimbing & ada justifikasi di BAB 3 skripsi.

### HHI (Herfindahl-Hirschman Index) — Komposisi Portofolio

HHI ngukur konsentrasi portofolio (apakah terdiri dari 1 koin dominan atau terdiversifikasi):

```js
// HHI = Σ(weight_i)²  dimana weight_i = nilai_aset_i / total_nilai_portofolio
function calculateHHI(holdings) {
  const total = holdings.reduce((sum, h) => sum + h.valueUSD, 0);
  if (total === 0) return 0;
  return holdings.reduce((sum, h) => sum + Math.pow(h.valueUSD / total, 2), 0);
}

// Interpretasi:
// HHI < 0.15        → terdiversifikasi (low concentration risk)
// 0.15 ≤ HHI < 0.25 → moderat
// HHI ≥ 0.25        → terkonsentrasi (high concentration risk)
```

### Volatilitas — Rumus

```js
// 1. Ambil harga harian 30 hari terakhir dari CoinGecko /market_chart
// 2. Hitung daily return: r_t = (P_t - P_{t-1}) / P_{t-1}
// 3. Volatilitas = standar deviasi dari array return
function calculateVolatility(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}
```

---

## 🗂️ Struktur Folder yang Diharapkan

```
crypto-risk-assessment/
├── client/                          # Frontend React + Vite
│   ├── src/
│   │   ├── components/              # Komponen reusable (Button, Card, RiskBadge)
│   │   ├── features/                # Fitur per-domain
│   │   │   ├── wallet/              # Connect Phantom/MetaMask
│   │   │   ├── portfolio/           # Display holdings
│   │   │   └── risk-assessment/     # Dashboard hasil analisis
│   │   ├── hooks/                   # useWallet, usePortfolio, useRiskScore
│   │   ├── services/                # API calls ke backend
│   │   ├── context/                 # WalletContext, PortfolioContext
│   │   ├── utils/                   # Formatter, helper
│   │   └── App.jsx
│   ├── .env                         # VITE_API_URL, dll
│   └── vite.config.js
│
├── server/                          # Backend Express
│   ├── src/
│   │   ├── routes/                  # /api/portfolio, /api/risk, /api/market
│   │   ├── controllers/             # Handler per route
│   │   ├── services/
│   │   │   ├── coingeckoService.js
│   │   │   ├── heliusService.js
│   │   │   ├── infuraService.js
│   │   │   ├── riskClassifier.js    # Core rule-based logic
│   │   │   └── portfolioAnalyzer.js # HHI, agregasi
│   │   ├── middleware/              # errorHandler, rateLimiter, validator
│   │   ├── utils/                   # cache, logger
│   │   ├── config/                  # env loader
│   │   └── server.js
│   └── .env                         # COINGECKO_API_KEY, HELIUS_API_KEY, INFURA_PROJECT_ID
│
├── docs/                            # Dokumentasi tambahan buat skripsi
│   ├── api-spec.md
│   └── risk-rules.md                # Justifikasi threshold
│
├── CLAUDE.md                        # File ini
├── README.md
└── .gitignore
```

---

## 🎨 Konvensi Coding

### Umum
- **Bahasa komentar:** Indonesia (sesuai konteks skripsi)
- **Bahasa variable/function:** English (industry standard)
- **Naming:** `camelCase` buat variable/function, `PascalCase` buat komponen React/class
- **File komponen React:** `PascalCase.jsx` (contoh: `RiskBadge.jsx`)
- **File util/service:** `camelCase.js` (contoh: `riskClassifier.js`)

### Backend
- Pakai **async/await**, jangan callback hell
- Setiap controller wajib di-wrap `try/catch` atau pakai `express-async-handler`
- Response format konsisten:
  ```js
  // Success
  { success: true, data: {...} }
  // Error
  { success: false, error: { code: 'COINGECKO_RATE_LIMIT', message: '...' } }
  ```
- Jangan expose API key external ke frontend — semua call ke CoinGecko/Helius/Infura lewat backend

### Frontend
- Pakai **custom hooks** buat logic yang reusable (`useWallet`, `useRiskScore`)
- Komponen kecil & focused (max ~150 baris, kalau lebih split)
- Loading & error state wajib ada di setiap fetch
- Jangan hardcode URL — pakai `import.meta.env.VITE_API_URL`

---

## 🔐 Environment Variables

### `client/.env`
```
VITE_API_URL=http://localhost:5000/api
VITE_SOLANA_NETWORK=mainnet-beta
```

### `server/.env`
```
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# API Keys
COINGECKO_API_KEY=your_demo_key_here
HELIUS_API_KEY=your_key_here
INFURA_PROJECT_ID=your_id_here

# Cache TTL (detik)
CACHE_TTL_PRICE=60
CACHE_TTL_MARKET=300
```

**JANGAN COMMIT `.env`** — sudah masuk `.gitignore`. Bikin `.env.example` buat referensi.

---

## 🧪 Testing & Validasi

- Backend: pakai **Jest** + **Supertest** buat unit test `riskClassifier.js` (paling kritis karena ini inti skripsi)
- Frontend: **Vitest** + **React Testing Library** (opsional kalau waktu mepet)
- **Minimum yang harus ditest:**
  - `riskClassifier.js` — test semua kombinasi threshold (Low/Medium/High)
  - `calculateHHI()` — test edge case (1 aset, portfolio kosong, dll)
  - `calculateVolatility()` — test dengan data harga known

---

## 🚀 Command Penting

```bash
# Setup awal
cd client && npm install
cd ../server && npm install

# Dev mode (jalanin dua-duanya bareng pake concurrently, atau dua terminal)
cd server && npm run dev          # nodemon
cd client && npm run dev          # vite dev server

# Build production
cd client && npm run build
cd server && npm start

# Test
cd server && npm test
```

---

## 🎯 Prioritas Pengembangan (Roadmap Skripsi)

1. **MVP Fase 1 — Backend foundation**
   - Setup Express + folder structure
   - Integrasi CoinGecko (harga + market data)
   - Implementasi `riskClassifier.js` + unit test
   - Endpoint `/api/risk/asset/:id`

2. **MVP Fase 2 — Wallet integration**
   - Setup Phantom Wallet Adapter (Solana dulu, baru Ethereum)
   - Endpoint `/api/portfolio/:walletAddress` (ambil holdings via Helius/Infura)
   - Aggregasi nilai portofolio dalam USD

3. **MVP Fase 3 — Portfolio risk assessment**
   - Kalkulasi HHI
   - Risk dashboard di frontend (chart komposisi, badge risk level per aset, overall portfolio risk)

4. **MVP Fase 4 — Polish**
   - Error handling robust
   - Loading state
   - Responsive design
   - Caching biar gak kena rate limit

5. **Fase Skripsi**
   - Screenshot semua fitur buat BAB 4
   - Tabel testing (input → expected output) buat lampiran
   - Deploy ke Vercel (frontend) + Render/Railway (backend)

---

## ⚠️ Hal yang Harus Diperhatiin Claude

1. **Konteks akademik:** ini skripsi, bukan production app. Prioritas: kode yang **bisa dijelasin** > kode yang super optimal. Hindari abstraction berlebihan yang susah dijelasin pas sidang.

2. **Jangan asumsi threshold:** kalau gw nanya soal angka rule-based, **TANYA dulu** threshold final dari skripsi. Jangan ngarang.

3. **Verify, jangan ngarang:** kalau nyebut endpoint API external, pastiin endpoint itu emang ada. Lebih baik bilang "perlu cek dokumentasi" daripada bikin endpoint fiktif.

4. **Bahasa:** jawab pakai **Bahasa Indonesia informal (register gw/lo)**, code dalam English, komentar code boleh Indonesia.

5. **Output praktis:** kasih kode yang langsung bisa di-copy paste. Jelasin sebelum/sesudah, bukan ditengah-tengah blok kode panjang.

6. **Push-back kalau ada masalah:** kalau gw minta sesuatu yang menurut lo bakal bikin bug atau gak best practice, **kasih tau dulu**, kasih alternatif, baru lanjut kalau gw insist.

7. **Skripsi-friendly:** kalau bikin fitur kompleks, sertain catatan kecil "ini bisa masuk BAB X soal Y" biar gampang dokumentasiin.

---

## 📚 Referensi Penting

- CoinGecko API docs: https://docs.coingecko.com/
- Solana Wallet Adapter: https://github.com/anza-xyz/wallet-adapter
- Helius docs: https://docs.helius.dev/
- Infura docs: https://docs.infura.io/
- MetaMask SDK: https://docs.metamask.io/sdk/

---

*Last updated: [tanggal lo update file ini]*
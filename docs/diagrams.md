# Diagram Sistem — Penilaian Risiko Portofolio Cryptocurrency

> Semua diagram pakai **Mermaid** (bisa di-render langsung di GitHub, VS Code +
> ekstensi Mermaid, atau https://mermaid.live). Diagram ini dibikin dari kode
> aktual (routes, services, Prisma schema), bukan placeholder.
>
> Buat skripsi: Use Case & Activity → BAB 3 (Perancangan), Class & Arsitektur →
> BAB 3/BAB 4 (Implementasi).

---

## 1. Use Case Diagram

Menggambarkan interaksi User (pemilik wallet) dengan sistem. Sistem
berkomunikasi dengan API eksternal (CoinGecko, Helius, Alchemy, Blockstream).

```mermaid
flowchart LR
    user(("👤 User<br/>Pemilik Wallet"))

    subgraph SYS["Sistem Penilaian Risiko Portofolio Crypto"]
        direction TB
        uc1(["Request Nonce"])
        uc2(["Login via Tanda Tangan Wallet"])
        uc3(["Lihat Profil (me)"])
        uc4(["Tambah Tracked Wallet"])
        uc5(["Lihat Daftar Tracked Wallet"])
        uc6(["Hapus Tracked Wallet"])
        uc7(["Lihat Holdings Wallet"])
        uc8(["Scan Portofolio (Solana/ETH/BTC)"])
        uc9(["Scan Portofolio Demo"])
        uc10(["Lihat Riwayat Scan"])
        uc11(["Lihat Detail Hasil Scan"])
        uc12(["Lihat Data Risiko per Aset"])
    end

    cg(["☁️ CoinGecko API"])
    helius(["☁️ Helius RPC (Solana)"])
    alchemy(["☁️ Alchemy RPC (Ethereum)"])
    bs(["☁️ Blockstream API (Bitcoin)"])

    user --> uc1 & uc2 & uc3 & uc4 & uc5 & uc6 & uc7 & uc8 & uc9 & uc10 & uc11 & uc12

    uc2 -. include .-> uc1
    uc8 -. include .-> uc7

    uc7 --> helius & alchemy & bs
    uc8 --> helius & alchemy & bs
    uc8 --> cg
    uc9 --> cg
    uc12 --> cg
```

**Catatan boundary:**
- `Login` **include** `Request Nonce` (nonce wajib didapat dulu sebelum sign).
- `Scan Portofolio` butuh holdings (RPC chain) **dan** data market (CoinGecko).
- Bitcoin cuma bisa di-*track*/scan, **gak bisa login** (gak ada standar sign-in web).

---

## 2. Activity Diagram — Scan Portofolio

Alur lengkap saat User trigger `POST /api/scan/:chainType/:address`.
Mengikuti orchestrator di `portfolioScanService.js`.

```mermaid
flowchart TD
    start([User trigger Scan Portofolio]) --> auth{JWT valid?}
    auth -- Tidak --> err401[401 Unauthorized] --> stop1([Selesai])
    auth -- Ya --> validate{Format address<br/>& chainType valid?}
    validate -- Tidak --> err400[400 INVALID_ADDRESS] --> stop2([Selesai])
    validate -- Ya --> own{User pemilik address?<br/>primary / tracked}
    own -- Tidak --> err403[403 FORBIDDEN] --> stop3([Selesai])

    own -- Ya --> fetch[Ambil holdings dari RPC chain<br/>Helius / Alchemy / Blockstream]
    fetch --> empty{Ada holding?}
    empty -- Tidak --> err422a[422 EMPTY_WALLET] --> stop4([Selesai])

    empty -- Ya --> resolve[Resolve mint/contract → coingeckoId<br/>via CoinGecko coin list]
    resolve --> split[Split: classifiable vs unclassified]
    split --> hasClass{Ada aset<br/>classifiable?}
    hasClass -- Tidak --> err422b[422 NO_CLASSIFIABLE_ASSETS] --> stop5([Selesai])

    hasClass -- Ya --> enrich[Per aset paralel - batasi konkurensi:<br/>fetch market data + history 30d]
    enrich --> calc[Hitung volatilitas 30d<br/>+ rasio likuiditas]
    calc --> classify[classifyAsset - rule-based<br/>skor 0-12 → Low/Medium/High]
    classify --> anyOk{Min. 1 aset<br/>berhasil?}
    anyOk -- Tidak --> err422c[422 ALL_ASSETS_FAILED] --> stop6([Selesai])

    anyOk -- Ya --> agg[Agregasi: total value, weights,<br/>HHI + interpretasi, overall risk tertimbang]
    agg --> persist[(Simpan Scan + AssetSnapshot[]<br/>dalam 1 transaksi DB)]
    persist --> resp[Return hasil scan + scanId]
    resp --> done([Selesai])
```

---

## 3. Class Diagram

Dua kelompok: **(A)** modul service/logic backend dan **(B)** entitas data (Prisma).
Service di-style sebagai modul fungsi (project pakai ES module functional, bukan OOP).

### 3A. Modul Service & Logika Inti

```mermaid
classDiagram
    class scanController {
        +triggerScan(req, res)
        +triggerDemoScan(req, res)
        +listScans(req, res)
        +getScanDetail(req, res)
    }
    class portfolioScanService {
        +scanPortfolio(chainType, address)
        +scanSolanaPortfolio(address)
        +scanEthereumPortfolio(address)
        +scanBitcoinPortfolio(address)
        +scanDemoPortfolio(address)
        -classifyHoldings(args)
        -enrichAndClassify(asset)
    }
    class riskClassifier {
        +classifyAsset(input) Classification
        +determineRiskLevel(score) string
        +scoreMarketCap(value)
        +scoreVolume24h(value)
        +scoreVolatility(value)
        +scoreLiquidityRatio(value)
    }
    class portfolioAnalyzer {
        +calculateVolatility(prices) number
        +calculateHHI(holdings) number
        +interpretHHI(hhi) object
    }
    class coingeckoService {
        +getCoinMarketData(id)
        +getCoinHistoricalPrices(id, days)
        +pingCoinGecko()
    }
    class coinResolver {
        +resolveMints(mints) Map
        +resolveEthContracts(addrs) Map
    }
    class heliusService {
        +getSolanaWalletHoldings(addr)
    }
    class alchemyService {
        +getEthereumWalletHoldings(addr)
    }
    class blockstreamService {
        +getBitcoinWalletHoldings(addr)
    }
    class authService {
        +generateNonce(addr)
        +verifyAuthRequest(args)
        +issueJwt(payload)
        +verifyJwt(token)
    }

    scanController ..> portfolioScanService : memanggil
    portfolioScanService ..> heliusService : holdings (SOLANA)
    portfolioScanService ..> alchemyService : holdings (ETHEREUM)
    portfolioScanService ..> blockstreamService : holdings (BITCOIN)
    portfolioScanService ..> coinResolver : resolve coingeckoId
    portfolioScanService ..> coingeckoService : market + history
    portfolioScanService ..> portfolioAnalyzer : volatilitas, HHI
    portfolioScanService ..> riskClassifier : klasifikasi rule-based
    coinResolver ..> coingeckoService : coin list
```

### 3B. Entity / Data Model (Prisma)

```mermaid
classDiagram
    class User {
        +String id
        +String primaryWallet
        +ChainType chainType
        +DateTime createdAt
        +DateTime lastLoginAt
    }
    class TrackedWallet {
        +String id
        +String userId
        +String address
        +ChainType chainType
        +String? label
        +DateTime addedAt
    }
    class Scan {
        +String id
        +String userId
        +String? scannedAddress
        +DateTime scannedAt
        +Float totalValueUsd
        +Float hhi
        +ConcentrationLevel hhiLevel
        +Float overallRiskScore
        +RiskLevel overallRiskLevel
        +Int assetCount
    }
    class AssetSnapshot {
        +String id
        +String scanId
        +String coingeckoId
        +String symbol
        +String name
        +ChainType chainType
        +Float balance
        +Float priceUsd
        +Float valueUsd
        +Float marketCap
        +Float volume24h
        +Float volatility30d
        +Float liquidityRatio
        +Int riskScore
        +RiskLevel riskLevel
        +Float weight
    }
    class PriceCache {
        +String coingeckoId
        +String symbol
        +Float priceUsd
        +Float? marketCap
        +Float? volume24h
        +Float? volatility30d
        +DateTime updatedAt
    }

    User "1" --> "0..*" TrackedWallet : memiliki
    User "1" --> "0..*" Scan : melakukan
    Scan "1" --> "1..*" AssetSnapshot : berisi
```

> `PriceCache` berdiri sendiri (tanpa relasi) — cache persisten data CoinGecko,
> bisa di-share lintas user & survive restart.

---

## 4. Diagram Arsitektur Sistem

Arsitektur 3-tier: Client (React) → Backend (Express) → Data (PostgreSQL) + API eksternal.

```mermaid
flowchart TB
    subgraph CLIENT["🖥️ Frontend — React + Vite"]
        ui[Pages & Komponen<br/>Dashboard, History, Composition]
        wallet[Wallet Adapter<br/>Phantom / MetaMask]
        ctx[Context: Auth, Portfolio, Toast]
        api[apiClient - Axios + interceptor]
        ui --> ctx --> api
        wallet --> ctx
    end

    subgraph SERVER["⚙️ Backend — Node.js + Express ESM"]
        direction TB
        mw[Middleware<br/>CORS · rateLimiter · requireAuth · errorHandler]
        subgraph ROUTES["Routes /api"]
            r1[/auth/]
            r2[/market/]
            r3[/risk/]
            r4[/wallet/]
            r5[/scan/]
        end
        subgraph CTRL["Controllers"]
            c1[authController]
            c4[walletController]
            c5[scanController]
        end
        subgraph SVC["Services / Logic"]
            s_auth[authService - nonce, JWT, verify sig]
            s_scan[portfolioScanService - orchestrator]
            s_risk[riskClassifier - rule-based]
            s_an[portfolioAnalyzer - volatilitas, HHI]
            s_cg[coingeckoService]
            s_chain[helius / alchemy / blockstream]
        end
        cacheU[node-cache in-memory]
        mw --> ROUTES --> CTRL
        c5 --> s_scan
        s_scan --> s_risk & s_an & s_cg & s_chain
        c1 --> s_auth
        s_cg --> cacheU
    end

    db[(PostgreSQL<br/>via Prisma ORM<br/>User · TrackedWallet · Scan · AssetSnapshot · PriceCache)]

    cg[☁️ CoinGecko API]
    helius[☁️ Helius RPC - Solana]
    alchemy[☁️ Alchemy RPC - Ethereum]
    bs[☁️ Blockstream - Bitcoin]

    api -- HTTPS / JSON + JWT --> mw
    CTRL -- Prisma Client --> db
    s_cg --> cg
    s_chain --> helius & alchemy & bs

    classDef ext fill:#fde68a,stroke:#b45309,color:#000
    class cg,helius,alchemy,bs ext
```

**Prinsip arsitektur kunci (buat dijelasin pas sidang):**
1. **API key disembunyiin di backend** — frontend gak pernah pegang key CoinGecko/Helius/Alchemy.
2. **Logika inti skripsi (rule-based + HHI) terisolasi** di `riskClassifier.js` & `portfolioAnalyzer.js`, gampang di-unit-test.
3. **Chain-agnostic orchestrator** — `classifyHoldings()` ditulis sekali, dipakai semua chain (Solana/ETH/BTC) + demo.
4. **Caching** di `coingeckoService` (node-cache) + `PriceCache` (DB) buat hindari rate limit CoinGecko (30 calls/min free tier).
```

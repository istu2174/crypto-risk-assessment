# FRONTEND_SPEC.md

> Spesifikasi frontend untuk **Sistem Penilaian Risiko Portofolio Cryptocurrency**
> Dibuat untuk dikerjakan oleh AI coding agent (Claude Code) di terminal.
> Baca file ini bareng `CLAUDE.md` sebelum mulai. Kerjakan per fase, jangan lompat.

---

## 1. Konteks Sistem

Aplikasi web untuk menilai risiko portofolio cryptocurrency secara **read-only multi-chain** (Solana, Ethereum, Bitcoin). User connect wallet atau input address manual, sistem fetch data on-chain + market, lalu hitung skor risiko.

**Bukan** cross-chain bridge. Hanya agregasi & analisa read-only.

### Metode inti yang harus tervisualisasi di UI
- **4 variabel risiko per aset**: market cap, volume 24h, volatilitas, rasio likuiditas
- **Rule-Based Classification** → label risiko Low / Medium / High
- **HHI (Herfindahl-Hirschman Index)** → konsentrasi komposisi portofolio

---

## 2. Tech Stack (frontend)

- **Framework**: React.js + Vite
- **Bahasa**: JavaScript (atau TypeScript bila CLAUDE.md menyatakan demikian)
- **Routing**: React Router v6
- **State**: mulai dengan Context API + hooks. Jangan tambah Redux kecuali benar-benar perlu.
- **HTTP client**: axios (instance terpusat dengan baseURL ke backend)
- **Wallet**:
  - Phantom Wallet Adapter (Solana)
  - MetaMask SDK (Ethereum)
- **Chart**: recharts (donut/gauge/bar)
- **Styling**: (ikuti keputusan di CLAUDE.md — Tailwind / CSS Modules)

### Integrasi backend
- Backend: Node.js + Express, jalan di `http://localhost:5000`
- Auth: Ed25519/ECDSA signature → JWT
- Validasi: Zod (di sisi backend)
- Frontend **tidak** memanggil CoinGecko/Helius/Infura/Blockstream langsung. Semua lewat backend.

---

## 3. Konvensi Kode

- Komentar dalam **Bahasa Indonesia**
- Nama variabel/fungsi dalam **English**
- Komponen: **PascalCase** (`AssetTable.jsx`)
- Fungsi & variabel: **camelCase** (`fetchPortfolio`)
- Satu komponen = satu file
- Semua call API lewat layer service (`src/services/`), jangan fetch langsung di komponen
- Selalu handle 3 state: loading, error, empty

---

## 4. Struktur Folder Target

```
src/
├── assets/                  # ikon chain, logo, gambar statis
├── components/
│   ├── common/              # komponen global reusable
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── RiskBadge.jsx
│   │   ├── ChainIcon.jsx
│   │   ├── ValueDisplay.jsx
│   │   ├── LoadingState.jsx
│   │   ├── EmptyState.jsx
│   │   └── ErrorState.jsx
│   ├── landing/
│   ├── auth/
│   ├── dashboard/
│   ├── coin/
│   ├── composition/
│   ├── history/
│   └── methodology/
├── pages/                   # satu file per route
│   ├── LandingPage.jsx
│   ├── AuthPage.jsx
│   ├── DashboardPage.jsx
│   ├── CoinDetailPage.jsx
│   ├── CompositionPage.jsx
│   ├── HistoryPage.jsx
│   └── MethodologyPage.jsx
├── services/                # layer komunikasi API
│   ├── apiClient.js         # instance axios + interceptor JWT
│   ├── authService.js
│   ├── portfolioService.js
│   └── riskService.js
├── context/
│   ├── AuthContext.jsx      # JWT + wallet state
│   └── PortfolioContext.jsx
├── hooks/                   # custom hooks (useWallet, usePortfolio, dll)
├── utils/                   # formatter angka, helper threshold, dll
├── routes/
│   └── AppRoutes.jsx
├── App.jsx
└── main.jsx
```

---

## 5. Routing

| Path | Page | Akses |
|------|------|-------|
| `/` | LandingPage | Publik |
| `/connect` | AuthPage | Publik |
| `/dashboard` | DashboardPage | Perlu auth/address |
| `/coin/:chain/:address` | CoinDetailPage | Perlu auth/address |
| `/composition` | CompositionPage | Perlu auth/address |
| `/history` | HistoryPage | Perlu auth |
| `/methodology` | MethodologyPage | Publik |

Route terproteksi pakai komponen `<ProtectedRoute>` yang cek token/address di `AuthContext`.

---

## 6. Komponen Global (bikin duluan)

| Komponen | Props | Fungsi |
|----------|-------|--------|
| `Navbar` | — | Logo, nav link, status wallet (address + chain badge), tombol disconnect |
| `Sidebar` | — | Navigasi utama (Dashboard, Composition, History, Methodology) |
| `RiskBadge` | `level: "low"\|"medium"\|"high"` | Badge warna konsisten (hijau/kuning/merah) |
| `ChainIcon` | `chain: "sol"\|"eth"\|"btc"` | Ikon + warna per chain |
| `ValueDisplay` | `value`, `type: "currency"\|"percent"\|"compact"` | Format angka konsisten ($1.2M, 24.5%) |
| `LoadingState` | `message?` | Skeleton/spinner saat fetch |
| `EmptyState` | `message`, `icon?` | Saat tidak ada data |
| `ErrorState` | `error`, `onRetry?` | Saat call API gagal |

---

## 7. Breakdown Komponen per Page

### 7.1 LandingPage
- `Hero` — judul sistem, tagline, CTA ganda (Connect Wallet / Analisa Manual)
- `VariableCards` — 4 kartu (icon + nama + 1 kalimat) untuk tiap variabel risiko
- `HowItWorks` — 3–4 step flow (connect → fetch → analisa → hasil)
- `ChainSupport` — badge Solana/Ethereum/Bitcoin
- `Footer` — info skripsi: Istu Amlu Baihaqqi, NIM 221420010, Universitas Bina Darma

### 7.2 AuthPage
- `WalletConnectModal` — pilih Phantom (SOL) vs MetaMask (ETH)
- `SignMessagePrompt` — UI saat user diminta sign message untuk verifikasi
- `ManualAddressForm` — input address + dropdown chain (mode read-only tanpa connect)
- `AuthStatusHandler` — kelola state: idle → connecting → signing → verifying → success/error
- **Wajib handle**: wallet di-reject, signature gagal verifikasi, address invalid

### 7.3 DashboardPage (inti)
- `PortfolioSummaryCard` — total value, jumlah aset, breakdown per chain
- `OverallRiskScore` — hasil Rule-Based Classification, badge besar + label
- `HHIGauge` — gauge mini konsentrasi (versi ringkas)
- `AssetTable` — tabel utama. Kolom: koin | chain | value | market cap | vol 24h | volatilitas | likuiditas | RiskBadge. Klik row → `/coin/:chain/:address`
- `RefreshControl` — tombol refresh + timestamp "data per ..." (CoinGecko ada rate limit, info-kan kapan terakhir fetch)
- `ChainFilter` — filter tampilan per chain

### 7.4 CoinDetailPage
- `CoinHeader` — nama, simbol, chain, harga sekarang
- `VariableBreakdown` — 4 kartu; tiap kartu: nilai mentah + threshold yang dipakai + status (di bawah/atas threshold)
- `ClassificationExplainer` — **PRIORITAS**: jelaskan step-by-step kenapa koin ini dapat risk level X berdasarkan rule. Transparansi rule-based.
- `RawDataAccordion` — data mentah dari API (collapsible) untuk debugging + bukti sumber data

### 7.5 CompositionPage (HHI)
- `AllocationChart` — donut chart alokasi tiap aset (% dari total)
- `HHIScoreCard` — nilai HHI + interpretasi (terkonsentrasi / sedang / terdiversifikasi)
- `HHIFormulaDisplay` — **PRIORITAS**: tampilkan rumus + cara hitung dari portofolio user
- `ConcentrationTable` — kontribusi tiap aset ke HHI (aset | weight | weight²)

### 7.6 HistoryPage
- `HistoryList` — list assessment per timestamp (tanggal, total value, overall risk, HHI)
- `HistoryDetailDrawer` — klik item → snapshot lengkap saat itu
- `HistoryFilter` — filter by tanggal / risk level
- `DeleteHistoryItem` — hapus entri (konfirmasi dulu)

### 7.7 MethodologyPage
- `MethodologySection` — penjelasan tiap variabel + rumus (volatilitas, HHI)
- `ThresholdTable` — tabel threshold Rule-Based yang dipakai
- `DataSourceList` — sumber data per chain: CoinGecko, Helius (SOL), Infura (ETH), Blockstream (BTC)
- `ReferenceNote` — sitasi kunci (mis. Rhoades 1993 untuk HHI)

> Catatan: `ClassificationExplainer` dan `HHIFormulaDisplay` adalah komponen yang paling dihargai saat sidang — sistem harus menunjukkan **kenapa**, bukan cuma hasil akhir. Jangan di-skip.

---

## 8. Urutan Pengerjaan (Prompt Berurutan untuk Claude Code)

Eksekusi satu per satu. Selesaikan & verifikasi tiap fase sebelum lanjut.

### Fase 0 — Setup
```
Scaffold proyek React + Vite sesuai struktur folder di FRONTEND_SPEC.md bagian 4.
Pasang dependency: react-router-dom, axios, recharts.
Buat apiClient.js dengan instance axios baseURL http://localhost:5000 dan interceptor
yang menyisipkan JWT dari AuthContext. Belum perlu styling, fokus struktur.
```

### Fase 1 — Komponen global + routing
```
Implementasikan semua komponen di bagian 6 (Komponen Global) dan AppRoutes.jsx
sesuai tabel routing bagian 5. Buat ProtectedRoute. Pakai data dummy/placeholder dulu.
```

### Fase 2 — Auth & wallet
```
Implementasikan AuthPage (bagian 7.2) + AuthContext.
Integrasi Phantom Wallet Adapter dan MetaMask SDK untuk connect + sign message.
Kirim signature ke backend untuk verifikasi, simpan JWT. Sediakan mode manual address.
Handle semua error state yang disebut di spec.
```

### Fase 3 — Dashboard
```
Implementasikan DashboardPage (bagian 7.3) + portfolioService + PortfolioContext.
Ambil data portofolio dari backend, render AssetTable, OverallRiskScore, HHIGauge,
PortfolioSummaryCard. Handle loading/error/empty.
```

### Fase 4 — Coin detail
```
Implementasikan CoinDetailPage (bagian 7.4). Fokus pada ClassificationExplainer yang
menampilkan logika rule-based secara transparan (nilai vs threshold per variabel).
```

### Fase 5 — Composition (HHI)
```
Implementasikan CompositionPage (bagian 7.5) dengan AllocationChart (recharts donut),
HHIScoreCard, HHIFormulaDisplay, dan ConcentrationTable.
```

### Fase 6 — History
```
Implementasikan HistoryPage (bagian 7.6) terhubung ke endpoint riwayat backend.
```

### Fase 7 — Methodology + polish
```
Implementasikan MethodologyPage (bagian 7.7). Lalu rapikan styling, responsivitas,
dan konsistensi RiskBadge/ValueDisplay di seluruh page.
```

---

## 9. Yang TIDAK boleh dilakukan agent

- Jangan memanggil API pihak ketiga (CoinGecko/Helius/Infura/Blockstream) langsung dari frontend.
- Jangan hardcode threshold di komponen — ambil dari backend atau dari satu file config terpusat (threshold masih menunggu finalisasi pembimbing).
- Jangan menulis private key / seed phrase ke mana pun. Wallet hanya untuk sign message read-only.
- Jangan menambah library besar (Redux, dsb) tanpa alasan jelas.
- Jangan mengubah kontrak/endpoint backend tanpa instruksi.

---

## 10. Definition of Done per page

- [ ] Loading, error, empty state tertangani
- [ ] Data diambil lewat layer service, bukan fetch langsung di komponen
- [ ] Komponen reusable (RiskBadge, ValueDisplay, ChainIcon) dipakai konsisten
- [ ] Responsif (minimal layak di laptop untuk demo sidang)
- [ ] Tidak ada warning React di console

# Sistem Penilaian Risiko Portofolio Cryptocurrency

Skripsi — Istu Amlu Baihaqqi (NIM 221420010), Universitas Bina Darma.

Web app berbasis **Rule-Based Classification** yang ngitung & ngeklasifikasiin risiko portofolio cryptocurrency user (Low / Medium / High) berdasarkan data on-chain & market real-time.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite + TailwindCSS v4 |
| Backend | Node.js + Express 5 (ES Modules) |
| Database | PostgreSQL (Supabase) + Prisma _(belum diimplementasi)_ |
| Wallet | Phantom (Solana), MetaMask (Ethereum), paste address (BTC) |
| External API | CoinGecko, Helius, Infura, Blockstream |

---

## Setup

Prasyarat: **Node.js >= 20**.

```bash
# 1. Install deps
cd client && npm install
cd ../server && npm install

# 2. Copy env template
cp client/.env.example client/.env
cp server/.env.example server/.env
# Edit server/.env, isi API key kalau ada (CoinGecko bisa kosong dulu — free tier)
```

---

## Run (Dev Mode)

Buka **dua terminal**:

```bash
# Terminal 1 — backend
cd server
npm run dev          # nodemon, port 5000

# Terminal 2 — frontend
cd client
npm run dev          # vite, port 5173
```

Test backend jalan:

```bash
curl http://localhost:5000/api/health
```

---

## Struktur

```
crypto-risk-assessment/
├── client/        React + Vite frontend
├── server/        Express backend
├── CLAUDE.md      Konteks projek buat AI pair programmer
└── README.md
```

---

## Build (Production)

```bash
cd client && npm run build       # output: client/dist/
cd ../server && npm start
```

---

## Roadmap

Liat CLAUDE.md bagian "Prioritas Pengembangan".

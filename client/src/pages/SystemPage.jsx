import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import FadeIn from '../components/motion/FadeIn.jsx';
import StaggerWords from '../components/motion/StaggerWords.jsx';
import TiltCard from '../components/motion/TiltCard.jsx';

/**
 * SystemPage ("/system") — "Tentang Sistem".
 * Cerita teknis di balik aplikasi: arsitektur, tech stack, fitur unggulan,
 * alur data, metode klasifikasi, keamanan, dan batasan.
 * Bahasa motion sama dengan HomePage: aurora, stagger headline, kartu tilt 3D.
 */

// 3 lapisan arsitektur (client → server → sumber data)
const LAYERS = [
  {
    tag: 'Frontend',
    title: 'Antarmuka Pengguna',
    desc: 'React + Vite dengan TailwindCSS. Menangani koneksi wallet, menampilkan dashboard risiko, grafik komposisi, dan riwayat scan.',
    items: ['React 19', 'Vite', 'TailwindCSS', 'React Router'],
    accent: 'from-[#06c] to-[#0a84ff]',
  },
  {
    tag: 'Backend',
    title: 'Mesin Klasifikasi',
    desc: 'Node.js + Express. Mengambil holdings on-chain, menarik data pasar, lalu menjalankan logika Rule-Based Classification & menghitung HHI.',
    items: ['Node.js', 'Express', 'Prisma', 'PostgreSQL'],
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    tag: 'Sumber Data',
    title: 'On-Chain & Pasar',
    desc: 'RPC blockchain untuk membaca saldo wallet, dan CoinGecko untuk harga, market cap, volume, serta histori volatilitas.',
    items: ['CoinGecko', 'Helius (SOL)', 'Alchemy (ETH)', 'Blockstream (BTC)'],
    accent: 'from-violet-500 to-fuchsia-500',
  },
];

const STACK = [
  {
    group: 'Frontend',
    color: 'text-[#06c]',
    tools: [
      ['React + Vite', 'UI reaktif & build cepat'],
      ['TailwindCSS', 'Styling utility-first'],
      ['Context API', 'State auth & portofolio'],
      ['Recharts', 'Visualisasi komposisi'],
    ],
  },
  {
    group: 'Backend',
    color: 'text-emerald-600',
    tools: [
      ['Express (ESM)', 'REST API'],
      ['Prisma + PostgreSQL', 'Persistensi scan'],
      ['Zod', 'Validasi input'],
      ['node-cache', 'Cache anti rate-limit'],
    ],
  },
  {
    group: 'Blockchain & Wallet',
    color: 'text-violet-600',
    tools: [
      ['Phantom', 'Login Solana'],
      ['MetaMask (EIP-6963)', 'Login Ethereum'],
      ['Helius / Alchemy', 'Baca token holdings'],
      ['CoinGecko', 'Data pasar real-time'],
    ],
  },
];

const FEATURES = [
  {
    title: 'Multi-Chain',
    desc: 'Scan aset di Solana, Ethereum, dan Bitcoin dalam satu portofolio.',
    icon: 'M4 7h16 M4 12h16 M4 17h16',
  },
  {
    title: 'Rule-Based Scoring',
    desc: 'Klasifikasi transparan & bisa dijelaskan — bukan black-box ML.',
    icon: 'm9 11 3 3 8-8 M21 12a9 9 0 1 1-6.2-8.5',
  },
  {
    title: 'Demo Mode',
    desc: 'Coba scan portofolio contoh dari coin asli tanpa perlu isi wallet.',
    icon: 'M5 3l14 9-14 9V3z',
  },
  {
    title: 'Analisis HHI',
    desc: 'Ukur konsentrasi portofolio — terdiversifikasi atau menumpuk di 1 koin.',
    icon: 'M3 3v18h18 M7 16l4-4 3 3 5-6',
  },
  {
    title: 'Caching Cerdas',
    desc: 'Data pasar di-cache agar hemat kuota CoinGecko & respons cepat.',
    icon: 'M12 2a10 10 0 1 0 10 10 M12 6v6l4 2',
  },
  {
    title: 'Riwayat Scan',
    desc: 'Tiap scan tersimpan, bisa dibuka lagi untuk perbandingan dari waktu ke waktu.',
    icon: 'M3 3v5h5 M3.05 13A9 9 0 1 0 6 5.3L3 8',
  },
];

const FLOW = [
  'Connect wallet (Phantom / MetaMask) atau masukkan address publik',
  'Backend membaca token holdings dari RPC blockchain',
  'Tiap token dicocokkan & ditarik data pasarnya dari CoinGecko',
  'Logika Rule-Based menghitung skor risiko 0–12 per aset',
  'HHI mengukur konsentrasi seluruh portofolio',
  'Hasil tampil di dashboard: badge risiko, grafik, & rekomendasi',
];

// Mirror riskClassifier.js — threshold disamain sama kode biar gak ngarang.
const RULE_TABLES = [
  {
    title: 'Market Cap',
    note: 'Kapitalisasi pasar (USD). Makin kecil → makin berisiko.',
    rows: [
      ['< $100 Jt', '3', 'Micro Cap'],
      ['$100 Jt – $1 M', '2', 'Small Cap'],
      ['$1 M – $10 M', '1', 'Mid Cap'],
      ['≥ $10 M', '0', 'Large Cap'],
    ],
  },
  {
    title: 'Volume 24 Jam',
    note: 'Total volume perdagangan (USD). Volume rendah = likuiditas rendah.',
    rows: [
      ['< $1 Jt', '3', 'Sangat rendah'],
      ['$1 Jt – $10 Jt', '2', 'Rendah'],
      ['$10 Jt – $100 Jt', '1', 'Sedang'],
      ['≥ $100 Jt', '0', 'Tinggi'],
    ],
  },
  {
    title: 'Volatilitas 30 Hari',
    note: 'Standar deviasi return harian. Makin tinggi → makin berisiko.',
    rows: [
      ['> 15%', '3', 'Sangat tinggi'],
      ['8% – 15%', '2', 'Tinggi'],
      ['4% – 8%', '1', 'Sedang'],
      ['≤ 4%', '0', 'Rendah'],
    ],
  },
  {
    title: 'Rasio Likuiditas',
    note: 'Volume 24 jam ÷ market cap. Rasio kecil = sulit exit.',
    rows: [
      ['< 1%', '3', 'Sangat rendah'],
      ['1% – 5%', '2', 'Rendah'],
      ['5% – 10%', '1', 'Sedang'],
      ['≥ 10%', '0', 'Tinggi'],
    ],
  },
];

const LEVELS = [
  { level: 'Low', range: 'Skor < 5', color: 'text-emerald-600', dot: 'bg-emerald-500' },
  { level: 'Medium', range: 'Skor 5 – 8', color: 'text-amber-600', dot: 'bg-amber-500' },
  { level: 'High', range: 'Skor ≥ 9', color: 'text-rose-600', dot: 'bg-rose-500' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const staggerParent = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

function RuleTable({ title, note, rows }) {
  return (
    <div className="h-full rounded-3xl border border-black/5 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.18)]">
      <h3 className="text-lg font-semibold text-[#1d1d1f]">{title}</h3>
      <p className="mt-1 text-sm text-zinc-500">{note}</p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-black/[0.06]">
        <table className="w-full text-sm">
          <thead className="bg-[#f5f5f7] text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Rentang</th>
              <th className="px-4 py-2.5 text-center font-medium">Poin</th>
              <th className="px-4 py-2.5 text-left font-medium">Kategori</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06]">
            {rows.map((r) => (
              <tr key={r[0]} className="transition-colors hover:bg-[#f5f5f7]/60">
                <td className="px-4 py-2.5 text-zinc-700">{r[0]}</td>
                <td className="px-4 py-2.5 text-center font-mono font-semibold text-[#06c]">
                  {r[1]}
                </td>
                <td className="px-4 py-2.5 text-zinc-500">{r[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SystemPage() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
        <div aria-hidden className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-dots" />
          <div className="animate-aurora-1 absolute -top-24 left-1/2 h-[380px] w-[380px] -translate-x-[90%] rounded-full bg-violet-400/15 blur-3xl" />
          <div className="animate-aurora-2 absolute top-10 left-1/2 h-[340px] w-[340px] translate-x-[25%] rounded-full bg-[#06c]/10 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-base font-medium text-[#06c]"
          >
            Tentang Sistem
          </motion.p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.02em] text-[#1d1d1f] sm:text-6xl">
            <StaggerWords text="Dibangun untuk" delay={0.1} />
            <br />
            <StaggerWords
              text="transparansi & kecepatan."
              delay={0.35}
              wordClassName="bg-gradient-to-b from-zinc-400 to-zinc-500 bg-clip-text text-transparent"
            />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-500 sm:text-xl"
          >
            CryptoRisk menggabungkan data on-chain real-time dengan metode
            klasifikasi yang bisa dijelaskan langkah demi langkah — supaya
            hasilnya bukan hanya akurat, tapi juga mudah
            dipertanggungjawabkan.
          </motion.p>
        </div>
      </section>

      {/* ============ ARSITEKTUR (3 lapisan) ============ */}
      <section className="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
        <FadeIn className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] sm:text-4xl">
            Tiga lapisan, satu alur.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-500">
            Arsitektur dipisah rapi antara antarmuka, mesin klasifikasi, dan
            sumber data.
          </p>
        </FadeIn>

        <div className="mt-14 space-y-5">
          {LAYERS.map((l, i) => (
            <FadeIn key={l.tag} delay={i * 0.09}>
              <motion.div
                whileHover={reduceMotion ? {} : { y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm transition-shadow duration-300 hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.2)]"
              >
                <div className="grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <span
                      className={`inline-block rounded-full bg-gradient-to-r ${l.accent} px-3 py-1 text-xs font-semibold text-white`}
                    >
                      {l.tag}
                    </span>
                    <h3 className="mt-3 text-2xl font-semibold text-[#1d1d1f]">
                      {l.title}
                    </h3>
                    <p className="mt-2 max-w-xl text-zinc-500">{l.desc}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {l.items.map((it) => (
                      <span
                        key={it}
                        className="rounded-full bg-[#f5f5f7] px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
                      >
                        {it}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ============ FITUR UNGGULAN (band hitam) ============ */}
      <section className="relative mt-20 overflow-hidden bg-black px-4 py-24 text-white sm:px-6 sm:py-28">
        <div aria-hidden className="absolute inset-0 z-0">
          <div className="animate-aurora-2 absolute -top-28 left-1/4 h-[380px] w-[380px] rounded-full bg-[#06c]/15 blur-3xl" />
          <div className="animate-aurora-1 absolute bottom-0 right-1/4 h-[320px] w-[320px] rounded-full bg-violet-600/10 blur-3xl" />
        </div>

        <FadeIn className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Fitur yang membuatnya
            <br />
            <span className="bg-gradient-to-r from-zinc-500 via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
              layak dipakai.
            </span>
          </h2>
        </FadeIn>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-10%' }}
          className="relative z-10 mx-auto mt-16 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <motion.div key={f.title} variants={fadeUp}>
              <TiltCard
                max={8}
                className="group h-full rounded-3xl border border-white/[0.06] bg-zinc-900/80 p-7 transition-colors duration-300 hover:border-[#06c]/40 hover:bg-zinc-900"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#06c]/15 text-[#5ac8fa] shadow-[0_0_24px_rgba(0,102,204,0.25)] transition-transform duration-300 group-hover:scale-110">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={f.icon} />
                  </svg>
                </span>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {f.desc}
                </p>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ============ TECH STACK ============ */}
      <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
        <FadeIn className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] sm:text-4xl">
            Tech stack.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-500">
            Teknologi modern yang dipilih agar ringan dijalankan dan mudah
            dirawat.
          </p>
        </FadeIn>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-10%' }}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {STACK.map((s) => (
            <motion.div
              key={s.group}
              variants={fadeUp}
              whileHover={reduceMotion ? {} : { y: -6 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="rounded-3xl bg-[#f5f5f7] p-7 transition-shadow hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.18)]"
            >
              <h3
                className={`text-sm font-semibold uppercase tracking-wide ${s.color}`}
              >
                {s.group}
              </h3>
              <ul className="mt-4 space-y-4">
                {s.tools.map(([name, note]) => (
                  <li key={name}>
                    <div className="font-semibold text-[#1d1d1f]">{name}</div>
                    <div className="text-sm text-zinc-500">{note}</div>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ============ ALUR DATA ============ */}
      <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <FadeIn className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] sm:text-4xl">
            Dari wallet ke skor risiko.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-500">
            Enam langkah otomatis di balik layar, dari koneksi hingga hasil
            klasifikasi.
          </p>
        </FadeIn>

        <div className="mt-14">
          {FLOW.map((step, i) => (
            <FadeIn key={step} delay={i * 0.07} className="flex gap-5">
              {/* Rel + nomor */}
              <div className="flex flex-col items-center">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#06c] to-[#5ac8fa] text-sm font-semibold text-white shadow-lg shadow-[#06c]/25">
                  {i + 1}
                </span>
                {i < FLOW.length - 1 && (
                  <span className="my-1 w-px flex-1 bg-gradient-to-b from-[#06c]/30 to-black/10" />
                )}
              </div>
              <p className="pb-8 pt-1.5 text-lg leading-relaxed text-zinc-700">
                {step}
              </p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ============ METODE KLASIFIKASI ============ */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6">
        <FadeIn className="text-center">
          <p className="text-sm font-medium text-[#06c]">Inti Sistem</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#1d1d1f] sm:text-4xl">
            Metode klasifikasi risiko.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-500">
            Sistem memakai{' '}
            <span className="font-semibold text-[#1d1d1f]">
              Rule-Based Classification
            </span>
            : tiap aset dinilai 0–3 poin pada empat variabel, lalu total skornya
            dipetakan ke tingkat risiko.
          </p>
        </FadeIn>

        {/* Skema penilaian */}
        <FadeIn className="mt-12 rounded-3xl bg-[#f5f5f7] p-8">
          <h3 className="text-xl font-semibold text-[#1d1d1f]">
            Skema Penilaian
          </h3>
          <p className="mt-2 text-zinc-500">
            Setiap variabel memberi{' '}
            <strong className="text-[#1d1d1f]">0–3 poin</strong>. Total maksimal{' '}
            <strong className="text-[#1d1d1f]">12 poin</strong> (4 variabel × 3).
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {LEVELS.map((l) => (
              <div
                key={l.level}
                className="flex items-center justify-between rounded-2xl border border-black/5 bg-white px-5 py-3.5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${l.dot}`} />
                  <span className={`font-semibold ${l.color}`}>{l.level}</span>
                </div>
                <span className="font-mono text-xs text-zinc-500">
                  {l.range}
                </span>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Tabel aturan per variabel */}
        <FadeIn className="mt-10">
          <p className="text-sm text-zinc-500">
            Setiap variabel dievaluasi terhadap ambang batas berikut untuk
            menentukan poinnya.
          </p>
        </FadeIn>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {RULE_TABLES.map((t, i) => (
            <FadeIn key={t.title} delay={(i % 2) * 0.08}>
              <RuleTable {...t} />
            </FadeIn>
          ))}
        </div>

        {/* HHI + Volatilitas */}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <FadeIn>
            <div className="h-full rounded-3xl border border-black/5 bg-white p-7 shadow-sm transition-shadow duration-300 hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.18)]">
              <h3 className="text-lg font-semibold text-[#1d1d1f]">
                Konsentrasi Portofolio (HHI)
              </h3>
              <p className="mt-2 text-sm text-zinc-500">
                Mengukur seberapa menumpuk portofolio memakai
                Herfindahl-Hirschman Index.
              </p>
              <div className="mt-4 rounded-2xl bg-[#f5f5f7] px-5 py-4 text-center">
                <code className="text-[#06c]">
                  HHI = Σ (wᵢ)² , wᵢ = nilaiᵢ / total
                </code>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="font-medium text-emerald-600">
                    Terdiversifikasi
                  </span>
                  <span className="font-mono text-zinc-500">HHI &lt; 0.15</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-medium text-amber-600">Moderat</span>
                  <span className="font-mono text-zinc-500">0.15 – 0.25</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-medium text-rose-600">
                    Terkonsentrasi
                  </span>
                  <span className="font-mono text-zinc-500">HHI ≥ 0.25</span>
                </li>
              </ul>
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <div className="h-full rounded-3xl border border-black/5 bg-white p-7 shadow-sm transition-shadow duration-300 hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.18)]">
              <h3 className="text-lg font-semibold text-[#1d1d1f]">
                Perhitungan Volatilitas
              </h3>
              <p className="mt-2 text-sm text-zinc-500">
                Standar deviasi (populasi) dari return harian selama 30 hari
                terakhir.
              </p>
              <ol className="mt-4 space-y-2.5 text-sm text-zinc-700">
                <li>
                  <span className="font-mono text-[#06c]">1.</span> Return
                  harian:{' '}
                  <span className="font-mono">rₜ = (Pₜ − Pₜ₋₁) / Pₜ₋₁</span>
                </li>
                <li>
                  <span className="font-mono text-[#06c]">2.</span> Hitung
                  rata-rata & variansi populasi dari deret return.
                </li>
                <li>
                  <span className="font-mono text-[#06c]">3.</span> Volatilitas
                  = <span className="font-mono">√variansi</span>.
                </li>
              </ol>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ============ KEAMANAN & BATASAN ============ */}
      <section className="mx-auto mt-12 max-w-5xl px-4 sm:px-6">
        <div className="grid gap-5 md:grid-cols-2">
          <FadeIn>
            <div className="h-full rounded-3xl border border-black/5 bg-white p-8 shadow-sm transition-shadow duration-300 hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.18)]">
              <h3 className="text-xl font-semibold text-[#1d1d1f]">
                 Keamanan
              </h3>
              <ul className="mt-4 space-y-3 text-zinc-600">
                <li>
                  Semua API key (CoinGecko, Helius, Alchemy) disimpan di server
                  — tidak pernah bocor ke browser.
                </li>
                <li>
                  Login pakai tanda tangan kriptografis wallet, tanpa password &
                  tanpa menyentuh dana kamu.
                </li>
                <li>Sistem hanya membaca saldo — tidak bisa memindahkan aset.</li>
              </ul>
            </div>
          </FadeIn>

          <FadeIn delay={0.09}>
            <div className="h-full rounded-3xl border border-black/5 bg-white p-8 shadow-sm transition-shadow duration-300 hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.18)]">
              <h3 className="text-xl font-semibold text-[#1d1d1f]">
                 Batasan
              </h3>
              <ul className="mt-4 space-y-3 text-zinc-600">
                <li>
                  Hasil klasifikasi bersifat informatif — bukan nasihat
                  finansial.
                </li>
                <li>
                  Token tanpa data di CoinGecko tidak bisa diklasifikasi
                  (ditandai terpisah).
                </li>
                <li>Akurasi bergantung pada ketersediaan data pasar real-time.</li>
              </ul>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <FadeIn className="mx-auto max-w-4xl px-4 py-28 sm:px-6">
        <div className="relative overflow-hidden rounded-[32px] bg-black px-8 py-16 text-center text-white sm:px-12">
          <div aria-hidden className="absolute inset-0 z-0">
            <div className="animate-aurora-1 absolute -top-24 left-1/3 h-[320px] w-[320px] rounded-full bg-[#06c]/30 blur-3xl" />
            <div className="animate-aurora-2 absolute -bottom-24 right-1/4 h-[280px] w-[280px] rounded-full bg-violet-500/25 blur-3xl" />
            <div className="absolute inset-0 bg-dots opacity-40 invert" />
          </div>
          <div className="relative z-10">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
              Transparan dari ujung ke ujung.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-400">
              Sekarang kamu tahu persis cara sistem menilai risiko. Saatnya
              menerapkannya pada portofolio kamu sendiri.
            </p>
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className="mt-10 inline-block"
            >
              <Link
                to="/login"
                className="inline-block rounded-full bg-white px-7 py-3 text-[15px] font-medium text-black shadow-lg shadow-white/10 transition-colors hover:bg-zinc-100"
              >
                Mulai sekarang&nbsp;&rsaquo;
              </Link>
            </motion.span>
          </div>
        </div>
      </FadeIn>
    </>
  );
}

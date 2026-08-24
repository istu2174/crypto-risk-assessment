import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext.jsx';
import TiltCard from '../components/motion/TiltCard.jsx';
import AnimatedNumber from '../components/motion/AnimatedNumber.jsx';
import StaggerWords from '../components/motion/StaggerWords.jsx';

// Scene 3D di-lazy-load: three.js lumayan besar, jadi dipisah dari bundle
// utama biar halaman tetap cepat kebuka (3D nyusul setelahnya).
const HeroScene = lazy(() => import('../components/three/HeroScene.jsx'));

/**
 * HomePage — landing page dengan latar 3D (koin crypto mengambang),
 * transisi & motion: headline stagger blur-in, kartu tilt 3D, angka
 * statistik yang ngitung naik, dan marquee sumber data.
 *
 * Gaya tetap Apple-ish: terang, tipografi besar, banyak ruang kosong.
 */

const RISK_VARS = [
  {
    title: 'Market Cap',
    desc: 'Semakin kecil kapitalisasi pasar, semakin tinggi risiko aset.',
    icon: 'M3 3v18h18 M7 14l3-3 3 3 5-6',
  },
  {
    title: 'Volume 24 Jam',
    desc: 'Likuiditas pasar. Volume rendah = susah keluar tanpa banting harga.',
    icon: 'M3 12h4l3 8 4-16 3 8h4',
  },
  {
    title: 'Volatilitas 30 Hari',
    desc: 'Standar deviasi return harian. Makin fluktuatif, makin berisiko.',
    icon: 'M3 17l6-6 4 4 8-8',
  },
  {
    title: 'Rasio Likuiditas',
    desc: 'Volume dibagi market cap. Rasio kecil menandakan exit yang sulit.',
    icon: 'M12 2v20 M5 9l7-7 7 7',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Hubungkan Wallet',
    desc: 'Connect Phantom (Solana) atau MetaMask (Ethereum), atau pantau address publik tanpa login.',
  },
  {
    n: '02',
    title: 'Scan Portofolio',
    desc: 'Sistem mengambil holdings on-chain & data pasar real-time dari CoinGecko.',
  },
  {
    n: '03',
    title: 'Lihat Klasifikasi',
    desc: 'Tiap aset diberi label Low / Medium / High beserta skor risiko & konsentrasi portofolio (HHI).',
  },
];

// Sumber data + warna brand masing-masing (buat dot di marquee)
const DATA_SOURCES = [
  { name: 'CoinGecko', color: '#8bc53f' },
  { name: 'Helius', color: '#e8431f' },
  { name: 'Alchemy', color: '#363ff9' },
  { name: 'Blockstream', color: '#00c3ff' },
  { name: 'Phantom', color: '#ab9ff2' },
  { name: 'MetaMask', color: '#f6851b' },
  { name: 'Solana', color: '#14f195' },
  { name: 'Ethereum', color: '#627eea' },
  { name: 'Bitcoin', color: '#f7931a' },
];

/* ── Variants animasi reusable ───────────────────────────────────── */
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
  visible: { transition: { staggerChildren: 0.1 } },
};

function LevelRow({ label, color }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-2.5">
      <span className="text-sm text-zinc-700">{label}</span>
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
    </div>
  );
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const reduceMotion = useReducedMotion();
  const ctaTo = isAuthenticated ? '/dashboard' : '/login';
  const ctaLabel = isAuthenticated ? 'Buka Dashboard' : 'Mulai sekarang';

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden px-4 pb-24 pt-16 text-center sm:px-6 sm:pt-24">
        {/* Layer 0 — latar CSS: dot grid + aurora blobs */}
        <div aria-hidden className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-dots" />
          <div className="animate-aurora-1 absolute -top-20 left-1/2 h-[420px] w-[420px] -translate-x-[85%] rounded-full bg-[#06c]/10 blur-3xl" />
          <div className="animate-aurora-2 absolute top-16 left-1/2 h-[380px] w-[380px] translate-x-[20%] rounded-full bg-violet-400/15 blur-3xl" />
          <div className="animate-aurora-1 absolute bottom-0 left-1/2 h-[300px] w-[480px] -translate-x-1/2 rounded-full bg-emerald-300/10 blur-3xl" />
        </div>

        {/* Layer 1 — scene 3D (desktop only; mobile cukup aurora biar enteng) */}
        {!reduceMotion && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-[1] hidden h-[640px] md:block"
          >
            <Suspense fallback={null}>
              <HeroScene />
            </Suspense>
          </div>
        )}

        {/* Layer 2 — konten */}
        <div className="relative z-10">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/70 px-4 py-1.5 text-sm font-medium text-[#06c] shadow-sm backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Rule-Based Classification · Multi-Chain
          </motion.p>

          <h1 className="mx-auto mt-5 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-[-0.02em] text-[#1d1d1f] sm:text-7xl">
            <StaggerWords text="Risiko portofolio kripto." delay={0.15} />
            <br />
            <StaggerWords
              text="Terukur dalam hitungan detik."
              delay={0.5}
              wordClassName="bg-gradient-to-b from-zinc-400 to-zinc-500 bg-clip-text text-transparent"
            />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-zinc-500 sm:text-[21px]"
          >
            Hubungkan wallet, dan sistem menganalisis tiap aset berdasarkan
            market cap, volume, volatilitas, dan likuiditas lalu
            mengklasifikasikannya secara otomatis.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3"
          >
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className="inline-block"
            >
              <Link
                to={ctaTo}
                className="inline-block rounded-full bg-[#06c] px-7 py-3 text-[17px] font-medium text-white shadow-lg shadow-[#06c]/25 transition-shadow hover:bg-[#0077ed] hover:shadow-xl hover:shadow-[#06c]/35"
              >
                {ctaLabel}
              </Link>
            </motion.span>
            <Link
              to="/about"
              className="group text-[17px] font-medium text-[#06c]"
            >
              Pelajari metode{' '}
              <span className="inline-block transition-transform group-hover:translate-x-1">
                &rsaquo;
              </span>
            </Link>
          </motion.div>
        </div>

        {/* Mockup card — risk gauge (tilt 3D + idle float) */}
        <motion.div
          initial={{ opacity: 0, y: 56, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.55, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 mx-auto mt-16 max-w-xl"
        >
          <motion.div
            animate={reduceMotion ? {} : { y: [0, -9, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <TiltCard
              max={7}
              className="rounded-[28px] border border-black/5 bg-white/90 p-7 text-left shadow-[0_30px_60px_-20px_rgba(0,0,0,0.25)] backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-500">
                  Overall Portfolio Risk
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  Medium
                </span>
              </div>

              <div className="mt-5 flex items-end gap-2">
                <span className="text-6xl font-semibold tracking-tight text-[#1d1d1f]">
                  6.4
                </span>
                <span className="mb-1.5 text-sm text-zinc-400">/ 12 skor</span>
              </div>

              {/* Bar skor — "tumbuh" pas pertama kelihatan */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: '53%' }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.9, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500"
                />
              </div>

              <div className="mt-6 space-y-2">
                <LevelRow label="Bitcoin · Low Risk" color="bg-emerald-500" />
                <LevelRow label="Solana · Medium Risk" color="bg-amber-500" />
                <LevelRow label="PEPE · High Risk" color="bg-rose-500" />
              </div>

              <div className="mt-5 flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 text-sm">
                <span className="text-zinc-500">Konsentrasi (HHI)</span>
                <span className="font-mono font-semibold text-[#06c]">
                  0.18 · Moderat
                </span>
              </div>
            </TiltCard>
          </motion.div>
        </motion.div>
      </section>

      {/* ============ MARQUEE SUMBER DATA ============ */}
      <section className="border-y border-black/[0.06] bg-white py-5">
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
          Didukung data & infrastruktur
        </p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
          <div className="animate-marquee flex w-max items-center">
            {/* Konten diduplikasi 2× supaya loop marquee-nya mulus */}
            {[0, 1].map((copy) => (
              <div
                key={copy}
                aria-hidden={copy === 1}
                className="flex items-center"
              >
                {DATA_SOURCES.map(({ name, color }) => (
                  <span
                    key={`${copy}-${name}`}
                    className="mx-7 flex items-center gap-2 whitespace-nowrap text-[15px] font-semibold tracking-tight text-zinc-500 transition-colors hover:text-zinc-900"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {name}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ STATS STRIP ============ */}
      <section className="bg-[#f5f5f7]">
        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-15%' }}
          className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 py-16 sm:px-6 md:grid-cols-4"
        >
          {[
            { value: 3, label: 'Blockchain didukung' },
            { value: 4, label: 'Variabel risiko' },
            { value: 12, label: 'Skala skor risiko' },
            { value: null, text: 'Real-time', label: 'Data pasar CoinGecko' },
          ].map((stat) => (
            <motion.div key={stat.label} variants={fadeUp} className="text-center">
              <div className="text-4xl font-semibold tracking-tight text-[#1d1d1f]">
                {stat.value !== null ? (
                  <AnimatedNumber value={stat.value} />
                ) : (
                  stat.text
                )}
              </div>
              <div className="mt-2 text-sm text-zinc-500">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ============ FEATURES (band hitam) ============ */}
      <section className="relative overflow-hidden bg-black px-4 py-28 text-white sm:px-6">
        {/* Aurora gelap biar band hitamnya gak flat */}
        <div aria-hidden className="absolute inset-0 z-0">
          <div className="animate-aurora-2 absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-[#06c]/15 blur-3xl" />
          <div className="animate-aurora-1 absolute bottom-0 right-1/4 h-[360px] w-[360px] rounded-full bg-violet-600/10 blur-3xl" />
        </div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-15%' }}
          className="relative z-10 mx-auto max-w-3xl text-center"
        >
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Empat variabel,
            <br />
            <span className="bg-gradient-to-r from-zinc-500 via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
              satu skor risiko.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-400">
            Tiap aset dinilai 0–3 poin per variabel. Totalnya menentukan apakah
            aset tergolong Low, Medium, atau High risk.
          </p>
        </motion.div>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-10%' }}
          className="relative z-10 mx-auto mt-16 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {RISK_VARS.map((v) => (
            <motion.div key={v.title} variants={fadeUp}>
              <TiltCard
                max={9}
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
                    <path d={v.icon} />
                  </svg>
                </span>
                <h3 className="mt-5 text-lg font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {v.desc}
                </p>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="px-4 py-28 sm:px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-15%' }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="text-4xl font-semibold tracking-tight text-[#1d1d1f] sm:text-5xl">
            Tiga langkah saja.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-500">
            Dari connect wallet sampai hasil klasifikasi, semuanya otomatis.
          </p>
        </motion.div>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-10%' }}
          className="mx-auto mt-16 grid max-w-5xl gap-6 md:grid-cols-3"
        >
          {STEPS.map((s) => (
            <motion.div
              key={s.n}
              variants={fadeUp}
              whileHover={reduceMotion ? {} : { y: -6 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="rounded-3xl bg-[#f5f5f7] p-8 transition-shadow hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.18)]"
            >
              <span className="bg-gradient-to-br from-[#06c] to-[#5ac8fa] bg-clip-text text-5xl font-semibold tracking-tight text-transparent">
                {s.n}
              </span>
              <h3 className="mt-4 text-xl font-semibold text-[#1d1d1f]">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {s.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ============ CTA ============ */}
      <section className="px-4 pb-28 sm:px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-15%' }}
          className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-black px-6 py-20 text-center text-white sm:px-12"
        >
          {/* Aurora di dalam kartu CTA */}
          <div aria-hidden className="absolute inset-0 z-0">
            <div className="animate-aurora-1 absolute -top-24 left-1/3 h-[360px] w-[360px] rounded-full bg-[#06c]/30 blur-3xl" />
            <div className="animate-aurora-2 absolute -bottom-28 right-1/4 h-[320px] w-[320px] rounded-full bg-violet-500/25 blur-3xl" />
            <div className="absolute inset-0 bg-dots opacity-40 invert" />
          </div>

          <div className="relative z-10">
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Siap menilai portofolio kamu?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-400">
              Coba langsung dengan portofolio demo, atau hubungkan wallet
              sendiri. Tidak perlu top-up apa pun.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="inline-block"
              >
                <Link
                  to={ctaTo}
                  className="inline-block rounded-full bg-white px-7 py-3 text-[17px] font-medium text-black shadow-lg shadow-white/10 transition-colors hover:bg-zinc-100"
                >
                  {ctaLabel}
                </Link>
              </motion.span>
              <Link
                to="/about"
                className="group text-[17px] font-medium text-[#5ac8fa]"
              >
                Pelajari metode{' '}
                <span className="inline-block transition-transform group-hover:translate-x-1">
                  &rsaquo;
                </span>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}

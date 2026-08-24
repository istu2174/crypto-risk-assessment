import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import FadeIn from '../components/motion/FadeIn.jsx';
import StaggerWords from '../components/motion/StaggerWords.jsx';
import TiltCard from '../components/motion/TiltCard.jsx';
import AnimatedNumber from '../components/motion/AnimatedNumber.jsx';

/**
 * AboutPage ("/about") — tentang WEBSITE-nya.
 * Menceritakan apa itu CryptoRisk, masalah yang dipecahkan, untuk siapa,
 * keunggulan, dan misinya. Bahasa motion sama dengan HomePage: aurora,
 * stagger headline, kartu tilt 3D, dan angka yang menghitung naik.
 *
 * Penjelasan teknis (arsitektur & metode klasifikasi) ada di halaman
 * "Tentang Sistem" (/system).
 */

const AUDIENCE = [
  {
    title: 'Investor Pemula',
    desc: 'Ingin tahu seberapa berisiko portofolionya tanpa harus paham analisis pasar yang rumit.',
    icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v4l3 2',
    chip: 'bg-[#06c]/10 text-[#06c]',
  },
  {
    title: 'Peneliti & Akademisi',
    desc: 'Butuh metode penilaian risiko yang transparan dan bisa direproduksi untuk studi.',
    icon: 'M22 10 12 5 2 10l10 5 10-5z M6 12v5l6 3 6-3v-5',
    chip: 'bg-violet-500/10 text-violet-600',
  },
  {
    title: 'Pengamat Pasar',
    desc: 'Memantau komposisi & konsentrasi aset dari berbagai blockchain dalam satu tempat.',
    icon: 'M3 3v18h18 M7 14l3-3 3 3 5-6',
    chip: 'bg-emerald-500/10 text-emerald-600',
  },
];

const VALUES = [
  {
    title: 'Transparan',
    desc: 'Setiap skor bisa ditelusuri ke aturan yang jelas — bukan kotak hitam.',
    accent: 'text-[#5ac8fa]',
    glow: 'hover:border-[#06c]/40',
  },
  {
    title: 'Multi-Chain',
    desc: 'Solana, Ethereum, dan Bitcoin dianalisis dalam satu portofolio.',
    accent: 'text-violet-400',
    glow: 'hover:border-violet-500/40',
  },
  {
    title: 'Real-Time',
    desc: 'Data pasar diambil langsung dari sumber terpercaya saat scan berjalan.',
    accent: 'text-emerald-400',
    glow: 'hover:border-emerald-500/40',
  },
  {
    title: 'Tanpa Risiko Dana',
    desc: 'Hanya membaca saldo wallet — tidak pernah menyentuh atau memindahkan aset.',
    accent: 'text-amber-400',
    glow: 'hover:border-amber-500/40',
  },
];

// Perbandingan manual vs CryptoRisk (kartu di samping section "Masalahnya")
const COMPARISON = [
  {
    tag: 'Cara manual',
    line: 'Cek harga, volume, & market cap satu per satu di banyak situs.',
    tagColor: 'text-rose-500',
    border: 'border-rose-200/70',
  },
  {
    tag: 'Cara manual',
    line: 'Hitung volatilitas & konsentrasi portofolio pakai spreadsheet sendiri.',
    tagColor: 'text-rose-500',
    border: 'border-rose-200/70',
  },
  {
    tag: 'Dengan CryptoRisk',
    line: 'Satu klik → skor risiko, label, & komposisi langsung tampil.',
    tagColor: 'text-[#06c]',
    border: 'border-[#06c]/25',
  },
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
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function AboutPage() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
        <div aria-hidden className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-dots" />
          <div className="animate-aurora-1 absolute -top-24 left-1/2 h-[380px] w-[380px] -translate-x-[90%] rounded-full bg-[#06c]/10 blur-3xl" />
          <div className="animate-aurora-2 absolute top-10 left-1/2 h-[340px] w-[340px] translate-x-[25%] rounded-full bg-emerald-300/15 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-base font-medium text-[#06c]"
          >
            About
          </motion.p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.02em] text-[#1d1d1f] sm:text-6xl">
            <StaggerWords text="Menilai risiko kripto" delay={0.1} />
            <br />
            <StaggerWords
              text="jadi sederhana."
              delay={0.4}
              wordClassName="bg-gradient-to-b from-zinc-400 to-zinc-500 bg-clip-text text-transparent"
            />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-500 sm:text-xl"
          >
            <span className="font-semibold text-[#1d1d1f]">CryptoRisk</span>{' '}
            adalah aplikasi web yang membantu siapa pun memahami tingkat risiko
            portofolio cryptocurrency miliknya — cukup hubungkan wallet, sisanya
            sistem yang kerjakan.
          </motion.p>
        </div>
      </section>

      {/* ============ MASALAH ============ */}
      <section className="mx-auto max-w-5xl px-4 pb-12 pt-8 sm:px-6">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <FadeIn>
            <p className="text-sm font-medium text-[#06c]">Masalahnya</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#1d1d1f] sm:text-4xl">
              Risiko itu nyata, tapi sering tak terlihat.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-zinc-500">
              Banyak orang membeli kripto tanpa benar-benar tahu seberapa
              berisiko aset yang mereka pegang. Koin kecil bisa terlihat menarik
              karena harganya naik cepat — padahal likuiditasnya tipis dan
              volatilitasnya ekstrem.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-zinc-500">
              Menilai semua itu secara manual butuh data pasar, perhitungan, dan
              waktu. CryptoRisk merangkum semuanya menjadi satu angka yang mudah
              dipahami.
            </p>
          </FadeIn>

          <FadeIn delay={0.12}>
            <TiltCard
              max={6}
              className="rounded-[28px] border border-black/5 bg-white p-7 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.18)]"
            >
              <div className="space-y-4">
                {COMPARISON.map(({ tag, line, tagColor, border }, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: 0.2 + i * 0.12,
                      duration: 0.6,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`rounded-2xl border ${border} bg-white px-5 py-4 shadow-sm`}
                  >
                    <div
                      className={`text-xs font-semibold uppercase tracking-wide ${tagColor}`}
                    >
                      {tag}
                    </div>
                    <div className="mt-1 text-sm text-zinc-600">{line}</div>
                  </motion.div>
                ))}
              </div>
            </TiltCard>
          </FadeIn>
        </div>
      </section>

      {/* ============ UNTUK SIAPA ============ */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <FadeIn className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] sm:text-4xl">
            Dibuat untuk siapa?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-500">
            Siapa pun yang ingin keputusan kriptonya lebih terinformasi.
          </p>
        </FadeIn>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-10%' }}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {AUDIENCE.map((a) => (
            <motion.div
              key={a.title}
              variants={fadeUp}
              whileHover={reduceMotion ? {} : { y: -6 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="rounded-3xl bg-[#f5f5f7] p-8 transition-shadow hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.18)]"
            >
              <span
                className={`grid h-12 w-12 place-items-center rounded-2xl ${a.chip}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={a.icon} />
                </svg>
              </span>
              <h3 className="mt-5 text-xl font-semibold text-[#1d1d1f]">
                {a.title}
              </h3>
              <p className="mt-2 leading-relaxed text-zinc-500">{a.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ============ KEUNGGULAN (band hitam) ============ */}
      <section className="relative overflow-hidden bg-black px-4 py-24 text-white sm:px-6 sm:py-28">
        <div aria-hidden className="absolute inset-0 z-0">
          <div className="animate-aurora-2 absolute -top-28 left-1/4 h-[380px] w-[380px] rounded-full bg-[#06c]/15 blur-3xl" />
          <div className="animate-aurora-1 absolute bottom-0 right-1/4 h-[320px] w-[320px] rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <FadeIn className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Kenapa CryptoRisk?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-400">
            Empat prinsip yang memandu cara aplikasi ini bekerja.
          </p>
        </FadeIn>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-10%' }}
          className="relative z-10 mx-auto mt-16 grid max-w-4xl gap-5 sm:grid-cols-2"
        >
          {VALUES.map((v) => (
            <motion.div key={v.title} variants={fadeUp}>
              <TiltCard
                max={8}
                className={`h-full rounded-3xl border border-white/[0.06] bg-zinc-900/80 p-7 transition-colors duration-300 ${v.glow} hover:bg-zinc-900`}
              >
                <h3 className={`text-lg font-semibold ${v.accent}`}>
                  {v.title}
                </h3>
                <p className="mt-2 leading-relaxed text-zinc-400">{v.desc}</p>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ============ MISI ============ */}
      <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <FadeIn>
          <p className="text-sm font-medium text-[#06c]">Misi Kami</p>
          <h2 className="mt-3 text-3xl font-semibold leading-snug tracking-tight text-[#1d1d1f] sm:text-[42px]">
            Membuat penilaian risiko kripto{' '}
            <span className="bg-gradient-to-b from-zinc-400 to-zinc-500 bg-clip-text text-transparent">
              terbuka untuk semua orang.
            </span>
          </h2>
          <p className="mx-auto mt-6 text-lg leading-relaxed text-zinc-500">
            Kami percaya keputusan finansial yang baik dimulai dari informasi
            yang jujur. CryptoRisk dibangun di atas metode yang transparan dan
            dapat ditelusuri — bukan model kotak hitam — sehingga setiap
            penilaian bisa dipahami, bukan sekadar dipercaya.
          </p>
        </FadeIn>

        <FadeIn delay={0.12} className="mt-12">
          <div className="grid gap-px overflow-hidden rounded-3xl bg-black/[0.06] sm:grid-cols-3">
            {[
              { value: 3, suffix: '', label: 'Blockchain terintegrasi' },
              { value: 4, suffix: '', label: 'Variabel risiko terukur' },
              { value: 100, suffix: '%', label: 'Metode dapat ditelusuri' },
            ].map(({ value, suffix, label }) => (
              <div key={label} className="bg-white px-6 py-8">
                <div className="text-4xl font-semibold tracking-tight text-[#1d1d1f]">
                  <AnimatedNumber value={value} />
                  {suffix}
                </div>
                <div className="mt-2 text-sm text-zinc-500">{label}</div>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ============ CTA ============ */}
      <FadeIn className="mx-auto max-w-2xl px-4 pb-28 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] sm:text-4xl">
          Penasaran cara kerjanya?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-500">
          Lihat detail teknis di balik layar, atau langsung coba scan
          portofoliomu.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          <motion.span
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="inline-block"
          >
            <Link
              to="/login"
              className="inline-block rounded-full bg-[#06c] px-7 py-3 text-[17px] font-medium text-white shadow-lg shadow-[#06c]/25 transition-shadow hover:bg-[#0077ed] hover:shadow-xl hover:shadow-[#06c]/35"
            >
              Mulai sekarang
            </Link>
          </motion.span>
          <Link to="/system" className="group text-[17px] font-medium text-[#06c]">
            Tentang sistem{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1">
              &rsaquo;
            </span>
          </Link>
        </div>
      </FadeIn>
    </>
  );
}

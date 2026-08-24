import {
  RISK_RULES,
  VARIABLE_ORDER,
  OVERALL_LEVELS,
  HHI_LEVELS,
} from '../utils/riskRules.js';

/**
 * MethodologyPage ("/methodology") — halaman metodologi KHUSUS area dashboard.
 *
 * Beda dari SystemPage ("/system", publik) yang gaya marketing (hero, aurora,
 * CTA login): halaman ini ringkas & teknis, ngikutin gaya page dashboard lain
 * (CompositionPage/HistoryPage). Fokusnya cuma menjelaskan METODE penilaian
 * risiko yang dipakai sistem, biar user yang lagi di dashboard bisa langsung
 * paham "kenapa skornya sekian" tanpa keluar dari shell aplikasi.
 *
 * Semua angka di-render dari riskRules.js (satu sumber kebenaran, mirror
 * backend) — jadi kalau threshold berubah, halaman ini ikut update otomatis.
 *
 * Catatan skripsi: cocok dirujuk di BAB 3 (Metodologi) — tabel ambang batas &
 * skema skoring di sini = representasi visual dari Rule-Based Classification.
 */

const MAX_SCORE = VARIABLE_ORDER.length * 3; // 4 variabel × 3 poin = 12

// Ubah OVERALL_LEVELS (cuma punya `min`) jadi rentang skor yang enak dibaca.
// OVERALL_LEVELS urut menurun: High(9) → Medium(5) → Low(0).
const SCORE_BANDS = OVERALL_LEVELS.map((lvl, i) => {
  const higher = OVERALL_LEVELS[i - 1]; // level di atasnya (min lebih besar)
  const range =
    i === 0 ? `Skor ≥ ${lvl.min}` : `Skor ${lvl.min} – ${higher.min - 1}`;
  return { ...lvl, range };
});

/** Kartu tabel ambang batas untuk satu variabel risiko. */
function VariableCard({ rule }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6">
      <h3 className="text-base font-semibold text-[#1d1d1f]">{rule.title}</h3>
      <p className="mt-1 text-sm text-zinc-500">{rule.note}</p>

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
            {rule.tiers.map((t) => (
              <tr
                key={t.label}
                className="transition-colors hover:bg-[#f5f5f7]/60"
              >
                <td className="px-4 py-2.5 text-zinc-700">{t.range}</td>
                <td className="px-4 py-2.5 text-center font-mono font-semibold text-[#06c]">
                  {t.points}
                </td>
                <td className="px-4 py-2.5 text-zinc-500">{t.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MethodologyPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">
          Metodologi
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cara sistem menilai risiko portofolio — transparan, bisa dijelaskan,
          dan konsisten dengan perhitungan di setiap scan.
        </p>
      </div>

      {/* Pengantar metode */}
      <div className="rounded-3xl border border-black/5 bg-white p-6">
        <h2 className="text-sm font-semibold text-[#1d1d1f]">
          Rule-Based Classification
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Setiap aset dinilai pada{' '}
          <span className="font-semibold text-[#1d1d1f]">empat variabel</span>{' '}
          risiko. Tiap variabel memberi{' '}
          <span className="font-semibold text-[#1d1d1f]">0–3 poin</span>{' '}
          tergantung kategorinya, sehingga skor satu aset berkisar{' '}
          <span className="font-mono text-[#06c]">0–{MAX_SCORE}</span>. Total
          skor lalu dipetakan ke tingkat risiko Low / Medium / High. Pendekatan
          ini sengaja dipilih agar hasilnya{' '}
          <span className="font-semibold text-[#1d1d1f]">
            bisa dipertanggungjawabkan
          </span>{' '}
          — bukan kotak hitam seperti model machine learning.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {VARIABLE_ORDER.map((key, i) => (
            <div
              key={key}
              className="flex items-center gap-3 rounded-2xl bg-[#f5f5f7] px-4 py-3"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-[#06c]">
                {i + 1}
              </span>
              <div>
                <div className="text-sm font-medium text-[#1d1d1f]">
                  {RISK_RULES[key].title}
                </div>
                <div className="text-xs text-zinc-500">
                  {RISK_RULES[key].note}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skema skoring → level */}
      <div className="rounded-3xl border border-black/5 bg-white p-6">
        <h2 className="text-sm font-semibold text-[#1d1d1f]">
          Dari Skor ke Tingkat Risiko
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Total maksimal{' '}
          <span className="font-semibold text-[#1d1d1f]">{MAX_SCORE} poin</span>{' '}
          ({VARIABLE_ORDER.length} variabel × 3). Skor akhir menentukan tingkat
          risiko aset.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {SCORE_BANDS.map((b) => (
            <div
              key={b.level}
              className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#f5f5f7] px-5 py-3.5"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${b.dot}`} />
                <span className={`font-semibold ${b.color}`}>{b.level}</span>
              </div>
              <span className="font-mono text-xs text-zinc-500">{b.range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabel ambang batas per variabel */}
      <div>
        <h2 className="text-sm font-semibold text-[#1d1d1f]">
          Ambang Batas per Variabel
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Nilai mentah tiap aset dicocokkan ke rentang berikut untuk menentukan
          poinnya.
        </p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {VARIABLE_ORDER.map((key) => (
            <VariableCard key={key} rule={RISK_RULES[key]} />
          ))}
        </div>
      </div>

      {/* HHI + Volatilitas */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* HHI */}
        <div className="rounded-3xl border border-black/5 bg-white p-6">
          <h2 className="text-base font-semibold text-[#1d1d1f]">
            Konsentrasi Portofolio (HHI)
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Mengukur seberapa menumpuk portofolio memakai Herfindahl-Hirschman
            Index. Bobot tiap aset dikuadratkan lalu dijumlahkan.
          </p>
          <div className="mt-4 rounded-2xl bg-[#f5f5f7] px-5 py-4 text-center">
            <code className="text-[#06c]">HHI = Σ (wᵢ)² , wᵢ = nilaiᵢ / total</code>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {HHI_LEVELS.slice()
              .reverse()
              .map((l) => (
                <li key={l.label} className="flex justify-between">
                  <span className={`font-medium ${l.color}`}>{l.label}</span>
                  <span className="font-mono text-zinc-500">{l.range}</span>
                </li>
              ))}
          </ul>
        </div>

        {/* Volatilitas */}
        <div className="rounded-3xl border border-black/5 bg-white p-6">
          <h2 className="text-base font-semibold text-[#1d1d1f]">
            Perhitungan Volatilitas
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Standar deviasi (populasi) dari return harian selama 30 hari
            terakhir.
          </p>
          <ol className="mt-4 space-y-2.5 text-sm text-zinc-700">
            <li>
              <span className="font-mono text-[#06c]">1.</span> Return harian:{' '}
              <span className="font-mono">rₜ = (Pₜ − Pₜ₋₁) / Pₜ₋₁</span>
            </li>
            <li>
              <span className="font-mono text-[#06c]">2.</span> Hitung rata-rata
              &amp; variansi populasi dari deret return.
            </li>
            <li>
              <span className="font-mono text-[#06c]">3.</span> Volatilitas ={' '}
              <span className="font-mono">√variansi</span>.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';

/**
 * Footer — ala Apple.com: latar abu terang (#f5f5f7), teks kecil, garis halus,
 * grup link, lalu fine-print copyright + disclaimer di bawah.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-black/[0.08] bg-[#f5f5f7] text-[13px] text-zinc-500">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand + deskripsi */}
          <div className="space-y-3">
            <p className="font-semibold text-zinc-900">
              Crypto<span className="text-[#06c]">Risk</span>
            </p>
            <p className="max-w-xs leading-relaxed">
              Sistem penilaian risiko portofolio cryptocurrency berbasis web
              menggunakan metode Rule-Based Classification.
            </p>
          </div>

          {/* Navigasi */}
          <div>
            <h4 className="mb-3 font-semibold text-zinc-900">Navigasi</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="transition-colors hover:text-[#06c]">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="transition-colors hover:text-[#06c]">
                  About
                </Link>
              </li>
              <li>
                <Link to="/system" className="transition-colors hover:text-[#06c]">
                  Tentang Sistem
                </Link>
              </li>
              <li>
                <Link to="/login" className="transition-colors hover:text-[#06c]">
                  Launch App
                </Link>
              </li>
            </ul>
          </div>

          {/* Perusahaan */}
          <div>
            <h4 className="mb-3 font-semibold text-zinc-900">Perusahaan</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="transition-colors hover:text-[#06c]">
                  Tentang Kami
                </Link>
              </li>
              <li>
                <Link to="/system" className="transition-colors hover:text-[#06c]">
                  Cara Kerja
                </Link>
              </li>
              <li>
                <Link to="/login" className="transition-colors hover:text-[#06c]">
                  Mulai Sekarang
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-black/[0.08] pt-6 text-[12px] text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} CryptoRisk. Seluruh hak cipta dilindungi.</p>
          <p>Informasi pada situs ini bukan merupakan nasihat finansial.</p>
        </div>
      </div>
    </footer>
  );
}

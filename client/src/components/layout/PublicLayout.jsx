import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import AnimatedOutlet from '../motion/AnimatedOutlet.jsx';

/**
 * PublicLayout — shell buat halaman publik (Home, About, Login).
 * Tema terang ala Apple: background gradasi global (putih→abu terang,
 * didefinisikan di index.css), teks near-black (#1d1d1f).
 * Navbar (sticky translucent) + konten (AnimatedOutlet, ada transisi
 * fade+blur tiap pindah halaman) + Footer.
 */
export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-transparent text-[#1d1d1f] antialiased">
      <Navbar />
      <main className="flex-1">
        <AnimatedOutlet />
      </main>
      <Footer />
    </div>
  );
}

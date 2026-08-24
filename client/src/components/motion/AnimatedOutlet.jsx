import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/**
 * AnimatedOutlet — pengganti <Outlet/> dengan transisi antar halaman.
 *
 * Cara kerja:
 *   - useOutlet() ngambil elemen route aktif (sama kayak <Outlet/>).
 *   - Tiap pathname berubah, AnimatePresence nahan halaman lama buat
 *     animasi keluar (fade + blur), lalu halaman baru masuk (fade-up).
 *   - mode="wait" = halaman baru nunggu halaman lama selesai keluar,
 *     jadi gak ada dua halaman numpuk.
 *
 * Aksesibilitas: kalau user set "reduce motion" di OS, transisi dimatiin.
 */
export default function AnimatedOutlet() {
  const { pathname } = useLocation();
  const outlet = useOutlet();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return outlet;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
        animate={{
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
        }}
        exit={{
          opacity: 0,
          filter: 'blur(6px)',
          transition: { duration: 0.18, ease: 'easeIn' },
        }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}

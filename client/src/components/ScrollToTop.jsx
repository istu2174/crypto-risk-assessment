import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop — tiap pindah route (pathname berubah), balikin scroll ke atas.
 * Default react-router gak reset scroll, jadi halaman baru kebuka di posisi
 * scroll halaman sebelumnya. Komponen ini taruh sekali di dalam <BrowserRouter>.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

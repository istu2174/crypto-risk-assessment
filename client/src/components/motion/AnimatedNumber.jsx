import { useEffect, useRef } from 'react';
import {
  useInView,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from 'motion/react';

/**
 * AnimatedNumber — angka yang "ngitung naik" dari 0 ke target
 * pas elemennya masuk viewport. Dipakai di stats strip landing page.
 *
 * Cara kerja:
 *   - useInView deteksi elemen kelihatan (sekali aja, once: true).
 *   - useMotionValue + useSpring menganimasikan nilai 0 → value.
 *   - Tiap frame, textContent di-update langsung (gak lewat re-render React,
 *     jadi performa tetap enteng).
 *
 * Props:
 *   value  : angka target
 *   suffix : teks tambahan setelah angka (mis. "+")
 */
export default function AnimatedNumber({ value, suffix = '', className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const reduceMotion = useReducedMotion();

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: 1400, bounce: 0 });

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      motionValue.jump(value); // langsung ke nilai akhir tanpa animasi
    } else {
      motionValue.set(value);
    }
  }, [inView, value, reduceMotion, motionValue]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (v) => {
      if (ref.current) {
        ref.current.textContent = `${Math.round(v).toLocaleString('id-ID')}${suffix}`;
      }
    });
    return unsubscribe;
  }, [spring, suffix]);

  return (
    <span ref={ref} className={className}>
      0{suffix}
    </span>
  );
}

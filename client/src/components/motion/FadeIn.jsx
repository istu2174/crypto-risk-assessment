import { motion } from 'motion/react';

/**
 * FadeIn — elemen muncul fade-up (naik + memudar masuk) saat pertama kali
 * kelihatan di viewport. Pengganti modern komponen Reveal lama, sekarang
 * pakai motion/react biar konsisten sama animasi lain di seluruh app.
 *
 * Props:
 *   delay : jeda animasi dalam DETIK (buat efek stagger antar-kartu)
 *   y     : jarak naik awal dalam px (default 32)
 */
export default function FadeIn({
  delay = 0,
  y = 32,
  className = '',
  children,
  ...rest
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

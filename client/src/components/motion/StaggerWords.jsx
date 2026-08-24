import { motion } from 'motion/react';

/**
 * StaggerWords — headline yang muncul per kata (rise + blur-in ala keynote).
 *
 * wordClassName di-apply ke TIAP kata: gradient text (bg-clip-text) harus
 * per-kata, karena bg-clip-text di parent gak jalan kalau anak-anaknya
 * punya transform sendiri (teks jadi invisible di Chrome).
 */
const wordVariant = {
  hidden: { opacity: 0, y: 26, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function StaggerWords({
  text,
  className = '',
  wordClassName = '',
  delay = 0,
}) {
  const words = text.split(' ');
  return (
    <motion.span
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.07, delayChildren: delay } },
      }}
    >
      {words.map((word, i) => (
        <motion.span
          // index sebagai key aman: teks statis, gak pernah re-order
          key={`${word}-${i}`}
          variants={wordVariant}
          // pb + -mb: kasih ruang buat ekor huruf (g, y, p) biar gak kepotong
          // sama paint-box dari filter blur, tanpa ngubah tinggi baris.
          className={`inline-block whitespace-pre pb-[0.18em] -mb-[0.18em] will-change-transform ${wordClassName}`}
        >
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </motion.span>
  );
}

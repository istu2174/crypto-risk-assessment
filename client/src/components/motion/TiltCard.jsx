import { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
} from 'motion/react';

/**
 * TiltCard — kartu yang "miring" 3D ngikutin posisi mouse + efek glare
 * (kilau cahaya) yang ikut bergerak. Murni CSS 3D transform, ringan.
 *
 * Cara kerja:
 *   - Posisi pointer di dalam kartu dinormalisasi 0..1 (px, py).
 *   - useSpring bikin gerakannya kenyal/halus, bukan patah-patah.
 *   - px/py dipetakan ke rotateY/rotateX (transformPerspective bikin
 *     rotasinya keliatan 3D beneran).
 *   - Glare = radial-gradient putih yang center-nya ngikutin pointer.
 *
 * Props:
 *   max   : derajat kemiringan maksimum (default 10°)
 *   glare : tampilkan kilau cahaya (default true)
 */
export default function TiltCard({
  children,
  className = '',
  max = 10,
  glare = true,
  ...rest
}) {
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();

  // Posisi pointer ternormalisasi (0..1), default di tengah (0.5)
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 160, damping: 18, mass: 0.4 });
  const sy = useSpring(py, { stiffness: 160, damping: 18, mass: 0.4 });

  // Map posisi → derajat rotasi (pointer kiri = kartu noleh kiri, dst.)
  const rotateX = useTransform(sy, [0, 1], [max, -max]);
  const rotateY = useTransform(sx, [0, 1], [-max, max]);

  // Glare ngikutin pointer
  const glareX = useTransform(sx, (v) => `${v * 100}%`);
  const glareY = useTransform(sy, (v) => `${v * 100}%`);
  const glareBg = useMotionTemplate`radial-gradient(380px circle at ${glareX} ${glareY}, rgba(255,255,255,0.32), transparent 65%)`;

  const handlePointerMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };

  const handlePointerLeave = () => {
    // Balik ke posisi netral pas mouse keluar
    px.set(0.5);
    py.set(0.5);
  };

  // Reduce motion → render kartu statis biasa
  if (reduceMotion) {
    return (
      <div className={`relative ${className}`} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        transformStyle: 'preserve-3d',
      }}
      className={`relative will-change-transform ${className}`}
      {...rest}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ background: glareBg }}
        />
      )}
    </motion.div>
  );
}

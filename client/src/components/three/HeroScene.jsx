import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Sparkles, Environment, Lightformer } from '@react-three/drei';

/**
 * HeroScene — latar 3D landing page: koin BTC / ETH / SOL metalik yang
 * ngambang, muter pelan, dan ikut "noleh" ngikutin gerakan mouse (parallax).
 *
 * Teknologi: Three.js lewat @react-three/fiber (renderer React untuk WebGL).
 *
 * Keputusan teknis:
 *   - Simbol koin digambar ke <canvas> 2D lalu dijadikan tekstur
 *     (CanvasTexture) → gak perlu download font/asset eksternal.
 *   - Lighting pakai <Environment> berisi Lightformer (panel cahaya
 *     prosedural) → refleksi metalik tanpa fetch file HDRI dari internet.
 *   - Canvas transparan (alpha) supaya nyatu sama background halaman.
 *   - Komponen ini di-lazy-load dari HomePage biar bundle awal tetap kecil.
 */

/* ── Tekstur muka koin ─────────────────────────────────────────────
   Gambar ring + simbol ke canvas 512×512 dengan background transparan.
   gradient: kalau diisi [warnaA, warnaB], simbol digambar pakai
   linear-gradient (dipakai koin Solana). */
function makeFaceTexture(symbol, color, gradient = null) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Ring tipis di pinggir muka koin
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 36, 0, Math.PI * 2);
  ctx.stroke();

  // Ring kedua lebih halus (detail emboss)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 64, 0, Math.PI * 2);
  ctx.stroke();

  // Simbol di tengah (font system, gak perlu network)
  if (gradient) {
    const g = ctx.createLinearGradient(size * 0.25, size * 0.2, size * 0.75, size * 0.85);
    g.addColorStop(0, gradient[0]);
    g.addColorStop(1, gradient[1]);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = color;
  }
  ctx.font = `700 ${size * 0.46}px "Segoe UI", -apple-system, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, size / 2, size / 2 + size * 0.015);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/* ── Satu koin 3D ──────────────────────────────────────────────────
   Badan = silinder metalik. Muka depan/belakang = lingkaran dengan
   tekstur simbol transparan, ditempel 1mm di atas permukaan.
   Muka belakang diputar 180° biar simbolnya gak mirror. */
function Coin({
  symbol,
  bodyColor,
  faceColor = '#ffffff',
  faceGradient = null,
  spinSpeed = 0.3,
  ...groupProps
}) {
  const spinRef = useRef();

  const faceTexture = useMemo(
    () => makeFaceTexture(symbol, faceColor, faceGradient),
    [symbol, faceColor, faceGradient],
  );

  // Idle spin pelan di sumbu vertikal — muka & sisi koin gantian kelihatan
  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * spinSpeed;
  });

  // emissiveMap = tekstur yang sama → cuma area simbol/ring yang "glow"
  // lembut, jadi simbol tetap kebaca dari sudut cahaya mana pun.
  const faceMaterialProps = {
    map: faceTexture,
    emissiveMap: faceTexture,
    emissive: '#ffffff',
    emissiveIntensity: 0.35,
    transparent: true,
    metalness: 0.2,
    roughness: 0.45,
  };

  return (
    <group {...groupProps}>
      <group ref={spinRef}>
        {/* Badan koin (silinder, sumbu diputar biar muka hadap kamera).
            Metalness gak full 1 supaya warna body tetap kelihatan terang
            walau refleksi environment-nya gelap. */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1, 1, 0.16, 72]} />
          <meshStandardMaterial
            color={bodyColor}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
        {/* Muka depan */}
        <mesh position={[0, 0, 0.082]}>
          <circleGeometry args={[0.96, 72]} />
          <meshStandardMaterial {...faceMaterialProps} />
        </mesh>
        {/* Muka belakang (rotasi 180° supaya simbol gak kebalik) */}
        <mesh position={[0, 0, -0.082]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.96, 72]} />
          <meshStandardMaterial {...faceMaterialProps} />
        </mesh>
      </group>
    </group>
  );
}

/* ── Rig parallax ──────────────────────────────────────────────────
   Seluruh isi scene dibungkus group yang rotasinya ngikutin posisi
   mouse di window (di-lerp pakai damp biar halus). Listener dipasang
   di window karena canvas-nya pointer-events: none. */
function ParallaxRig({ children, enabled = true }) {
  const ref = useRef();
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return undefined;
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1; // -1..1
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [enabled]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const targetY = pointer.current.x * 0.22;
    const targetX = pointer.current.y * 0.12;
    ref.current.rotation.y = THREE.MathUtils.damp(
      ref.current.rotation.y,
      targetY,
      3.5,
      delta,
    );
    ref.current.rotation.x = THREE.MathUtils.damp(
      ref.current.rotation.x,
      targetX,
      3.5,
      delta,
    );
  });

  return <group ref={ref}>{children}</group>;
}

/* ── Isi scene ─────────────────────────────────────────────────────
   Posisi & ukuran koin dihitung PROPORSIONAL terhadap viewport 3D
   (lebar area yang kelihatan kamera), bukan angka mati — jadi di layar
   lebar koin tetap di pinggir (gak nutupin headline), dan di layar
   sempit koin otomatis mengecil. */
function SceneContent({ animated }) {
  const { width: vw, height: vh } = useThree((state) => state.viewport);
  const coinScale = Math.min(vw * 0.082, 1.35);

  return (
    <ParallaxRig enabled={animated}>
      {/* Bitcoin — kiri atas, paling besar */}
      <Float speed={1.4} rotationIntensity={0.45} floatIntensity={1.1}>
        <Coin
          symbol="₿"
          bodyColor="#f7931a"
          position={[-vw * 0.38, vh * 0.2, -1.4]}
          scale={coinScale * 1.15}
          spinSpeed={0.28}
        />
      </Float>

      {/* Ethereum — kanan atas */}
      <Float speed={1.7} rotationIntensity={0.5} floatIntensity={1.3}>
        <Coin
          symbol="Ξ"
          bodyColor="#627eea"
          position={[vw * 0.39, vh * 0.14, -1.1]}
          scale={coinScale}
          spinSpeed={-0.34}
        />
      </Float>

      {/* Solana — kiri bawah, koin gelap dengan simbol gradient brand */}
      <Float speed={1.5} rotationIntensity={0.55} floatIntensity={1.2}>
        <Coin
          symbol="◎"
          bodyColor="#232336"
          faceGradient={['#9945ff', '#14f195']}
          position={[-vw * 0.32, -vh * 0.3, -0.6]}
          scale={coinScale * 0.8}
          spinSpeed={0.4}
        />
      </Float>

      {/* Koin perak generik — kanan bawah, kecil (pemanis komposisi) */}
      <Float speed={1.9} rotationIntensity={0.6} floatIntensity={1.4}>
        <Coin
          symbol="$"
          bodyColor="#b9bdc7"
          position={[vw * 0.34, -vh * 0.32, -2.2]}
          scale={coinScale * 0.55}
          spinSpeed={-0.45}
        />
      </Float>

      {/* Partikel halus — kesan "data" bertebaran */}
      <Sparkles
        count={90}
        scale={[vw * 0.9, vh * 0.95, 6]}
        size={2.4}
        speed={animated ? 0.32 : 0}
        opacity={0.45}
        color="#7aa5ff"
      />
    </ParallaxRig>
  );
}

/* ── Scene utama ─────────────────────────────────────────────────── */
export default function HeroScene({ animated = true }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 9], fov: 40 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      frameloop={animated ? 'always' : 'demand'}
      style={{ pointerEvents: 'none' }}
    >
      {/* Cahaya dasar */}
      <ambientLight intensity={0.8} />
      <hemisphereLight intensity={0.5} color="#ffffff" groundColor="#d8d8e0" />
      <directionalLight position={[6, 8, 5]} intensity={1.2} />

      {/* Environment prosedural → refleksi metalik (tanpa file HDRI).
          Panel paling depan penting: muka koin menghadap kamera, jadi
          yang dia pantulkan adalah cahaya dari arah kamera. */}
      <Environment resolution={64}>
        <Lightformer intensity={1.6} position={[0, 0, 8]} scale={[16, 10, 1]} />
        <group rotation={[-Math.PI / 3, 0, 0]}>
          <Lightformer intensity={2.2} position={[0, 5, -9]} scale={[10, 10, 1]} />
          <Lightformer
            intensity={1.4}
            position={[-6, 1, -1]}
            rotation-y={Math.PI / 2}
            scale={[12, 3, 1]}
          />
          <Lightformer
            intensity={1.4}
            position={[6, 1, 0]}
            rotation-y={-Math.PI / 2}
            scale={[12, 3, 1]}
          />
          <Lightformer
            intensity={0.8}
            color="#5ac8fa"
            position={[0, -3, 4]}
            scale={[10, 2, 1]}
          />
        </group>
      </Environment>

      <SceneContent animated={animated} />
    </Canvas>
  );
}

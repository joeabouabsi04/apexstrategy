/* ============================================================
   APEXSTRATEGY — HERO.JS
   Drives the full-viewport landing hero on index.html.
   Requires THREE (r128) and VANTA globals from CDN scripts
   loaded before <script type="module">.

   Features:
     1. Vanta NET animated wireframe mesh background
        — theme-reactive: updates color + backgroundColor live
          when the user toggles dark ↔ light mode, using
          Vanta's built-in setOptions() without remounting.
     2. Three.js wireframe TorusKnot (3D accent right column)
     3. Decode-in headline
     4. Number roll-up on stats
     5. Scroll-down arrow animation
   ============================================================ */

import { animateValue, decodeText } from "./anim.js";

/*-- SECTION: VANTA STATE --*/

// Module-level reference — kept alive so _updateVantaTheme()
// can call setOptions() on the live effect at any time.
let _vantaEffect = null;

/**
 * Maps a theme name to the correct Vanta color/backgroundColor pair.
 * Hex values mirror the CSS custom properties in style.css exactly:
 *   dark  → --neon #00ff66, --bg-primary #0b0d11
 *   light → --neon #007a2a, --bg-primary #eceef5
 *
 * @param {string} theme  "light" | "dark" (or anything → treated as dark)
 * @returns {{ color: number, backgroundColor: number }}
 */
function _vantaColors(theme) {
  return theme === "light"
    ? { color: 0x007a2a, backgroundColor: 0xeceef5 }
    : { color: 0x00ff66, backgroundColor: 0x0b0d11 };
}

/*-- SECTION: VANTA BACKGROUND --*/

function initVanta() {
  const el = document.getElementById("vantaBg");
  if (!el || !window.VANTA || !window.THREE) return;

  // Read the theme that's already been applied by NavigationController
  // (persisted in localStorage and set on <html data-theme> before this runs)
  const currentTheme =
    document.documentElement.getAttribute("data-theme") ?? "dark";
  const { color, backgroundColor } = _vantaColors(currentTheme);

  _vantaEffect = window.VANTA.NET({
    el,
    THREE: window.THREE,
    mouseControls: true,
    touchControls: true,
    gyroControls: false,
    minHeight: 200,
    minWidth: 200,
    scale: 1.0,
    scaleMobile: 1.0,
    color,
    backgroundColor,
    // Slightly denser than default — evokes a live telemetry data mesh
    // rather than a generic background graphic.
    points: 12.0, // node count
    maxDistance: 20.0, // max connection radius
    spacing: 16.0, // node spacing
    showDots: false, // clean lines only — no dot clutter
  });

  // React to theme toggles dispatched by NavigationController._applyTheme().
  // setOptions() updates the renderer in-place; no canvas destroy/remount needed.
  document.addEventListener("apex:themechange", (e) => {
    if (!_vantaEffect) return;
    const { color: c, backgroundColor: bg } = _vantaColors(
      e.detail?.theme ?? "dark",
    );
    try {
      _vantaEffect.setOptions({ color: c, backgroundColor: bg });
    } catch (err) {
      // setOptions() shouldn't fail but guard defensively
      console.warn("[Hero] Vanta setOptions failed:", err);
    }
  });
}

/*-- SECTION: THREE.JS TORUS KNOT --*/

function initThreeCanvas() {
  const canvas = document.getElementById("heroCanvas");
  if (!canvas || !window.THREE) return;

  const W = canvas.clientWidth || 340;
  const H = canvas.clientHeight || 340;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 1000);
  camera.position.set(0, 0, 200);

  // Outer torus knot — the 3D focal piece
  const geo = new THREE.TorusKnotGeometry(52, 14, 120, 18, 2, 3);
  const wire = new THREE.WireframeGeometry(geo);
  const mat = new THREE.LineBasicMaterial({
    color: 0x00ff66,
    transparent: true,
    opacity: 0.55,
  });
  const knot = new THREE.LineSegments(wire, mat);
  scene.add(knot);

  // Inner accent ring
  const ringGeo = new THREE.TorusGeometry(72, 1.2, 4, 80);
  const ringWire = new THREE.WireframeGeometry(ringGeo);
  const ringMat = new THREE.LineBasicMaterial({
    color: 0x00ff66,
    transparent: true,
    opacity: 0.18,
  });
  const ring = new THREE.LineSegments(ringWire, ringMat);
  scene.add(ring);

  // Particle dots scattered around
  const dotGeo = new THREE.BufferGeometry();
  const dotPos = new Float32Array(90); // 30 dots × xyz
  for (let i = 0; i < 90; i++) dotPos[i] = (Math.random() - 0.5) * 200;
  dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPos, 3));
  const dotMat = new THREE.PointsMaterial({
    color: 0x00ff66,
    size: 1.4,
    transparent: true,
    opacity: 0.35,
  });
  const dots = new THREE.Points(dotGeo, dotMat);
  scene.add(dots);

  // Responsive resize
  const onResize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", onResize);

  // Animation loop — respect reduced-motion
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  let frameId;

  const tick = () => {
    frameId = requestAnimationFrame(tick);
    if (!prefersReduced) {
      knot.rotation.x += 0.004;
      knot.rotation.y += 0.007;
      ring.rotation.z += 0.003;
      dots.rotation.y += 0.001;
    }
    renderer.render(scene, camera);
  };
  tick();

  // Pause when off-screen (IntersectionObserver)
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries[0].isIntersecting ? tick() : cancelAnimationFrame(frameId);
      },
      { threshold: 0 },
    );
    io.observe(canvas);
  }
}

/*-- SECTION: STATS ROLL-UP --*/

function animateStats() {
  const stats = [
    { id: "hstat1", to: 20, suffix: "" }, // circuits
    { id: "hstat2", to: 4, suffix: "" }, // sessions
    { id: "hstat3", to: 7, suffix: "" }, // compounds
  ];

  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  stats.forEach(({ id, to, suffix }, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (prefersReduced) {
      el.textContent = to + suffix;
      return;
    }
    // Stagger each stat slightly
    setTimeout(
      () => {
        animateValue(el, to, { duration: 900, decimals: 0, suffix });
      },
      300 + i * 150,
    );
  });
}

/*-- SECTION: HEADLINE DECODE --*/

function animateHeadline() {
  const el = document.getElementById("heroTagline");
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return;
  const txt = el.textContent.trim();
  el.textContent = "";
  setTimeout(() => decodeText(el, txt, { duration: 500 }), 600);
}

/*-- SECTION: SCROLL INDICATOR --*/

function initScrollIndicator() {
  const cta = document.querySelector(".hero-cta");
  if (!cta) return;
  cta.addEventListener("click", (e) => {
    e.preventDefault();
    const target = document.getElementById("commandCenter");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/*-- SECTION: PUBLIC INIT --*/

export function initHero() {
  // Slight delay so DOM is fully painted before Three.js measures canvas
  requestAnimationFrame(() => {
    initVanta();
    initThreeCanvas();
    animateStats();
    animateHeadline();
    initScrollIndicator();
  });
}

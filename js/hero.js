/* ============================================================
   APEXSTRATEGY — HERO.JS
   Drives the full-viewport landing hero on index.html.

   Replaces the previous Vanta.js NET background with a bespoke
   Three.js (r128, global) motorsport scene that actually fits
   the telemetry theme:

     1. BACKGROUND — an infinite scrolling "telemetry track floor":
        a perspective grid rushing toward the camera with a drifting
        data-point particle field and depth fog. Evokes speed + a
        live track surface. Reacts to pointer for deep parallax.
     2. FOCAL (right column) — a glowing 3D "apex racing line":
        a Catmull-Rom spline shaped like a corner, with a bright
        marker (the car) lapping it and concentric telemetry rings.
     3. Decode-in headline, number roll-up on stats, scroll cue.

   Motion follows the animate-skill principles: GPU-only transforms,
   ~200-600ms entrances with ease-out, and a hard bail-out under
   prefers-reduced-motion. Both scenes recolour live on theme change.

   ── OPTIONAL ASSET ──────────────────────────────────────────
   The focal piece is fully procedural so it works with no assets.
   To swap in a real F1 car model, drop a glTF file at
   `assets/f1-car.glb` (low-poly, < ~2 MB, Y-up, facing +Z) and
   load Three's GLTFLoader — see initFocal() for the hook comment.
   ============================================================ */

import { animateValue, decodeText } from "./anim.js";

/*-- SECTION: THEME COLOURS --*/

// Hex mirrors the CSS custom properties in style.css exactly:
//   dark  → --neon #00ff66, --bg-primary #0b0d11
//   light → --neon #057a45, --bg-primary #eef1f7
const THEME_COLORS = {
  dark: { neon: 0x00ff66, bg: 0x0b0d11 },
  light: { neon: 0x057a45, bg: 0xeef1f7 },
};

function themeColors(theme) {
  return theme === "light" ? THEME_COLORS.light : THEME_COLORS.dark;
}

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") ?? "dark";
}

function prefersReduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Live scene handles so the theme listener can recolour without remounting.
const _scenes = [];

/*-- SECTION: BACKGROUND — TELEMETRY TRACK FLOOR --*/

function buildGrid(size, div, color) {
  const half = size / 2;
  const step = size / div;
  const verts = [];
  for (let i = 0; i <= div; i++) {
    const p = -half + i * step;
    // line parallel to X (constant z) + line parallel to Z (constant x)
    verts.push(-half, 0, p, half, 0, p);
    verts.push(p, 0, -half, p, 0, half);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.26,
  });
  return new THREE.LineSegments(geo, mat);
}

function initBackground() {
  const canvas = document.getElementById("heroBgCanvas");
  if (!canvas || !window.THREE) return;

  const host = canvas.closest(".hero-section") || canvas.parentElement;
  const size = () => ({
    w: host.clientWidth || window.innerWidth,
    h: host.clientHeight || window.innerHeight,
  });
  let { w, h } = size();

  const { neon, bg } = themeColors(currentTheme());

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(bg, 45, 150);

  const camera = new THREE.PerspectiveCamera(62, w / h, 0.1, 400);
  const CAM = { x: 0, y: 9, z: 26 };
  camera.position.set(CAM.x, CAM.y, CAM.z);
  camera.lookAt(0, 0, -34);

  // Infinite floor — periodic grid; scroll by one CELL then wrap seamlessly.
  const CELL = 8;
  const DIV = 48;
  const SIZE = CELL * DIV;
  const grid = buildGrid(SIZE, DIV, neon);
  scene.add(grid);

  // Drifting telemetry particles above the floor
  const COUNT = 130;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * SIZE;
    pos[i * 3 + 1] = Math.random() * 34 + 2;
    pos[i * 3 + 2] = (Math.random() - 0.5) * SIZE;
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pmat = new THREE.PointsMaterial({
    color: neon,
    size: 0.55,
    transparent: true,
    opacity: 0.5,
  });
  const particles = new THREE.Points(pgeo, pmat);
  scene.add(particles);

  // Deep-parallax pointer target (camera sways slightly toward cursor)
  const parallax = { x: 0, y: 0 };
  const onPointer = (e) => {
    parallax.x = (e.clientX / window.innerWidth - 0.5) * 2;
    parallax.y = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener("pointermove", onPointer, { passive: true });

  const onResize = () => {
    ({ w, h } = size());
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", onResize);

  const reduced = prefersReduced();
  let raf = null;
  let running = false;

  const tick = () => {
    raf = requestAnimationFrame(tick);

    // Rush the floor toward the camera; wrap at one cell for seamlessness.
    grid.position.z = (grid.position.z + 0.45) % CELL;

    // Particles drift forward and recycle behind the camera.
    const arr = pgeo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 2] += 0.4;
      if (arr[i * 3 + 2] > SIZE / 2) arr[i * 3 + 2] = -SIZE / 2;
    }
    pgeo.attributes.position.needsUpdate = true;

    // Eased deep-parallax sway
    camera.position.x += (CAM.x + parallax.x * 6 - camera.position.x) * 0.04;
    camera.position.y += (CAM.y - parallax.y * 3 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, -34);

    renderer.render(scene, camera);
  };

  const start = () => {
    if (running) return;
    running = true;
    if (reduced) {
      renderer.render(scene, camera); // single static frame
      running = false;
      return;
    }
    tick();
  };
  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    running = false;
  };

  start();

  // Pause when the hero scrolls out of view
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => (entries[0].isIntersecting ? start() : stop()),
      { threshold: 0 },
    );
    io.observe(canvas);
  }

  _scenes.push({
    recolor(theme) {
      const c = themeColors(theme);
      grid.material.color.setHex(c.neon);
      pmat.color.setHex(c.neon);
      scene.fog.color.setHex(c.bg);
    },
  });
}

/*-- SECTION: FOCAL — SPINNING CIRCUIT GRAPHIC --*/

/**
 * Loads tracks/hero.svg and inlines it into both faces of the 3D rotor
 * (.hero-circuit-rotor, CSS in style.css) so it genuinely spins in 3D —
 * a front face and a back face (rotated 180deg, backface-visibility
 * hidden) so the correct, unmirrored artwork is shown on both halves
 * of the rotation, card-flip style. Inlining (rather than <img>) lets
 * the graphic pick up `color: var(--neon)` and recolour live on theme
 * change, same as the rest of the hero.
 */
function initFocal() {
  const rotor = document.getElementById("heroCircuitRotor");
  if (!rotor) return;
  const faces = rotor.querySelectorAll(".hero-circuit-face");
  if (!faces.length) return;

  fetch("tracks/hero.svg")
    .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((svgText) => {
      faces.forEach((face) => {
        face.innerHTML = svgText;
        const svg = face.querySelector("svg");
        if (!svg) return;
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("fill", "currentColor");
        svg.setAttribute("aria-hidden", "true");
      });
    })
    .catch((err) => console.warn("[Hero] circuit svg load failed:", err));
}

/*-- SECTION: THEME LISTENER --*/

function initThemeListener() {
  document.addEventListener("apex:themechange", (e) => {
    const theme = e.detail?.theme ?? currentTheme();
    _scenes.forEach((s) => {
      try {
        s.recolor(theme);
      } catch (err) {
        console.warn("[Hero] recolor failed:", err);
      }
    });
  });
}

/*-- SECTION: STATS ROLL-UP --*/

function animateStats() {
  const stats = [
    { id: "hstat1", to: 20, suffix: "" }, // circuits
    { id: "hstat2", to: 4, suffix: "" }, // sessions
    { id: "hstat3", to: 7, suffix: "" }, // compounds
  ];
  const reduced = prefersReduced();

  stats.forEach(({ id, to, suffix }, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (reduced) {
      el.textContent = to + suffix;
      return;
    }
    setTimeout(
      () => animateValue(el, to, { duration: 900, decimals: 0, suffix }),
      300 + i * 150,
    );
  });
}

/*-- SECTION: HEADLINE DECODE --*/

function animateHeadline() {
  const el = document.getElementById("heroTagline");
  if (!el || prefersReduced()) return;
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
    document
      .getElementById("commandCenter")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/*-- SECTION: PUBLIC INIT --*/

export function initHero() {
  // Defer one frame so the DOM is painted before Three.js measures canvases.
  requestAnimationFrame(() => {
    initBackground();
    initFocal();
    initThemeListener();
    animateStats();
    animateHeadline();
    initScrollIndicator();
  });
}

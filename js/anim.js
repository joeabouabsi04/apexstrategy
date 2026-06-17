/* ============================================================
   APEXSTRATEGY — ANIM.JS
   Shared animation utilities. No dependencies. Import anywhere.
   ============================================================ */

/*-- SECTION: ANIMATE VALUE --*/

/** Count a numeric element from current to target value using rAF. */
export function animateValue(el, to, opts = {}) {
  const {
    duration = 500,
    decimals = 0,
    prefix = "",
    suffix = "",
    onComplete = null,
  } = opts;
  const from = parseFloat(el.dataset.rawValue ?? el.textContent ?? "0") || 0;
  const startTime = performance.now();
  el.dataset.rawValue = String(to);

  const tick = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent =
      prefix + (from + (to - from) * eased).toFixed(decimals) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
    else {
      el.textContent = prefix + to.toFixed(decimals) + suffix;
      onComplete?.();
    }
  };
  requestAnimationFrame(tick);
}

/*-- SECTION: DECODE TEXT --*/

/** Scramble-in text reveal — glyphs flicker before settling. */
export function decodeText(el, finalText, opts = {}) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = finalText;
    return;
  }
  const {
    duration = 320,
    glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/._-:",
  } = opts;
  const steps = 14;
  let i = 0;
  const iv = setInterval(() => {
    const revealed = (i / steps) * finalText.length;
    el.textContent = finalText
      .split("")
      .map((ch, idx) => {
        if (ch === " ") return "\u00A0";
        if (idx < revealed) return ch;
        return glyphs[Math.floor(Math.random() * glyphs.length)];
      })
      .join("");
    if (++i > steps) {
      clearInterval(iv);
      el.textContent = finalText;
    }
  }, duration / steps);
}

/*-- SECTION: FLASH CELL --*/

/** Brief neon/danger flash on a DOM element when its value changes. */
export function flashCell(el, direction = null) {
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return;
  const cls =
    direction === "up"
      ? "flash-up"
      : direction === "down"
        ? "flash-down"
        : null;
  if (!cls) return;
  el.classList.remove("flash-up", "flash-down");
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove("flash-up", "flash-down"), 240);
}

/*-- SECTION: BOOT SEQUENCE --*/

/** Power-on: decodes the page title, removes boot-pending. */
export function runBootSequence() {
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  requestAnimationFrame(() => document.body.classList.remove("boot-pending"));
  if (prefersReduced) return;
  const titleEl = document.getElementById("pageTitle");
  if (titleEl) {
    const txt = titleEl.textContent.trim();
    setTimeout(() => decodeText(titleEl, txt, { duration: 420 }), 120);
  }
}

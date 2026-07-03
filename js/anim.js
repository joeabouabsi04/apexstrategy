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

/*-- SECTION: FADE TEXT --*/

/**
 * Cross-fades an element's text to a new value instead of scrambling it
 * character-by-character. Use this for multi-line / paragraph content
 * where decodeText's per-glyph width fluctuation causes the line count
 * (and therefore the whole layout below it) to flicker during the
 * animation — decodeText is safe on short, fixed-width labels only.
 */
export function fadeText(el, text, opts = {}) {
  if (!el) return;
  const { duration = 180 } = opts;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = text;
    return;
  }
  el.style.transition = `opacity ${duration}ms ease-out`;
  el.style.opacity = "0";
  setTimeout(() => {
    el.textContent = text;
    el.style.opacity = "1";
  }, duration);
}

/*-- SECTION: BOOT SEQUENCE --*/

/** Power-on: scramble-decodes the page title (e.g. the handbook H1). */
export function runBootSequence() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const titleEl = document.getElementById("pageTitle");
  if (titleEl) {
    const txt = titleEl.textContent.trim();
    setTimeout(() => decodeText(titleEl, txt, { duration: 420 }), 120);
  }
}

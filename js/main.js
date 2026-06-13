/* ============================================================
   APEXSTRATEGY — MAIN.JS
   Shared animation helpers and boot sequence.
   Every controller imports from window.ApexAnim — build once,
   reuse everywhere. No reinventing count-up per page.
   ============================================================ */

/*-- SECTION: ANIMATE VALUE (count-up readout) --*/

/**
 * Counts a numeric element from its current value to a target using rAF.
 * Supports decimals. Powers all live readout reveals.
 * @param {HTMLElement} el        - Target element
 * @param {number}      to        - Final value
 * @param {object}      opts      - { duration, decimals, prefix, suffix, onComplete }
 */
function animateValue(el, to, opts = {}) {
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
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Cubic ease-out: fast start, hard settle — mechanical feel
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * eased;
    el.textContent = prefix + current.toFixed(decimals) + suffix;

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = prefix + to.toFixed(decimals) + suffix;
      onComplete?.();
    }
  };

  requestAnimationFrame(tick);
}

/*-- SECTION: DECODE TEXT (scramble-in reveal) --*/

/**
 * Scrambles an element's text through random glyphs before settling on the real string.
 * Like a split-flap board locking onto a value. Use on headers and weather descriptions.
 * @param {HTMLElement} el         - Target element
 * @param {string}      finalText  - The real string to reveal
 * @param {object}      opts       - { duration, glyphs }
 */
function decodeText(el, finalText, opts = {}) {
  // Respect reduced motion — just set the text immediately
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = finalText;
    return;
  }

  const {
    duration = 320,
    glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/._-:",
  } = opts;

  const steps = 14;
  const stepMs = duration / steps;
  let iteration = 0;

  const interval = setInterval(() => {
    const revealedUpTo = (iteration / steps) * finalText.length;

    el.textContent = finalText
      .split("")
      .map((char, i) => {
        if (char === " ") return "\u00A0"; // non-breaking space preserves layout
        if (i < revealedUpTo) return char;
        return glyphs[Math.floor(Math.random() * glyphs.length)];
      })
      .join("");

    iteration++;
    if (iteration > steps) {
      clearInterval(interval);
      el.textContent = finalText;
    }
  }, stepMs);
}

/*-- SECTION: FLASH CELL (value-change indicator) --*/

/**
 * Briefly flashes neon or danger border+bg on a cell when its value updates.
 * The ONE place a glow is permitted — it means live data arrived and changed.
 * @param {HTMLElement}       el        - Element to flash
 * @param {'up'|'down'|null}  direction - 'up' = neon, 'down' = danger
 */
function flashCell(el, direction = null) {
  if (!el) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const cls =
    direction === "up"
      ? "flash-up"
      : direction === "down"
        ? "flash-down"
        : null;
  if (!cls) return;

  // Remove → force reflow → re-add so CSS animation restarts cleanly
  el.classList.remove("flash-up", "flash-down");
  void el.offsetWidth;
  el.classList.add(cls);

  // Clean up after animation completes (200ms from CSS)
  setTimeout(() => el.classList.remove("flash-up", "flash-down"), 240);
}

/*-- SECTION: BOOT SEQUENCE --*/

/**
 * Runs the power-on sequence once on page load.
 * Decodes the page title, removes boot-pending class, starts ambient effects.
 * Skips animation instantly under prefers-reduced-motion.
 */
function runBootSequence() {
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  // Always remove the class — just skip the theatrical reveal
  requestAnimationFrame(() => {
    document.body.classList.remove("boot-pending");
  });

  if (prefersReduced) return;

  // Decode-in the page title if one is marked
  const titleEl = document.getElementById("pageTitle");
  if (titleEl) {
    const originalText = titleEl.textContent.trim();
    // Slight delay so the rest of the DOM is painted first
    setTimeout(() => decodeText(titleEl, originalText, { duration: 420 }), 120);
  }
}

/*-- SECTION: EXPORTS --*/

// All helpers live on window.ApexAnim so every controller can call them
// without importing — consistent with the single-file, no-bundler setup.
window.ApexAnim = Object.freeze({ animateValue, decodeText, flashCell });

/*-- SECTION: INIT --*/

document.addEventListener("DOMContentLoaded", () => {
  runBootSequence();
});

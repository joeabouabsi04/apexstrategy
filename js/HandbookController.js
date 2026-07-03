/* ============================================================
   APEXSTRATEGY — HANDBOOK CONTROLLER  (ES6 module)
   Builds the handbook's tab buttons and pane content by looping
   over the data in handbook-data.js, then hands the finished DOM
   to the generic TabController. No chapter markup is hand-written
   in handbook.html — add data, get a rendered chapter.
   ============================================================ */

import {
  GLOSSARY,
  COMPOUNDS,
  AERO_SECTIONS,
  TRACK_TYPES,
  HANDBOOK_CHAPTERS,
} from "./handbook-data.js";
import { TabController } from "./TabController.js";

/*-- SECTION: PANE RENDERERS --*/
// Each returns the innerHTML for one chapter's pane.

const RENDERERS = {
  glossary() {
    return `<div class="handbook-grid">${GLOSSARY.map(
      (g) => `
        <div class="handbook-entry">
          <h3 class="handbook-term">${g.term}</h3>
          <p class="handbook-def">${g.def}</p>
        </div>`,
    ).join("")}</div>`;
  },

  compounds() {
    return `<div class="compound-grid">${COMPOUNDS.map(
      (c) => `
        <div class="compound-card">
          <div class="compound-card-accent" style="background:${c.accent}"></div>
          <div class="compound-card-body">
            <div class="compound-name">${c.name}</div>
            <div class="compound-temp">${c.temp}</div>
            ${c.ratings
              .map(
                (r) => `
              <div class="rating-row">
                <div class="rating-label">${r.label}</div>
                <div class="rating-bar-track">
                  <div class="rating-bar-fill" style="width:${r.pct}%;background:${r.color}"></div>
                </div>
                <div class="rating-num">${r.value}</div>
              </div>`,
              )
              .join("")}
            <div class="compound-desc">${c.desc}</div>
          </div>
        </div>`,
    ).join("")}</div>`;
  },

  aero() {
    return AERO_SECTIONS.map(
      (s) => `
      <div class="aero-section">
        <h3 class="aero-section-title">${s.title}</h3>
        <p class="aero-section-body">${s.body}</p>
        ${
          s.angles
            ? `<div class="aero-angle-grid">${s.angles
                .map(
                  (a) => `
              <div class="rec-block${
                a.level === "warning"
                  ? " rec-warning"
                  : a.level === "critical"
                    ? " rec-critical"
                    : ""
              }">
                <div class="rec-title">${a.title}</div>
                <div class="rec-value">${a.value}</div>
                <div class="rec-reason">${a.reason}</div>
              </div>`,
                )
                .join("")}</div>`
            : ""
        }
      </div>`,
    ).join("");
  },

  tracks() {
    return `<div class="track-type-grid">${TRACK_TYPES.map(
      (t) => `
        <div class="track-type-card">
          <div class="track-type-header">
            <div class="track-type-name" style="color:${t.color}">${t.name}</div>
            <span class="circuit-card-type ${t.badge}">${t.typeLabel}</span>
          </div>
          <div class="track-type-body">
            <div class="track-examples">${t.examples}</div>
            <div class="track-desc">${t.desc}</div>
            <div class="track-priorities-title">Key setup priorities</div>
            ${t.priorities
              .map((p) => `<div class="track-priority-item">${p}</div>`)
              .join("")}
          </div>
        </div>`,
    ).join("")}</div>`;
  },
};

/*-- SECTION: CONTROLLER --*/

// Card selectors that count as one searchable "entry" per chapter
const SEARCH_ITEM_SELECTOR =
  ".handbook-entry, .compound-card, .aero-section, .track-type-card";

export class HandbookController {
  constructor(navSelector, panesSelector) {
    this._nav = document.querySelector(navSelector);
    this._panes = document.querySelector(panesSelector);
    if (!this._nav || !this._panes) {
      console.warn("[HandbookController] containers not found");
      return;
    }
    this._build();
    // Hand the generated DOM to the shared, DOM-driven tab manager.
    this._tabs = new TabController(navSelector, panesSelector);
    this._initSearch();
  }

  _build() {
    this._nav.innerHTML = HANDBOOK_CHAPTERS.map(
      (ch, i) => `
      <button class="workbench-tab${i === 0 ? " tab-active" : ""}"
              data-tab="${ch.id}" role="tab">${ch.label}<span class="tab-count hidden"></span></button>`,
    ).join("");

    this._panes.innerHTML = HANDBOOK_CHAPTERS.map(
      (ch, i) => `
      <section class="workbench-pane${i === 0 ? " pane-active" : ""}"
               data-pane="${ch.id}" aria-label="${ch.label}">
        ${RENDERERS[ch.render]()}
        <p class="hb-no-match hidden">No matches in this chapter. Try another tab.</p>
      </section>`,
    ).join("");
  }

  /*-- SECTION: SEARCH --*/

  /**
   * Live filter across ALL chapters: hides non-matching cards, shows a
   * per-chapter empty state, and puts a match-count badge on each tab
   * so it's obvious which chapters hold the results.
   */
  _initSearch() {
    const input = document.getElementById("handbookSearch");
    if (!input) return;

    // Pre-compute each card's searchable text once, and cache its
    // original markup so highlighting can always start from a clean
    // slate instead of stacking <mark> tags on every keystroke.
    this._originalHTML = new Map();
    this._panes.querySelectorAll(SEARCH_ITEM_SELECTOR).forEach((el) => {
      el.dataset.search = el.textContent.toLowerCase();
      this._originalHTML.set(el, el.innerHTML);
    });

    let t;
    input.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => this._applySearch(input.value), 180);
    });
  }

  _applySearch(query) {
    const q = query.trim().toLowerCase();

    this._panes.querySelectorAll("[data-pane]").forEach((pane) => {
      const items = pane.querySelectorAll(SEARCH_ITEM_SELECTOR);
      let matches = 0;
      items.forEach((el) => {
        // Reset to the original markup first so old highlights never
        // compound into nested/incorrect <mark> wrapping.
        const original = this._originalHTML.get(el);
        if (original !== undefined) el.innerHTML = original;

        const hit = !q || el.dataset.search.includes(q);
        el.classList.toggle("hidden", !hit);
        if (hit && q) this._highlightMatches(el, q);
        if (hit) matches++;
      });

      pane
        .querySelector(".hb-no-match")
        ?.classList.toggle("hidden", !q || matches > 0);

      // Match-count badge on the corresponding tab
      const badge = this._nav.querySelector(
        `[data-tab="${pane.dataset.pane}"] .tab-count`,
      );
      if (badge) {
        badge.textContent = matches;
        badge.classList.toggle("hidden", !q);
      }
    });
  }

  /**
   * Wraps every occurrence of `query` in a <mark> inside root's text
   * (Ctrl+F style highlighting), touching only text nodes so ratings
   * bars, badges and inline styles are left completely untouched.
   */
  _highlightMatches(root, query) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.toLowerCase().includes(query)) nodes.push(node);
    }

    nodes.forEach((textNode) => {
      const text = textNode.nodeValue;
      const lower = text.toLowerCase();
      const frag = document.createDocumentFragment();
      let i = 0;
      let pos;
      while ((pos = lower.indexOf(query, i)) !== -1) {
        if (pos > i) frag.appendChild(document.createTextNode(text.slice(i, pos)));
        const mark = document.createElement("mark");
        mark.className = "hb-mark";
        mark.textContent = text.slice(pos, pos + query.length);
        frag.appendChild(mark);
        i = pos + query.length;
      }
      if (i < text.length) frag.appendChild(document.createTextNode(text.slice(i)));
      textNode.replaceWith(frag);
    });
  }
}

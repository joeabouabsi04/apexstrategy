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
  }

  _build() {
    this._nav.innerHTML = HANDBOOK_CHAPTERS.map(
      (ch, i) => `
      <button class="workbench-tab${i === 0 ? " tab-active" : ""}"
              data-tab="${ch.id}" role="tab">${ch.label}</button>`,
    ).join("");

    this._panes.innerHTML = HANDBOOK_CHAPTERS.map(
      (ch, i) => `
      <section class="workbench-pane${i === 0 ? " pane-active" : ""}"
               data-pane="${ch.id}" aria-label="${ch.label}">
        ${RENDERERS[ch.render]()}
      </section>`,
    ).join("");
  }
}

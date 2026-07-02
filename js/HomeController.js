/* ============================================================
   APEXSTRATEGY — HOME CONTROLLER  (ES6 module)
   ============================================================ */

import {
  CIRCUITS,
  searchCircuits,
  filterCircuitsByType,
  filterCircuitsByRegion,
} from "./circuits.js";
import { animateValue } from "./anim.js";
import { fetchTrackMap } from "./trackmaps.js";

/*-- SECTION: LOOKUP --*/

const TYPE_CLASS_MAP = {
  Technical: "type-technical",
  "High-Speed": "type-highspeed",
  "Street Circuit": "type-street",
  Hybrid: "type-hybrid",
};

const DEMAND_STATE = {
  Low: "optimal",
  Medium: "",
  "Medium-High": "",
  High: "warning",
  "Very High": "critical",
};

/*-- SECTION: CLASS --*/

export class HomeController {
  constructor() {
    this._circuits = CIRCUITS;
    this._searchEl = document.getElementById("circuitSearch");
    this._typeEl = document.getElementById("typeFilter");
    this._regionEl = document.getElementById("regionFilter");
    this._listEl = document.getElementById("circuitList");
    this._counterEl = document.getElementById("resultsCounter");
    this._emptyEl = document.getElementById("emptyState");
    this._badgeEl = document.getElementById("totalCount");
    this._init();
  }

  _init() {
    this._bindEvents();
    this._initScrollReveals();
    this.renderCircuits(this._circuits);
    this._animateTotalBadge();
  }

  _animateTotalBadge() {
    if (!this._badgeEl) return;
    animateValue(this._badgeEl, this._circuits.length, {
      duration: 800,
      decimals: 0,
    });
  }

  /** Fade-up sections as they enter the viewport (.reveal-on-scroll). */
  _initScrollReveals() {
    const els = document.querySelectorAll(".reveal-on-scroll");
    if (!els.length || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in-view"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
  }

  _bindEvents() {
    const debounced = this.debounce(() => this.filterAndRender(), 250);
    this._searchEl?.addEventListener("input", debounced);
    this._typeEl?.addEventListener("change", () => this.filterAndRender());
    this._regionEl?.addEventListener("change", () => this.filterAndRender());
    // Full-card navigation handled by CSS stretched-link on .circuit-card-link
  }

  debounce(fn, delay) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  filterAndRender() {
    const query = this._searchEl?.value.trim() ?? "";
    const type = this._typeEl?.value ?? "all";
    const region = this._regionEl?.value ?? "all";
    let results = this._circuits;
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.shortName.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.region.toLowerCase().includes(q) ||
          c.type.toLowerCase().includes(q),
      );
    }
    if (type !== "all") results = results.filter((c) => c.type === type);
    if (region !== "all") results = results.filter((c) => c.region === region);
    this.renderCircuits(results);
  }

  _buildCardHTML(circuit) {
    const typeClass = TYPE_CLASS_MAP[circuit.type] ?? "type-hybrid";
    const typeLabel = circuit.type.toUpperCase().replace(/-/g, "‑");
    const dfState = DEMAND_STATE[circuit.baseDownforce] ?? "";
    const tyrState = DEMAND_STATE[circuit.tyreWear] ?? "";
    const brkState = DEMAND_STATE[circuit.brakingDemand] ?? "";
    return /* html */ `
      <article class="circuit-card" data-id="${circuit.id}" data-type="${circuit.type}"
               data-region="${circuit.region}" role="article"
               aria-label="${circuit.name}, ${circuit.country}">
        <div class="cc-map" data-trackmap="${circuit.id}" aria-hidden="true">
          <span class="cc-map-fallback">${circuit.shortName.toUpperCase()}</span>
          <span class="cc-flag" role="img" aria-label="${circuit.country} flag">${circuit.flag}</span>
        </div>
        <div class="cc-body">
          <div class="cc-name">${circuit.shortName.toUpperCase()}</div>
          <div class="cc-place">${circuit.city}&nbsp;·&nbsp;${circuit.country}</div>
          <div class="cc-tags">
            <span class="circuit-card-type ${typeClass}">${typeLabel}</span>
            <span class="cc-dims">${circuit.length}&nbsp;KM&nbsp;·&nbsp;${circuit.turns}&nbsp;TURNS</span>
          </div>
        </div>
        <div class="cc-meta">
          <div class="cc-stat"><span class="apex-label">Downforce</span><span class="apex-value ${dfState}">${circuit.baseDownforce.toUpperCase()}</span></div>
          <div class="cc-stat"><span class="apex-label">Tyre wear</span><span class="apex-value ${tyrState}">${circuit.tyreWear.toUpperCase()}</span></div>
          <div class="cc-stat"><span class="apex-label">Braking</span><span class="apex-value ${brkState}">${circuit.brakingDemand.toUpperCase()}</span></div>
        </div>
        <a href="workbench.html?circuit=${circuit.id}" class="circuit-card-link"
           aria-label="Open ${circuit.shortName} in Workbench">LOAD WORKBENCH&nbsp;→</a>
      </article>`;
  }

  renderCircuits(circuits) {
    if (!this._listEl) return;
    this._updateCounter(circuits.length);
    const isEmpty = !circuits.length;
    this._emptyEl?.classList.toggle("hidden", !isEmpty);
    if (isEmpty) {
      this._listEl.innerHTML = "";
      return;
    }
    this._listEl.innerHTML = circuits
      .map(
        (c, i) =>
          `<div class="col-12 col-md-6 col-xl-4 card-enter" style="animation-delay:${Math.min(i * 30, 260)}ms">${this._buildCardHTML(c)}</div>`,
      )
      .join("");

    // Hydrate the card artwork with the real track outlines
    this._hydrateTrackMaps();

    // Tilt.js — 3D perspective on mousemove
    if (window.VanillaTilt) {
      window.VanillaTilt.init(this._listEl.querySelectorAll(".circuit-card"), {
        max: 5,
        speed: 300,
        glare: false,
        scale: 1.015,
        perspective: 1000,
      });
    }
  }

  /**
   * Fetches tracks/{id}.svg for every rendered card and inlines it
   * into the .cc-map artwork zone. Inlining (rather than <img>) lets
   * the outline pick up `color: currentColor` so it recolours on
   * hover and theme change. Results are cached by trackmaps.js.
   */
  _hydrateTrackMaps() {
    this._listEl.querySelectorAll("[data-trackmap]").forEach(async (zone) => {
      const svgText = await fetchTrackMap(zone.dataset.trackmap);
      if (!svgText || !zone.isConnected) return;
      const flag = zone.querySelector(".cc-flag")?.outerHTML ?? "";
      zone.innerHTML = svgText + flag;
      const svg = zone.querySelector("svg");
      if (!svg) return;
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("fill", "currentColor");
      svg.setAttribute("aria-hidden", "true");
    });
  }

  _updateCounter(shown) {
    if (this._counterEl)
      this._counterEl.textContent = `SHOWING ${shown || "0"} OF ${this._circuits.length} CIRCUITS`;
  }
}

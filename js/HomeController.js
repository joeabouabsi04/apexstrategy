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
    const typeLabel = circuit.type.toUpperCase().replace(/-/g, "\u2011");
    const dfState = DEMAND_STATE[circuit.baseDownforce] ?? "";
    const tyrState = DEMAND_STATE[circuit.tyreWear] ?? "";
    const brkState = DEMAND_STATE[circuit.brakingDemand] ?? "";
    return /* html */ `
      <article class="circuit-card" data-id="${circuit.id}" data-type="${circuit.type}"
               data-region="${circuit.region}" role="article"
               aria-label="${circuit.name} — ${circuit.country}">
        <div class="circuit-card-header">
          <div>
            <div class="circuit-card-name">${circuit.shortName.toUpperCase()}</div>
            <div class="circuit-card-country">${circuit.city.toUpperCase()}&nbsp;·&nbsp;${circuit.country.toUpperCase()}</div>
          </div>
          <span class="circuit-card-flag" role="img" aria-label="${circuit.country} flag">${circuit.flag}</span>
        </div>
        <div class="circuit-card-body">
          <div class="card-type-row">
            <span class="circuit-card-type ${typeClass}">${typeLabel}</span>
            <span class="apex-label card-dims">${circuit.length}&nbsp;KM&nbsp;·&nbsp;${circuit.turns}&nbsp;TURNS</span>
          </div>
          <div class="circuit-card-meta">
            <div class="circuit-card-stat"><span class="apex-label">DOWNFORCE</span><span class="apex-value ${dfState}">${circuit.baseDownforce.toUpperCase()}</span></div>
            <div class="circuit-card-stat"><span class="apex-label">TYRE WEAR</span><span class="apex-value ${tyrState}">${circuit.tyreWear.toUpperCase()}</span></div>
            <div class="circuit-card-stat"><span class="apex-label">BRAKING</span><span class="apex-value ${brkState}">${circuit.brakingDemand.toUpperCase()}</span></div>
          </div>
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
          `<div class="col-12 col-sm-6 col-lg-4 col-xl-3 card-enter" style="animation-delay:${Math.min(i * 22, 200)}ms">${this._buildCardHTML(c)}</div>`,
      )
      .join("");

    // Tilt.js — 3D perspective on mousemove
    if (window.VanillaTilt) {
      window.VanillaTilt.init(this._listEl.querySelectorAll(".circuit-card"), {
        max: 6,
        speed: 300,
        glare: false,
        scale: 1.02,
        perspective: 900,
      });
    }
  }

  _updateCounter(shown) {
    if (this._counterEl)
      this._counterEl.textContent = `SHOWING ${shown || "—"} OF ${this._circuits.length} CIRCUITS`;
  }
}

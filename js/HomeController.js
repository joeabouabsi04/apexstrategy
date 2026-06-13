/* ============================================================
   APEXSTRATEGY — HOME CONTROLLER
   Drives the Command Center circuit grid: rendering, filtering,
   search debounce, and staggered entrance animation.
   Depends on: window.CIRCUITS (circuits.js), window.ApexAnim (main.js)
   ============================================================ */

/*-- SECTION: TYPE → CSS CLASS MAP --*/

const TYPE_CLASS_MAP = {
  Technical: "type-technical",
  "High-Speed": "type-highspeed",
  "Street Circuit": "type-street",
  Hybrid: "type-hybrid",
};

// Demand levels that warrant the .optimal / .warning style on apex-value
const DEMAND_STATE = {
  Low: "optimal",
  Medium: "",
  "Medium-High": "",
  High: "warning",
  "Very High": "critical",
};

/*-- SECTION: HOMECONTROLLER CLASS --*/

class HomeController {
  constructor() {
    this._circuits = window.CIRCUITS ?? [];
    this._searchEl = document.getElementById("circuitSearch");
    this._typeEl = document.getElementById("typeFilter");
    this._regionEl = document.getElementById("regionFilter");
    this._listEl = document.getElementById("circuitList");
    this._counterEl = document.getElementById("resultsCounter");
    this._emptyEl = document.getElementById("emptyState");
    this._badgeEl = document.getElementById("totalCount");

    this._init();
  }

  //-- Wire everything up on construction --//
  _init() {
    this._bindEvents();
    this.renderCircuits(this._circuits);
    this._animateTotalBadge();
  }

  //-- Count-up on the big "20" circuit badge (boot delight) --//
  _animateTotalBadge() {
    if (!this._badgeEl || !window.ApexAnim) return;
    window.ApexAnim.animateValue(this._badgeEl, this._circuits.length, {
      duration: 800,
      decimals: 0,
    });
  }

  //-- Event bindings: debounced search, immediate filter selects, card click delegation --//
  _bindEvents() {
    const debouncedFilter = this.debounce(() => this.filterAndRender(), 250);

    this._searchEl?.addEventListener("input", debouncedFilter);
    this._typeEl?.addEventListener("change", () => this.filterAndRender());
    this._regionEl?.addEventListener("change", () => this.filterAndRender());

    // Card click delegation — whole card navigates to workbench,
    // except when clicking the explicit link (let it handle itself).
    this._listEl?.addEventListener("click", (e) => {
      if (e.target.closest(".circuit-card-link")) return;
      const card = e.target.closest(".circuit-card");
      if (card?.dataset.id) {
        window.location.href = `workbench.html?circuit=${card.dataset.id}`;
      }
    });
  }

  //-- Debounce helper: returns a wrapper that delays fn by `delay` ms --//
  debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  //-- Chain all three active filters against the full CIRCUITS array --//
  filterAndRender() {
    const query = this._searchEl?.value.trim() ?? "";
    const type = this._typeEl?.value ?? "all";
    const region = this._regionEl?.value ?? "all";

    let results = this._circuits;

    // 1. Free-text search across key string fields
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

    // 2. Exact-match circuit type
    if (type !== "all") {
      results = results.filter((c) => c.type === type);
    }

    // 3. Exact-match region
    if (region !== "all") {
      results = results.filter((c) => c.region === region);
    }

    this.renderCircuits(results);
  }

  //-- Build individual card HTML string --//
  _buildCardHTML(circuit) {
    const typeClass = TYPE_CLASS_MAP[circuit.type] ?? "type-hybrid";

    // Strip hyphen for display, upper-case for brand consistency
    const typeLabel = circuit.type.toUpperCase().replace(/-/g, "\u2011"); // non-breaking hyphen

    // Downforce gets a colour state — it's the key setup signal
    const dfState = DEMAND_STATE[circuit.baseDownforce] ?? "";
    const tyrState = DEMAND_STATE[circuit.tyreWear] ?? "";
    const brkState = DEMAND_STATE[circuit.brakingDemand] ?? "";

    return /* html */ `
      <article
        class="circuit-card bracket-corners-hover"
        data-id="${circuit.id}"
        data-type="${circuit.type}"
        data-region="${circuit.region}"
        role="article"
        aria-label="${circuit.name} — ${circuit.country}. Type: ${circuit.type}.">

        <div class="circuit-card-header">
          <div>
            <div class="circuit-card-name">${circuit.shortName.toUpperCase()}</div>
            <div class="circuit-card-country">${circuit.city.toUpperCase()}&nbsp;·&nbsp;${circuit.country.toUpperCase()}</div>
          </div>
          <span class="circuit-card-flag" role="img" aria-label="${circuit.country} flag">${circuit.flag}</span>
        </div>

        <div class="circuit-card-body">
          <div class="card-type-row">
            <span class="circuit-card-type ${typeClass}" aria-label="Circuit type: ${circuit.type}">${typeLabel}</span>
            <span class="apex-label card-dims">${circuit.length}&nbsp;KM&nbsp;·&nbsp;${circuit.turns}&nbsp;TURNS</span>
          </div>

          <div class="circuit-card-meta">
            <div class="circuit-card-stat">
              <span class="apex-label">DOWNFORCE</span>
              <span class="apex-value ${dfState}">${circuit.baseDownforce.toUpperCase()}</span>
            </div>
            <div class="circuit-card-stat">
              <span class="apex-label">TYRE WEAR</span>
              <span class="apex-value ${tyrState}">${circuit.tyreWear.toUpperCase()}</span>
            </div>
            <div class="circuit-card-stat">
              <span class="apex-label">BRAKING</span>
              <span class="apex-value ${brkState}">${circuit.brakingDemand.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <a href="workbench.html?circuit=${circuit.id}"
           class="circuit-card-link"
           aria-label="Open ${circuit.shortName} in the Workbench">
          LOAD WORKBENCH&nbsp;→
        </a>
      </article>
    `;
  }

  //-- Render an array of circuits to the grid with staggered entrance --//
  renderCircuits(circuits) {
    if (!this._listEl) return;

    this._updateCounter(circuits.length);

    const isEmpty = circuits.length === 0;
    this._emptyEl?.classList.toggle("hidden", !isEmpty);

    if (isEmpty) {
      this._listEl.innerHTML = "";
      return;
    }

    // Build all column wrappers + card HTML in one string pass
    const html = circuits
      .map((circuit, i) => {
        // Cap stagger at 200ms so the grid is fully in by ~400ms
        const delay = Math.min(i * 22, 200);
        return /* html */ `
          <div class="col-12 col-sm-6 col-lg-4 col-xl-3 card-enter"
               style="animation-delay:${delay}ms"
               data-circuit-col="${circuit.id}">
            ${this._buildCardHTML(circuit)}
          </div>`;
      })
      .join("");

    this._listEl.innerHTML = html;
  }

  //-- Update the "SHOWING X OF Y CIRCUITS" counter line --//
  _updateCounter(shown) {
    if (!this._counterEl) return;
    const total = this._circuits.length;
    const state = shown === 0 ? "—" : `${shown}`;
    this._counterEl.textContent = `SHOWING ${state} OF ${total} CIRCUITS`;
  }
}

/*-- SECTION: INIT --*/

document.addEventListener("DOMContentLoaded", () => {
  new HomeController();
});

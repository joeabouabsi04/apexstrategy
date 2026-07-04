/* ============================================================
   APEXSTRATEGY — HOME CONTROLLER  (ES6 module)
   ============================================================ */

import { CIRCUITS, getCircuitById } from "./circuits.js";
import { animateValue } from "./anim.js";
import { fetchTrackMap } from "./trackmaps.js";
import { ApexSelect } from "./ApexSelect.js";
import { WeatherService } from "./WeatherService.js";
import { wxFor, wxSvg } from "./wx-icons.js";

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

/* Sort comparators keyed by the #sortFilter option values */
const SORTERS = {
  name: (a, b) => a.shortName.localeCompare(b.shortName),
  "length-desc": (a, b) => b.length - a.length,
  "length-asc": (a, b) => a.length - b.length,
  "turns-desc": (a, b) => b.turns - a.turns,
};

/*-- SECTION: CLASS --*/

const PAGE_SIZE = 6;

export class HomeController {
  constructor() {
    this._circuits = CIRCUITS;
    this._searchEl = document.getElementById("circuitSearch");
    this._typeEl = document.getElementById("typeFilter");
    this._regionEl = document.getElementById("regionFilter");
    this._sortEl = document.getElementById("sortFilter");
    this._listEl = document.getElementById("circuitList");
    this._counterEl = document.getElementById("resultsCounter");
    this._emptyEl = document.getElementById("emptyState");
    this._badgeEl = document.getElementById("totalCount");
    this._pagerEl = document.getElementById("circuitPager");
    // Pagination state — the full filtered/sorted list plus current page
    this._filtered = this._circuits;
    this._page = 1;
    this._init();
  }

  _init() {
    this._bindEvents();
    ApexSelect.enhance(); // themed dropdowns for the filter/sort selects
    this._initScrollReveals();
    this._renderPage(1);
    this._animateTotalBadge();
    this._renderRecentChips();
    this._initRadar();
    this._scrollToHash();
  }

  /*-- SECTION: RECENTLY VIEWED CHIPS --*/

  /** Chips for the last few circuits opened in the workbench
      (ids written to localStorage by WorkbenchController). */
  _renderRecentChips() {
    const wrap = document.getElementById("recentCircuits");
    if (!wrap) return;
    let ids = [];
    try {
      ids = JSON.parse(localStorage.getItem("apexRecentCircuits") ?? "[]");
    } catch {
      return;
    }
    const recents = ids.map((id) => getCircuitById(id)).filter(Boolean);
    if (!recents.length) return;
    wrap.innerHTML =
      `<span class="recent-label">Jump back in</span>` +
      recents
        .map(
          (c) => /* html */ `
        <a class="recent-chip" href="workbench.html?circuit=${c.id}"
           aria-label="Open ${c.shortName} in the workbench">
          <span aria-hidden="true">${c.flag}</span>${c.shortName.toUpperCase()}
        </a>`,
        )
        .join("");
    wrap.classList.remove("hidden");
  }

  /*-- SECTION: LIVE CALENDAR RADAR --*/

  /**
   * Fetches current conditions for every circuit (one burst, cached in
   * sessionStorage for 10 minutes) and renders the live radar strip:
   * wet circuits first with the amber treatment, plus a plain-language
   * summary line. The whole section hides itself on total failure.
   */
  async _initRadar() {
    const section = document.getElementById("liveRadar");
    const strip = document.getElementById("radarStrip");
    const summary = document.getElementById("radarSummary");
    if (!section || !strip) return;

    // Skeleton chips while the burst is in flight
    strip.innerHTML = Array.from(
      { length: 10 },
      () => `<span class="radar-chip radar-skeleton"></span>`,
    ).join("");

    let list;
    try {
      list = await this._fetchRadarData();
    } catch {
      section.classList.add("hidden");
      return;
    }
    if (!list.length) {
      section.classList.add("hidden");
      return;
    }

    // Wet circuits lead the strip
    list.sort((a, b) => Number(b.isRaining) - Number(a.isRaining));
    const wet = list.filter((x) => x.isRaining).length;

    if (summary) {
      summary.textContent =
        wet === 0
          ? `All ${list.length} circuits are running dry right now.`
          : `${wet} circuit${wet > 1 ? "s" : ""} racing in the rain right now. ${list.length - wet} running dry.`;
    }

    strip.innerHTML = list
      .map((x) => {
        const c = getCircuitById(x.id);
        if (!c) return "";
        return /* html */ `
        <a class="radar-chip${x.isRaining ? " is-wet" : ""}"
           href="workbench.html?circuit=${x.id}"
           aria-label="${c.shortName}: ${x.main}, ${x.temp} degrees. Open workbench.">
          ${x.isRaining ? '<span class="radar-live-dot" aria-hidden="true"></span>' : ""}
          <span class="rc-flag" aria-hidden="true">${c.flag}</span>
          <span class="rc-name">${c.shortName.toUpperCase()}</span>
          <span class="rc-temp">${x.temp}°</span>
          <span class="rc-icon ${wxFor(x.main).cls}" aria-hidden="true">${wxSvg(x.main)}</span>
        </a>`;
      })
      .join("");
  }

  async _fetchRadarData() {
    const CACHE_KEY = "apexRadarV1";
    const TTL = 10 * 60 * 1000;
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? "null");
      if (cached && Date.now() - cached.t < TTL) return cached.list;
    } catch {
      /* fall through to a fresh fetch */
    }

    const ws = new WeatherService();
    const results = await Promise.allSettled(
      this._circuits.map((c) =>
        ws.fetchWeather(c.lat, c.lon, c.id).then((w) => ({
          id: c.id,
          temp: w.temp,
          main: w.weatherMain,
          isRaining: w.isRaining,
        })),
      ),
    );
    const list = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);
    if (list.length) {
      try {
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ t: Date.now(), list }),
        );
      } catch {
        /* storage full or unavailable — cache skipped */
      }
    }
    return list;
  }

  /**
   * Cards render after DOMContentLoaded, so a cross-page anchor like
   * workbench's "All circuits" (index.html#commandCenter) fires before
   * the section exists at its final position and the browser's jump is
   * lost. Re-run it once the grid is laid out (scroll-margin-top in CSS
   * keeps the heading clear of the sticky nav).
   */
  _scrollToHash() {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    requestAnimationFrame(() =>
      target.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
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
    this._sortEl?.addEventListener("change", () => this.filterAndRender());

    // Pagination — event delegation on the pager container
    this._pagerEl?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-page]");
      if (!btn || btn.disabled) return;
      this._renderPage(Number(btn.dataset.page), true);
    });
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

    const sorter = SORTERS[this._sortEl?.value];
    if (sorter) results = [...results].sort(sorter);

    // New result set → always restart at page 1
    this._filtered = results;
    this._renderPage(1);
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

  /*-- SECTION: PAGINATION --*/

  /**
   * Renders one page (PAGE_SIZE cards) of the current filtered list,
   * clamps the requested page into range, and refreshes the counter
   * and pager. `scroll` smooth-scrolls back to the grid top so the
   * user isn't left staring at the pager after a page change.
   */
  _renderPage(page, scroll = false) {
    if (!this._listEl) return;
    const total = this._filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    this._page = Math.min(Math.max(1, page), pageCount);

    const isEmpty = total === 0;
    this._emptyEl?.classList.toggle("hidden", !isEmpty);

    if (isEmpty) {
      this._listEl.innerHTML = "";
      this._updateCounter(0, 0, 0);
      this._renderPager(1);
      return;
    }

    const start = (this._page - 1) * PAGE_SIZE;
    const pageItems = this._filtered.slice(start, start + PAGE_SIZE);
    this._renderGrid(pageItems);
    this._updateCounter(total, start, pageItems.length);
    this._renderPager(pageCount);

    if (scroll) this._scrollToGridTop();
  }

  /** Builds the card DOM for a given set of circuits (one page). */
  _renderGrid(circuits) {
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

  /** Renders the numbered pager (hidden when a single page). */
  _renderPager(pageCount) {
    if (!this._pagerEl) return;
    if (pageCount <= 1) {
      this._pagerEl.innerHTML = "";
      this._pagerEl.classList.add("hidden");
      return;
    }
    this._pagerEl.classList.remove("hidden");
    const cur = this._page;

    const numBtn = (p) =>
      `<button class="pager-btn pager-num${p === cur ? " active" : ""}"
         data-page="${p}" aria-label="Page ${p}"${p === cur ? ' aria-current="page"' : ""}>${p}</button>`;

    this._pagerEl.innerHTML = `
      <button class="pager-btn pager-arrow" data-page="${cur - 1}"
        ${cur === 1 ? "disabled" : ""} aria-label="Previous page">‹</button>
      ${this._pageWindow(cur, pageCount)
        .map((p) =>
          p === "…"
            ? `<span class="pager-ellipsis" aria-hidden="true">…</span>`
            : numBtn(p),
        )
        .join("")}
      <button class="pager-btn pager-arrow" data-page="${cur + 1}"
        ${cur === pageCount ? "disabled" : ""} aria-label="Next page">›</button>`;
  }

  /**
   * Returns the list of page numbers to show, collapsing long ranges
   * with an ellipsis (first, last, and a window around the current
   * page). With ≤ 7 pages every number is shown.
   */
  _pageWindow(cur, pageCount) {
    if (pageCount <= 7)
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    const pages = new Set([1, pageCount, cur, cur - 1, cur + 1]);
    const sorted = [...pages]
      .filter((p) => p >= 1 && p <= pageCount)
      .sort((a, b) => a - b);
    const out = [];
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) out.push("…");
      out.push(p);
      prev = p;
    }
    return out;
  }

  /** Smooth-scroll so the results row sits just below the sticky nav. */
  _scrollToGridTop() {
    const el = this._counterEl ?? this._listEl;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 84;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
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

  _updateCounter(total, start, shown) {
    if (!this._counterEl) return;
    if (total === 0) {
      this._counterEl.textContent = `SHOWING 0 OF ${this._circuits.length} CIRCUITS`;
      return;
    }
    const range = shown > 1 ? `${start + 1}-${start + shown}` : `${start + 1}`;
    const scope =
      total === this._circuits.length ? `${total}` : `${total} MATCHING`;
    this._counterEl.textContent = `SHOWING ${range} OF ${scope} CIRCUITS`;
  }
}

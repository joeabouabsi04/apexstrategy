/* ============================================================
   APEXSTRATEGY — WORKBENCH CONTROLLER  (ES6 module)
   ============================================================ */

import { CIRCUITS, getCircuitById } from "./circuits.js";
import { animateValue, decodeText, flashCell } from "./anim.js";
import { WeatherService } from "./WeatherService.js";
import { SetupEngine } from "./SetupEngine.js";
import { TabController } from "./TabController.js";
import { fetchTrackMap } from "./trackmaps.js"; // local SVG fetch — replaces getTrackMap

/*-- SECTION: WEATHER CONDITION ICONS --*/

// Simple stroke glyphs keyed by OpenWeatherMap's `weather.main` value.
// Rendered into #weatherIcon; colour comes from the wx-* class in CSS.
const WX_SVG = {
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.4"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7"/></svg>`,
  cloud: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 18a4 4 0 0 0 .3-8A6 6 0 0 0 6.2 11.6 3.6 3.6 0 0 0 7 18.7z"/></svg>`,
  rain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 15a4 4 0 0 0 .3-8A6 6 0 0 0 6.2 8.6 3.6 3.6 0 0 0 7 15.7"/><path d="M8 18.5l-1 2.5M12.5 18.5l-1 2.5M17 18.5l-1 2.5"/></svg>`,
  drizzle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 15a4 4 0 0 0 .3-8A6 6 0 0 0 6.2 8.6 3.6 3.6 0 0 0 7 15.7"/><path d="M9 18.2l-.4 1.1M13 18.2l-.4 1.1M17 18.2l-.4 1.1"/></svg>`,
  storm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 14a4 4 0 0 0 .3-8A6 6 0 0 0 6.2 7.6 3.6 3.6 0 0 0 7 14.7"/><path d="M12.5 12.5 10 17h3l-1.8 4"/></svg>`,
  snow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 15a4 4 0 0 0 .3-8A6 6 0 0 0 6.2 8.6 3.6 3.6 0 0 0 7 15.7"/><path d="M8.5 18.5v.01M12 20v.01M15.5 18.5v.01M10 21.5v.01M14 22v.01"/></svg>`,
  mist: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h13M7 13h13M4 17h13"/></svg>`,
  wind: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h9.5a2.5 2.5 0 1 0-2.4-3.2M3 12h14.5a2.5 2.5 0 1 1-2.4 3.2M3 16h7.5a2 2 0 1 1-1.9 2.6"/></svg>`,
};

// weather.main → { glyph, colour class }
const WX_MAP = {
  clear: { svg: "sun", cls: "wx-clear" },
  clouds: { svg: "cloud", cls: "wx-clouds" },
  rain: { svg: "rain", cls: "wx-rain" },
  drizzle: { svg: "drizzle", cls: "wx-drizzle" },
  thunderstorm: { svg: "storm", cls: "wx-storm" },
  snow: { svg: "snow", cls: "wx-snow" },
  mist: { svg: "mist", cls: "wx-mist" },
  smoke: { svg: "mist", cls: "wx-mist" },
  haze: { svg: "mist", cls: "wx-mist" },
  fog: { svg: "mist", cls: "wx-mist" },
  dust: { svg: "mist", cls: "wx-mist" },
  sand: { svg: "mist", cls: "wx-mist" },
  squall: { svg: "wind", cls: "wx-mist" },
  tornado: { svg: "wind", cls: "wx-storm" },
};

/*-- SECTION: VERDICT GENERATOR --*/

function buildVerdict(conditions, circuit) {
  const { ambientTemp, windSpeed, isRaining, weatherMain } = conditions;
  const tempWord =
    ambientTemp < 12
      ? "Cold"
      : ambientTemp < 22
        ? "Cool"
        : ambientTemp < 30
          ? "Warm"
          : "Hot";
  const windWord =
    windSpeed < 15
      ? "calm"
      : windSpeed < 35
        ? "light crosswind"
        : windSpeed < 55
          ? "strong crosswind"
          : "severe wind";
  const skyWord = isRaining
    ? "wet"
    : weatherMain === "Clear"
      ? "clear and dry"
      : weatherMain === "Clouds"
        ? "overcast and dry"
        : "mixed";
  const note =
    circuit.type === "Street Circuit"
      ? "minimise kerb exposure on painted surfaces"
      : circuit.type === "High-Speed"
        ? "prioritise stability through high-speed sectors"
        : circuit.tyreWear === "High" || circuit.tyreWear === "Very High"
          ? "watch rear degradation through medium-speed complexes"
          : "standard setup discipline applies";
  return `${tempWord}, ${skyWord}, ${windWord}. ${note.charAt(0).toUpperCase()}${note.slice(1)}.`;
}

/*-- SECTION: CLASS --*/

export class WorkbenchController {
  constructor() {
    this.circuitId = new URLSearchParams(window.location.search).get("circuit");
    this.circuit = null;
    this.weatherService = new WeatherService();
    this.tabController = null;
    this.report = null;
    this._ageTimer = null;
    this.forecastData = null;
    this.currentWeather = null;
    this._rainFrame = null;
  }

  async init() {
    if (!this.circuitId) {
      this._showNoCircuitState();
      return;
    }
    this.circuit = getCircuitById(this.circuitId);
    if (!this.circuit) {
      this._showError(`UNKNOWN CIRCUIT ID: "${this.circuitId}"`);
      return;
    }

    this._populateCircuitHeader();
    this._initTabs();
    await this._fetchAndRender();

    // Keyboard hooks via CustomEvents (no window globals)
    document.addEventListener("apex:refetch", () => this._fetchAndRender());
    document.addEventListener("apex:switchTab", (e) => {
      const map = ["tyres", "aero", "wet"];
      if (map[e.detail.index])
        this.tabController?.switchTo(map[e.detail.index]);
    });
  }

  /*-- CIRCUIT HEADER --*/

  _populateCircuitHeader() {
    const c = this.circuit;
    const titleEl = document.getElementById("circuitTitle");
    if (titleEl) {
      titleEl.textContent = c.name.toUpperCase();
      setTimeout(
        () => decodeText(titleEl, c.name.toUpperCase(), { duration: 400 }),
        180,
      );
    }
    this._setText("circuitCountry", c.country.toUpperCase());
    this._setText("circuitType", c.type.toUpperCase());
    this._setText("circuitLength", `${c.length} KM`);
    this._setText("loadingCircuit", c.shortName.toUpperCase());
    this._setText("statLength", `${c.length} KM`);
    this._setText("statTurns", `${c.turns}`);
    this._setText("statLapRecord", (c.lapRecord ?? "--").replace(/\s*—\s*/g, " · "));
    this._setText("statAltitude", `${c.altitudeM} M`);
    this._setText("statGrip", c.surfaceGrip.toUpperCase());

    // Draw circuit minimap — async, fire-and-forget (visual only)
    this._renderMinimap().catch((err) =>
      console.warn("[WorkbenchController] Minimap load failed:", err),
    );
  }

  /*-- SECTION: TRACK MINIMAP --*/

  /**
   * Fetches the circuit SVG from tracks/{id}.svg, parses it, and
   * renders it into the minimap panel with a draw-in animation and
   * a continuously lapping neon dot via SVG animateMotion.
   *
   * Replaces the old static-path approach from trackmaps.js.
   */
  async _renderMinimap() {
    const svg = document.getElementById("trackMapSvg");
    const nameEl = document.getElementById("minimapName");
    if (!svg) return;

    const svgText = await fetchTrackMap(this.circuit.id);

    if (!svgText) {
      svg.innerHTML = `<text x="100" y="70" text-anchor="middle"
        style="font-family:var(--font-mono);font-size:10px;fill:var(--text-muted);">
        NO MAP DATA
      </text>`;
      return;
    }

    if (nameEl) nameEl.textContent = this.circuit.shortName.toUpperCase();

    // Parse the fetched SVG document
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    const sourceSvg = doc.querySelector("svg");

    if (!sourceSvg) {
      svg.innerHTML = `<text x="100" y="70" text-anchor="middle"
        style="font-family:var(--font-mono);font-size:10px;fill:var(--text-muted);">
        PARSE ERROR
      </text>`;
      return;
    }

    // Mirror the source viewBox so the track scales correctly in the panel
    const viewBox = sourceSvg.getAttribute("viewBox") ?? "0 0 200 140";
    svg.setAttribute("viewBox", viewBox);

    // Collect all <path> d-attributes and join into a single compound outline.
    // A single compound path works correctly with animateMotion / mpath.
    const pathEls = [...sourceSvg.querySelectorAll("path")];
    const combinedD = pathEls
      .map((p) => p.getAttribute("d"))
      .filter(Boolean)
      .join(" ");

    if (!combinedD) {
      // Fallback: if the SVG uses non-path geometry, render it as-is
      svg.innerHTML = sourceSvg.innerHTML;
      return;
    }

    // Generous dasharray upper-bound covers any real circuit path length
    const pathLen = 2400;

    svg.innerHTML = `
      <!-- Track outline — draws itself in on data arrival -->
      <path id="trackOutline"
        d="${combinedD}"
        fill="none"
        stroke="var(--border)"
        stroke-width="4"
        stroke-linecap="square"
        stroke-linejoin="miter"
        stroke-dasharray="${pathLen}"
        stroke-dashoffset="${pathLen}"
        style="transition: stroke-dashoffset 1.4s cubic-bezier(0.2,0,0,1) 0.2s,
                           stroke 0.4s ease;">
      </path>

      <!-- Lap-marker dot -->
      <circle r="5" fill="var(--accent)" opacity="0.9">
        <animateMotion dur="6s" repeatCount="indefinite" rotate="auto">
          <mpath href="#trackOutline"/>
        </animateMotion>
      </circle>

      <!-- Larger glow halo behind the dot -->
      <circle r="10" fill="var(--accent)" opacity="0.18">
        <animateMotion dur="6s" repeatCount="indefinite" rotate="auto">
          <mpath href="#trackOutline"/>
        </animateMotion>
      </circle>`;

    // Double rAF: first frame paints the 0% offset, second triggers the CSS transition
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const outline = svg.querySelector("#trackOutline");
        if (outline) {
          outline.style.strokeDashoffset = "0";
          outline.style.stroke = "var(--accent)";
        }
      }),
    );
  }

  /*-- SECTION: RAIN CANVAS --*/

  /**
   * Activates a canvas rain overlay when isRaining === true.
   * Diagonal streak particles animate at 60fps.
   * Immediately stops and clears when conditions are dry.
   * @param {boolean} isRaining
   */
  _toggleRainCanvas(isRaining) {
    const canvas = document.getElementById("rainCanvas");
    if (!canvas) return;

    if (!isRaining) {
      canvas.style.opacity = "0";
      if (this._rainFrame) {
        cancelAnimationFrame(this._rainFrame);
        this._rainFrame = null;
      }
      return;
    }

    const ctx = canvas.getContext("2d");
    const header = document.getElementById("circuitHeader");

    const resize = () => {
      canvas.width = header?.offsetWidth || 800;
      canvas.height = header?.offsetHeight || 200;
    };
    resize();
    window.addEventListener("resize", resize);

    // Rain drop pool
    const drops = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      len: 8 + Math.random() * 14,
      speed: 4 + Math.random() * 6,
      alpha: 0.08 + Math.random() * 0.14,
    }));

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drops.forEach((d) => {
        ctx.save();
        ctx.strokeStyle = `rgba(0, 180, 255, ${d.alpha})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.len * 0.25, d.y + d.len); // slight diagonal
        ctx.stroke();
        ctx.restore();

        d.y += d.speed;
        d.x += d.speed * 0.15;
        if (d.y > canvas.height) {
          d.y = -d.len;
          d.x = Math.random() * canvas.width;
        }
      });
      this._rainFrame = requestAnimationFrame(tick);
    };

    canvas.style.opacity = "1";
    if (this._rainFrame) cancelAnimationFrame(this._rainFrame);
    tick();
  }

  _initTabs() {
    this.tabController = new TabController(
      ".workbench-nav",
      ".workbench-panes",
      (tab) => this._onTabSwitch(tab),
    );
  }

  /*-- FETCH & RENDER --*/

  async _fetchAndRender() {
    this._showLoading();
    try {
      // Fetch current conditions and weekend forecast in parallel
      const [weather, forecastData] = await Promise.allSettled([
        this.weatherService.fetchWeather(
          this.circuit.lat,
          this.circuit.lon,
          this.circuit.id,
        ),
        this.weatherService.fetchWeekendForecast(
          this.circuit.lat,
          this.circuit.lon,
          this.circuit.id,
        ),
      ]);

      if (weather.status === "rejected") throw weather.reason;
      const currentWeather = weather.value;

      // Store for timeline switching
      this.currentWeather = currentWeather;
      this.forecastData =
        forecastData.status === "fulfilled"
          ? forecastData.value
          : {
              now: currentWeather,
              practice: currentWeather,
              quali: currentWeather,
              race: currentWeather,
            };

      const engine = new SetupEngine(this.circuit, currentWeather);
      this.report = engine.generateReport();

      this._updateWeatherHeader(currentWeather);
      this._renderTyrePane(this.report);
      this._renderAeroPane(this.report);
      this._renderWetPane(this.report);
      this._renderVerdict(this.report.conditions);
      this._startDataAgeTimer();
      this._applyRainAlerts(currentWeather.isRaining);
      this._initTimeline();
      this._showWorkbench();
    } catch (err) {
      console.error("[WorkbenchController]", err);
      this._showError(err.message ?? "FETCH FAILED");
    }
  }

  /*-- SECTION: TIMELINE --*/

  /**
   * Wires up the race-weekend timeline buttons.
   * Each click re-runs SetupEngine against its forecast block
   * and re-renders the full workbench without a page reload.
   */
  _initTimeline() {
    const buttons = document.querySelectorAll(".timeline-btn");

    // Mark sessions that have rain in the forecast
    buttons.forEach((btn) => {
      const s = btn.dataset.session;
      if (s !== "now" && this.forecastData?.[s]?.isRaining) {
        btn.classList.add("forecast-rain");
        btn.title = `${s.toUpperCase()}: Rain forecast`;
      }
    });

    // TASK 2: the redundant status bar (timelineLabel/Dot/Time) was removed.
    // The active session is now communicated solely by the highlighted button
    // and the degradation-panel session label.
    const LABELS = {
      now: "LIVE (NOW)",
      practice: "PRACTICE (+24H)",
      quali: "QUALIFYING (+48H)",
      race: "RACE DAY (+72H)",
    };

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");

        const session = btn.dataset.session;
        const weather = this.forecastData?.[session] ?? this.currentWeather;
        if (!weather) return;

        this._setText(
          "degradationSession",
          LABELS[session] ?? session.toUpperCase(),
        );

        // Re-run engine against selected weather block
        const engine = new SetupEngine(this.circuit, weather);
        this.report = engine.generateReport();

        this._updateWeatherHeader(weather);
        this._renderTyrePane(this.report);
        this._renderAeroPane(this.report);
        this._renderWetPane(this.report);
        this._renderVerdict(this.report.conditions);
        this._applyRainAlerts(weather.isRaining);
      });
    });
  }

  /*-- SECTION: DEGRADATION CURVE CHART --*/

  /**
   * TASK 3 — Renders an actual multi-curve degradation graph (SVG) into
   * #degradationGraphs, plotting tyre performance retained (%) over a
   * race stint for the soft / medium / hard compounds.
   *
   * The SetupEngine gives a single end-of-stint degradation figure per
   * compound (degSoft/degMedium/degHard). We model each as a curve over
   * STINT_LAPS using a per-compound convexity exponent so softs show the
   * classic late-stint "cliff" while hards fall away more linearly:
   *
   *   loss(lap)        = totalDeg * (lap / STINT_LAPS) ^ exponent
   *   performance(lap) = 100 - loss(lap)
   *
   * Lines draw themselves in via stroke-dashoffset (same technique as the
   * track minimap), respecting prefers-reduced-motion.
   *
   * @param {{ degSoft:number, degMedium:number, degHard:number }} compound
   */
  _renderDegradationGraphs(compound) {
    const el = document.getElementById("degradationGraphs");
    if (!el) return;

    const STINT_LAPS = 25;

    // Per-compound model: total end-of-stint loss + curve convexity.
    // Softer compound → more total loss AND a sharper late cliff (higher exp).
    const series = [
      {
        label: "SOFT",
        total: compound.degSoft ?? 0,
        exp: 1.55,
        color: "var(--danger)",
      },
      {
        label: "MEDIUM",
        total: compound.degMedium ?? 0,
        exp: 1.25,
        color: "var(--warning)",
      },
      {
        label: "HARD",
        total: compound.degHard ?? 0,
        exp: 1.08,
        color: "var(--neon)",
      },
    ];

    // ── Chart geometry (viewBox units) ──────────────────────────────
    const VB_W = 360;
    const VB_H = 184;
    const PAD = { top: 12, right: 12, bottom: 24, left: 34 };
    const plotW = VB_W - PAD.left - PAD.right;
    const plotH = VB_H - PAD.top - PAD.bottom;

    // Y domain: dynamic floor so the curves fill the panel. Lowest point
    // reached across all compounds, dropped to the next 10% gridline.
    const finals = series.map((s) => 100 - Math.min(100, s.total));
    const yMin = Math.max(0, Math.floor((Math.min(...finals) - 8) / 10) * 10);
    const yMax = 100;

    const n1 = (n) => Math.round(n * 10) / 10; // 1-dp coordinate rounding
    const xAt = (lap) => PAD.left + (lap / STINT_LAPS) * plotW;
    const yAt = (perf) =>
      PAD.top + (1 - (perf - yMin) / (yMax - yMin)) * plotH;

    // Build each compound's polyline point string.
    const lines = series.map((s) => {
      const total = Math.min(100, s.total);
      const pts = [];
      for (let lap = 0; lap <= STINT_LAPS; lap++) {
        const perf = 100 - total * Math.pow(lap / STINT_LAPS, s.exp);
        pts.push(`${n1(xAt(lap))},${n1(yAt(perf))}`);
      }
      return { ...s, points: pts.join(" ") };
    });

    // ── Gridlines + Y axis labels (every 20%) ───────────────────────
    let grid = "";
    for (let v = yMin; v <= yMax; v += 20) {
      const y = n1(yAt(v));
      grid += `<line x1="${PAD.left}" y1="${y}" x2="${VB_W - PAD.right}" y2="${y}"
        stroke="var(--border)" stroke-width="0.5" opacity="0.6" />`;
      grid += `<text x="${PAD.left - 6}" y="${y + 3}" text-anchor="end"
        class="deg-axis-label">${v}</text>`;
    }

    // ── X axis labels (lap markers) ─────────────────────────────────
    let xlabels = "";
    for (let lap = 0; lap <= STINT_LAPS; lap += 5) {
      const x = n1(xAt(lap));
      xlabels += `<text x="${x}" y="${VB_H - 8}" text-anchor="middle"
        class="deg-axis-label">${lap}</text>`;
    }

    // ── Polylines (drawn in via dashoffset) ─────────────────────────
    const polylines = lines
      .map(
        (l, i) => `<polyline data-line="${i}" points="${l.points}"
          fill="none" stroke="${l.color}" stroke-width="2"
          stroke-linejoin="round" stroke-linecap="round"
          style="filter:drop-shadow(0 0 3px ${l.color});" />`,
      )
      .join("");

    el.innerHTML = /* html */ `
      <div class="deg-chart-wrap">
        <svg viewBox="0 0 ${VB_W} ${VB_H}" role="img"
             aria-label="Tyre performance degradation over ${STINT_LAPS} laps">
          ${grid}
          <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + plotH}"
                stroke="var(--border)" stroke-width="0.75" />
          <line x1="${PAD.left}" y1="${PAD.top + plotH}" x2="${VB_W - PAD.right}" y2="${PAD.top + plotH}"
                stroke="var(--border)" stroke-width="0.75" />
          ${xlabels}
          ${polylines}
        </svg>
        <div class="deg-legend">
          ${series
            .map(
              (s) => `<div class="deg-legend-item">
                <span class="deg-legend-swatch" style="background:${s.color};"></span>
                <span class="deg-legend-label">${s.label}</span>
                <span class="deg-legend-val">${Math.round(100 - Math.min(100, s.total))}%</span>
              </div>`,
            )
            .join("")}
          <span class="deg-legend-axis">LAPS →</span>
        </div>
      </div>`;

    // Draw-in animation: offset each polyline by its own length, then
    // release to 0 on the next frame. Skipped under reduced-motion.
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const polys = el.querySelectorAll("polyline[data-line]");
    if (reduce) return;

    polys.forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = `${len}`;
      p.style.transition = "stroke-dashoffset 1.1s cubic-bezier(0.2,0,0,1)";
    });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        polys.forEach((p, i) => {
          p.style.transitionDelay = `${i * 120}ms`;
          p.style.strokeDashoffset = "0";
        });
      }),
    );
  }

  /*-- SECTION: WEATHER HEADER --*/

  _updateWeatherHeader(weather) {
    const tempEl = document.getElementById("tempReadout");
    if (tempEl) {
      tempEl.dataset.rawValue = "0";
      animateValue(tempEl, weather.temp, {
        duration: 600,
        decimals: 0,
        suffix: "°C",
      });
    }
    const trackHdr = document.getElementById("trackTempHeader");
    if (trackHdr) {
      trackHdr.dataset.rawValue = "0";
      animateValue(trackHdr, weather.trackTempEstimate, {
        duration: 700,
        decimals: 0,
        suffix: "°C",
      });
    }
    const windEl = document.getElementById("windReadout");
    if (windEl)
      windEl.textContent = `${weather.windArrow} ${weather.windSpeed} km/h ${weather.windDir}`;
    const condEl = document.getElementById("condReadout");
    if (condEl)
      decodeText(condEl, weather.weatherMain.toUpperCase(), { duration: 300 });
    const humEl = document.getElementById("humidReadout");
    if (humEl) humEl.textContent = `${weather.humidity}%`;
    this._renderWeatherIcon(weather.weatherMain);
    this._setDotClass("weatherDot", "status-live");
  }

  /** Swaps the condition glyph in the weather card to match weather.main. */
  _renderWeatherIcon(weatherMain) {
    const el = document.getElementById("weatherIcon");
    if (!el) return;
    const key = (weatherMain ?? "").toLowerCase();
    const entry = WX_MAP[key] ?? { svg: "cloud", cls: "wx-clouds" };
    el.className = `wb-weather-icon ${entry.cls}`;
    el.innerHTML = WX_SVG[entry.svg];
  }

  /*-- TYRE PANE --*/

  _renderTyrePane(report) {
    const { tyres, compound, conditions } = report;
    this._animateCell(
      "frontPsi",
      "frontPsiCell",
      tyres.frontPsi,
      1,
      tyres.status,
    );
    this._animateCell("rearPsi", "rearPsiCell", tyres.rearPsi, 1, tyres.status);
    this._animateCell(
      "frontKpa",
      "frontKpaCell",
      tyres.frontKpa,
      1,
      tyres.status,
    );
    this._animateCell("rearKpa", "rearKpaCell", tyres.rearKpa, 1, tyres.status);

    const compEl = document.getElementById("compoundReadout");
    if (compEl) {
      decodeText(compEl, compound.compound, { duration: 360 });
      compEl.style.color =
        compound.status === "critical"
          ? "var(--danger)"
          : compound.status === "warning"
            ? "var(--warning)"
            : "var(--neon)";
    }
    this._setDotClass(
      "compoundStatusDot",
      compound.status === "critical"
        ? "status-error"
        : compound.status === "warning"
          ? "status-loading"
          : "status-live",
    );
    this._setText("compoundReason", compound.reason);

    this._fillRecBlock(
      "trackTempBlock",
      `${conditions.trackTemp}°C`,
      "Estimated surface temperature (ambient + solar)",
      conditions.trackTemp > 55
        ? "critical"
        : conditions.trackTemp > 42
          ? "warning"
          : "optimal",
    );
    this._fillRecBlock(
      "ambientTempBlock",
      `${conditions.ambientTemp}°C`,
      `Air temp at ${this.circuit.altitudeM}m altitude`,
      conditions.ambientTemp > 35
        ? "warning"
        : conditions.ambientTemp < 10
          ? "warning"
          : "optimal",
    );
    this._fillRecBlock(
      "pressureStatusBlock",
      tyres.recommendation,
      `Front: ${tyres.frontPsi} PSI · Rear: ${tyres.rearPsi} PSI`,
      tyres.status,
    );

    // Degradation bar charts — compound object carries degSoft/degMedium/degHard
    this._renderDegradationGraphs(compound);
  }

  /*-- AERO PANE --*/

  _renderAeroPane(report) {
    const { aero, conditions } = report;
    this._animateCell(
      "frontWing",
      "frontWingCell",
      aero.frontWingAngle,
      0,
      aero.status,
    );
    this._animateCell(
      "rearWing",
      "rearWingCell",
      aero.rearWingAngle,
      0,
      aero.status,
    );

    const dragEl = document.getElementById("dragCoeff");
    if (dragEl) dragEl.textContent = aero.dragCoefficient;
    const dragCell = document.getElementById("dragCoeffCell");
    if (dragCell) {
      dragCell.classList.remove("optimal", "warning", "critical");
      const dcStatus =
        aero.dragCoefficient === "VERY HIGH"
          ? "warning"
          : aero.dragCoefficient === "LOW"
            ? "optimal"
            : null;
      if (dcStatus) dragCell.classList.add(dcStatus);
    }

    const ws =
      conditions.windSpeed > 70
        ? "critical"
        : conditions.windSpeed > 40
          ? "warning"
          : "optimal";
    this._fillRecBlock(
      "windSpeedBlock",
      `${conditions.windArrow ?? ""} ${conditions.windSpeed} km/h`,
      conditions.windSpeed > 70
        ? "SEVERE — major aero disturbance"
        : conditions.windSpeed > 40
          ? "ELEVATED — stability adjustments applied"
          : "Normal range",
      ws,
    );
    this._fillRecBlock(
      "windDirBlock",
      `${conditions.windDir} ${conditions.windArrow ?? ""}`,
      "Crosswind varies by circuit orientation — monitor driver feedback",
    );
    this._fillRecBlock(
      "drsBlock",
      aero.drsEnabled ? "ENABLED" : "DISABLED (MONACO)",
      aero.drsEnabled
        ? `${this.circuit.shortName} has DRS zones active.`
        : "Monaco — no DRS permitted. Max downforce held.",
      aero.drsEnabled ? "optimal" : "warning",
    );

    const notesEl = document.getElementById("aeroNotes");
    if (notesEl) decodeText(notesEl, aero.notes, { duration: 400 });
  }

  /*-- WET PANE --*/

  _renderWetPane(report) {
    const wet = report.wetStrategy;
    const banner = document.getElementById("wetStatusReadout");
    const sub = document.getElementById("wetStatusSub");

    if (!wet.required) {
      this._show("dryConditionsPanel");
      this._hide("wetDetailsGrid");
      if (banner) {
        banner.textContent = "DRY CONDITIONS · NO WET STRATEGY REQUIRED";
        banner.className = "dry";
      }
      if (sub) sub.textContent = "Standard dry configuration active";
    } else {
      this._hide("dryConditionsPanel");
      this._show("wetDetailsGrid");
      const heavy = wet.status === "critical";
      if (banner) {
        banner.textContent =
          wet.compound + " · " + (heavy ? "CRITICAL" : "MONITORING");
        banner.className = heavy ? "heavy" : "wet";
      }
      if (sub) sub.textContent = wet.recommendation;
      const rainEl = document.getElementById("rainfallBlock");
      if (rainEl) rainEl.textContent = report.conditions.rain1h.toFixed(1);
      const aquaEl = document.getElementById("aquaplaneBlock");
      if (aquaEl) {
        aquaEl.textContent = wet.aquaplaningRisk ?? "LOW";
        aquaEl.classList.remove("optimal", "warning", "critical");
        const s =
          wet.aquaplaningRisk === "CRITICAL"
            ? "critical"
            : wet.aquaplaningRisk === "MEDIUM"
              ? "warning"
              : "optimal";
        aquaEl.classList.add(s);
      }
      const visEl = document.getElementById("visibilityBlock");
      if (visEl) visEl.textContent = `${report.conditions.visibility ?? "--"}`;
      this._fillRecBlock(
        "wetCompoundBlock",
        wet.compound,
        wet.recommendation,
        wet.status,
      );
      this._fillRecBlock("brakeBiasBlock", wet.brakesBias, "", "warning");
      this._fillRecBlock("engineMapBlock", wet.engineMap, "", "warning");
      this._fillRecBlock("pitWindowBlock", wet.pitWindow, "", wet.status);
    }
  }

  /*-- VERDICT --*/

  _renderVerdict(conditions) {
    const el = document.getElementById("conditionsVerdict");
    if (el)
      decodeText(el, buildVerdict(conditions, this.circuit), { duration: 450 });
  }

  /*-- DATA AGE TIMER --*/

  _startDataAgeTimer() {
    clearInterval(this._ageTimer);
    const el = document.getElementById("dataAge");
    if (!el || !this.report) return;
    const fetchTime = new Date(this.report.fetchedAt);
    this._ageTimer = setInterval(() => {
      const secs = Math.round((Date.now() - fetchTime) / 1000);
      el.textContent =
        secs < 60 ? `${secs}s AGO` : `${Math.floor(secs / 60)}m AGO`;
      if (secs >= 600) el.style.color = "var(--warning)";
    }, 1000);
  }

  /*-- RAIN ALERTS --*/

  _applyRainAlerts(isRaining) {
    document
      .querySelector('[data-tab="wet"]')
      ?.classList.toggle("tab-rain-alert", isRaining);
    this._toggleRainCanvas(isRaining);
  }

  /*-- TAB SWITCH --*/

  _onTabSwitch(tabName) {
    console.log(`[WorkbenchController] Tab: ${tabName}`);
    if (tabName === "wet" && this.report && !this.report.wetStrategy.required)
      console.log("[WorkbenchController] WET tab: dry conditions");
  }

  /*-- NO-CIRCUIT STATE --*/

  _showNoCircuitState() {
    document.getElementById("loadingState")?.classList.add("hidden");
    document.getElementById("workbenchMain")?.classList.add("hidden");
    document.getElementById("errorState")?.classList.add("hidden");
    const titleEl = document.getElementById("circuitTitle");
    if (titleEl) titleEl.textContent = "SELECT A CIRCUIT";

    const container = document.createElement("div");
    container.id = "noCircuitPanel";
    container.style.cssText = "max-width:720px;margin:40px auto 0;padding:0 var(--page-pad) 96px;";
    container.innerHTML = /* html */ `
      <div class="tele-panel" style="padding:0;">
        <div class="tele-panel-header"><span class="apex-label">No circuit selected · pick one to begin</span></div>
        <div style="padding:14px 0 0;">
          <div style="padding:0 16px 14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <input type="text" id="wcSearch" class="apex-search-bar" style="flex:1;min-width:160px;padding-left:20px;" placeholder="Filter circuits..." autocomplete="off">
            <select id="wcRegion" class="apex-select">
              <option value="">ALL REGIONS</option>
              <option value="Europe">EUROPE</option>
              <option value="Americas">AMERICAS</option>
              <option value="Asia-Pacific">ASIA-PACIFIC</option>
              <option value="Middle East">MIDDLE EAST</option>
            </select>
          </div>
          <div id="wcList" style="max-height:420px;overflow-y:auto;border-top:1px solid var(--border);"></div>
        </div>
      </div>`;
    document
      .getElementById("errorState")
      ?.insertAdjacentElement("afterend", container);
    this._renderPickerList(CIRCUITS);

    let dt;
    document.getElementById("wcSearch")?.addEventListener("input", () => {
      clearTimeout(dt);
      dt = setTimeout(() => {
        const q = document
          .getElementById("wcSearch")
          .value.trim()
          .toLowerCase();
        const r = document.getElementById("wcRegion").value;
        let list = CIRCUITS;
        if (q)
          list = list.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.country.toLowerCase().includes(q),
          );
        if (r) list = list.filter((c) => c.region === r);
        this._renderPickerList(list);
      }, 200);
    });
    document.getElementById("wcRegion")?.addEventListener("change", () => {
      const r = document.getElementById("wcRegion").value;
      this._renderPickerList(
        r ? CIRCUITS.filter((c) => c.region === r) : CIRCUITS,
      );
    });
  }

  _renderPickerList(circuits) {
    const el = document.getElementById("wcList");
    if (!el) return;
    if (!circuits.length) {
      el.innerHTML = `<div style="padding:24px;text-align:center;font-family:var(--font-mono);font-size:0.75rem;color:var(--text-muted);">NO CIRCUITS MATCH</div>`;
      return;
    }
    el.innerHTML = circuits
      .map(
        (c) => /* html */ `
      <a href="workbench.html?circuit=${c.id}" style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--border);text-decoration:none;transition:background 100ms,border-left 100ms,padding-left 100ms;">
        <div>
          <div style="font-family:var(--font-mono);font-size:0.82rem;color:var(--text-primary);letter-spacing:0.03em;">${c.shortName.toUpperCase()}</div>
          <div style="font-family:var(--font-ui);font-size:0.68rem;color:var(--text-muted);letter-spacing:0.08em;text-transform:uppercase;margin-top:2px;">${c.country} · ${c.type}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
          <span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text-muted);">${c.length} KM</span>
          <span style="font-size:1.1rem;">${c.flag}</span>
          <span style="font-family:var(--font-ui);font-size:0.65rem;font-weight:700;color:var(--accent-strong);letter-spacing:0.1em;text-transform:uppercase;">LOAD →</span>
        </div>
      </a>`,
      )
      .join("");
    el.querySelectorAll("a").forEach((a) => {
      a.addEventListener("mouseenter", () => {
        a.style.background = "var(--bg-panel-alt)";
        a.style.borderLeft = "2px solid var(--accent)";
        a.style.paddingLeft = "14px";
      });
      a.addEventListener("mouseleave", () => {
        a.style.background = "";
        a.style.borderLeft = "";
        a.style.paddingLeft = "16px";
      });
    });
  }

  /*-- STATE HELPERS --*/

  _showLoading() {
    this._show("loadingState");
    this._hide("workbenchMain");
    this._hide("errorState");
    this._hide("timelinePanel");
    this._setDotClass("weatherDot", "status-loading");
  }
  _showWorkbench() {
    this._hide("loadingState");
    this._hide("errorState");
    this._show("workbenchMain");
    this._show("timelinePanel");
    this._setDotClass("weatherDot", "status-live");
  }
  _showError(msg) {
    this._hide("loadingState");
    this._hide("workbenchMain");
    this._show("errorState");
    this._hide("timelinePanel");
    this._setText("errorMessage", msg);
    this._setDotClass("weatherDot", "status-error");
    document.getElementById("retryBtn").onclick = () => this._fetchAndRender();
  }

  /*-- DOM HELPERS --*/

  _show(id) {
    document.getElementById(id)?.classList.remove("hidden");
  }
  _hide(id) {
    document.getElementById(id)?.classList.add("hidden");
  }
  _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text ?? "--";
  }

  _animateCell(numId, cellId, value, decimals, status) {
    const numEl = document.getElementById(numId);
    const cellEl = document.getElementById(cellId);
    if (numEl) animateValue(numEl, value, { decimals, duration: 650 });
    if (cellEl) {
      cellEl.classList.remove("optimal", "warning", "critical");
      if (status) cellEl.classList.add(status);
    }
  }

  _fillRecBlock(id, value, reason, status = "optimal") {
    const block = document.getElementById(id);
    if (!block) return;
    block.classList.remove("rec-warning", "rec-critical");
    if (status === "warning") block.classList.add("rec-warning");
    if (status === "critical") block.classList.add("rec-critical");
    const v = block.querySelector(".rec-value");
    const r = block.querySelector(".rec-reason");
    if (v) v.textContent = value ?? "--";
    if (r && reason !== undefined && reason !== "") r.textContent = reason;
  }

  _setDotClass(id, cls) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("status-live", "status-loading", "status-error");
    el.classList.add(cls);
  }
}

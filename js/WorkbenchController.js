/* ============================================================
   APEXSTRATEGY — WORKBENCH CONTROLLER  (ES6 module)
   ============================================================ */

import { CIRCUITS, getCircuitById } from "./circuits.js";
import { animateValue, decodeText, flashCell } from "./anim.js";
import { WeatherService } from "./WeatherService.js";
import { SetupEngine } from "./SetupEngine.js";
import { TabController } from "./TabController.js";

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
  return `${tempWord}, ${skyWord}, ${windWord} — ${note}.`;
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
    this._setText("statLapRecord", c.lapRecord);
    this._setText("statAltitude", `${c.altitudeM} M`);
    this._setText("statGrip", c.surfaceGrip.toUpperCase());
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
    const statusEl = document.getElementById("timelineLabel");
    const dotEl = document.getElementById("timelineDot");
    const timeEl = document.getElementById("timelineTime");

    // Mark sessions that have rain in the forecast
    buttons.forEach((btn) => {
      const s = btn.dataset.session;
      if (s !== "now" && this.forecastData?.[s]?.isRaining) {
        btn.classList.add("forecast-rain");
        btn.title = `${s.toUpperCase()}: Rain forecast`;
      }
    });

    if (statusEl) statusEl.textContent = "LIVE CONDITIONS — FORECAST LOADED";
    if (dotEl) {
      dotEl.classList.remove("status-loading");
      dotEl.classList.add("status-live");
    }

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

        if (statusEl)
          statusEl.textContent = LABELS[session] ?? session.toUpperCase();
        if (dotEl) {
          dotEl.classList.remove(
            "status-live",
            "status-loading",
            "status-error",
          );
          dotEl.classList.add(
            session === "now" ? "status-live" : "status-loading",
          );
        }
        if (timeEl) {
          timeEl.textContent =
            session === "now"
              ? ""
              : `EST. ${new Date(weather.fetchedAt).toUTCString().slice(0, 22)}`;
        }

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

  /*-- SECTION: DEGRADATION GRAPHS --*/

  /**
   * Renders three pure-CSS horizontal bar charts for soft / medium / hard
   * degradation rates into #degradationGraphs.
   * Bars animate from 0% → real value via rAF double-tick.
   * Stripe overlay on fills > 75% signals critical degradation.
   * @param {{ degSoft, degMedium, degHard }} compound
   */
  _renderDegradationGraphs(compound) {
    const el = document.getElementById("degradationGraphs");
    if (!el) return;

    const rows = [
      { label: "SOFT", pct: compound.degSoft ?? 0, color: "var(--danger)" },
      { label: "MED", pct: compound.degMedium ?? 0, color: "var(--warning)" },
      { label: "HARD", pct: compound.degHard ?? 0, color: "var(--neon)" },
    ];

    el.innerHTML = rows
      .map(({ label, pct }) => {
        const pctClass =
          pct >= 75 ? "pct-critical" : pct >= 50 ? "pct-warning" : "pct-good";
        return /* html */ `
        <div class="deg-row">
          <div class="deg-label">${label}</div>
          <div class="deg-track">
            <div class="deg-fill" data-target="${pct}" style="width:0%;"></div>
          </div>
          <div class="deg-pct ${pctClass}">${pct}%</div>
        </div>`;
      })
      .join("");

    // Double rAF: first frame paints 0%, second frame triggers CSS transition
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.querySelectorAll(".deg-fill").forEach((fill, i) => {
          const pct = parseInt(fill.dataset.target, 10);
          fill.style.background = rows[i].color;
          fill.style.width = `${pct}%`;
          if (pct >= 75) fill.classList.add("deg-critical");
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
    this._setDotClass("weatherDot", "status-live");
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
        banner.textContent = "DRY CONDITIONS — NO WET STRATEGY REQUIRED";
        banner.className = "dry";
      }
      if (sub) sub.textContent = "Standard dry configuration active";
    } else {
      this._hide("dryConditionsPanel");
      this._show("wetDetailsGrid");
      const heavy = wet.status === "critical";
      if (banner) {
        banner.textContent =
          wet.compound + " — " + (heavy ? "CRITICAL" : "MONITORING");
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
    container.style.cssText = "margin:24px;";
    container.innerHTML = /* html */ `
      <div class="tele-panel bracket-corners" style="padding:0;">
        <div class="tele-panel-header"><span class="apex-label">// NO CIRCUIT SELECTED — PICK ONE TO BEGIN</span></div>
        <div style="padding:12px 0 0;">
          <div style="padding:0 16px 12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <input type="text" id="wcSearch" class="apex-search-bar" style="flex:1;min-width:160px;" placeholder="FILTER CIRCUITS..." autocomplete="off">
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
      el.innerHTML = `<div style="padding:24px;text-align:center;font-family:var(--font-mono);font-size:0.75rem;color:var(--text-muted);">// NO CIRCUITS MATCH</div>`;
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
          <span style="font-family:var(--font-ui);font-size:0.65rem;color:var(--neon);letter-spacing:0.1em;text-transform:uppercase;">LOAD →</span>
        </div>
      </a>`,
      )
      .join("");
    el.querySelectorAll("a").forEach((a) => {
      a.addEventListener("mouseenter", () => {
        a.style.background = "var(--bg-panel-alt)";
        a.style.borderLeft = "2px solid var(--neon)";
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
    this._setDotClass("weatherDot", "status-loading");
  }
  _showWorkbench() {
    this._hide("loadingState");
    this._hide("errorState");
    this._show("workbenchMain");
    this._setDotClass("weatherDot", "status-live");
  }
  _showError(msg) {
    this._hide("loadingState");
    this._hide("workbenchMain");
    this._show("errorState");
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

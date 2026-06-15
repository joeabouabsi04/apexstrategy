/* ============================================================
   APEXSTRATEGY — WORKBENCH CONTROLLER
   Drives Page 2: reads ?circuit= from URL, fetches live weather,
   runs SetupEngine, and populates all three tab panes.

   Depends on (in load order):
     circuits.js      → window.CIRCUITS, window.getCircuitById
     TabController.js → window.TabController
     WeatherService.js→ window.WeatherService
     SetupEngine.js   → window.SetupEngine
     main.js          → window.ApexAnim
   ============================================================ */

/*-- SECTION: VERDICT GENERATOR --*/

/**
 * Generates a one-line race-engineer verdict from conditions + circuit.
 * This is the "conditions verdict" from brief §5 — decoded in on arrival.
 * @param {object} conditions
 * @param {object} circuit
 * @returns {string}
 */
function buildVerdict(conditions, circuit) {
  const { ambientTemp, trackTemp, windSpeed, isRaining, weatherMain } =
    conditions;

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

  const circuitNote =
    circuit.type === "Street Circuit"
      ? "minimise kerb exposure on slippery painted surfaces"
      : circuit.type === "High-Speed"
        ? "prioritise stability through high-speed sectors"
        : circuit.tyreWear === "High" || circuit.tyreWear === "Very High"
          ? "watch rear degradation through medium-speed complexes"
          : "standard setup discipline applies";

  return `${tempWord}, ${skyWord}, ${windWord} — ${circuitNote}.`;
}

/*-- SECTION: WORKBENCHCONTROLLER --*/

class WorkbenchController {
  constructor() {
    //-- Read circuit ID from query string --//
    this.circuitId = new URLSearchParams(window.location.search).get("circuit");

    if (!this.circuitId) {
      // No circuit in URL — show the circuit picker instead of bouncing to index.html
      this._showNoCircuitState();
      return;
    }

    this.circuit = window.getCircuitById(this.circuitId);

    if (!this.circuit) {
      this._showError(
        `UNKNOWN CIRCUIT ID: "${this.circuitId}" — check the URL and try again.`,
      );
      return;
    }

    this.weatherService = new window.WeatherService();
    this.tabController = null;
    this.report = null;
    this._ageTimer = null;
  }

  //-- Public entry point — called from DOMContentLoaded --//
  async init() {
    if (!this.circuit) return; // guard against failed constructor

    this._populateCircuitHeader();
    this._initTabs();
    await this._fetchAndRender();

    // Expose keyboard shortcuts
    window.__apexRefetch = () => this._fetchAndRender();
    window.__apexSwitchTab = (i) => {
      const map = ["tyres", "aero", "wet"];
      if (map[i]) this.tabController?.switchTo(map[i]);
    };
  }

  /*-- SECTION: NO-CIRCUIT LANDING STATE --*/

  /**
   * Called when workbench.html is opened with no ?circuit= param.
   * Renders a compact circuit picker so the user can select one without
   * going back to the Command Center. Far better UX than a hard redirect.
   */
  _showNoCircuitState() {
    // Hide loading/error/workbench panels
    document.getElementById("loadingState")?.classList.add("hidden");
    document.getElementById("workbenchMain")?.classList.add("hidden");
    document.getElementById("errorState")?.classList.add("hidden");

    // Update header to reflect the state
    const titleEl = document.getElementById("circuitTitle");
    if (titleEl) titleEl.textContent = "SELECT A CIRCUIT";
    document
      .getElementById("circuitMeta")
      ?.setAttribute("aria-label", "No circuit selected");

    // Build the picker panel and inject it after the error state div
    const container = document.createElement("div");
    container.id = "noCircuitPanel";
    container.style.cssText = "margin:24px;";
    container.innerHTML = /* html */ `
      <div class="tele-panel bracket-corners" style="padding:0;">
        <div class="tele-panel-header">
          <span class="apex-label">// NO CIRCUIT SELECTED — PICK ONE TO BEGIN</span>
        </div>
        <div style="padding:12px 0 0;">
          <div style="padding:0 16px 12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <input type="text" id="wcSearch" class="apex-search-bar" style="flex:1;min-width:160px;"
                   placeholder="FILTER CIRCUITS..." autocomplete="off">
            <select id="wcRegion" class="apex-select">
              <option value="">ALL REGIONS</option>
              <option value="Europe">EUROPE</option>
              <option value="Americas">AMERICAS</option>
              <option value="Asia-Pacific">ASIA-PACIFIC</option>
              <option value="Middle East">MIDDLE EAST</option>
            </select>
          </div>
          <div id="wcList" style="max-height:420px;overflow-y:auto;border-top:1px solid var(--border);">
            <!-- injected by JS -->
          </div>
        </div>
      </div>`;

    // Insert after the error state
    const errEl = document.getElementById("errorState");
    errEl?.insertAdjacentElement("afterend", container);

    // Render the list
    this._renderPickerList(window.CIRCUITS ?? []);

    // Live filter
    const searchEl = document.getElementById("wcSearch");
    const regionEl = document.getElementById("wcRegion");

    const refilter = () => {
      const q = searchEl?.value.trim().toLowerCase() ?? "";
      const r = regionEl?.value ?? "";
      let list = window.CIRCUITS ?? [];
      if (q)
        list = list.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.country.toLowerCase().includes(q),
        );
      if (r) list = list.filter((c) => c.region === r);
      this._renderPickerList(list);
    };

    let debounceT;
    searchEl?.addEventListener("input", () => {
      clearTimeout(debounceT);
      debounceT = setTimeout(refilter, 200);
    });
    regionEl?.addEventListener("change", refilter);
  }

  /** Render rows inside the no-circuit picker list */
  _renderPickerList(circuits) {
    const listEl = document.getElementById("wcList");
    if (!listEl) return;

    if (!circuits.length) {
      listEl.innerHTML = `<div style="padding:24px;text-align:center;font-family:var(--font-mono);font-size:0.75rem;color:var(--text-muted);">// NO CIRCUITS MATCH</div>`;
      return;
    }

    listEl.innerHTML = circuits
      .map(
        (c) => /* html */ `
      <a href="workbench.html?circuit=${c.id}"
         style="display:flex;align-items:center;justify-content:space-between;
                padding:10px 16px;border-bottom:1px solid var(--border);
                text-decoration:none;transition:background 100ms;">
        <div>
          <div style="font-family:var(--font-mono);font-size:0.82rem;color:var(--text-primary);
                      letter-spacing:0.03em;">${c.shortName.toUpperCase()}</div>
          <div style="font-family:var(--font-ui);font-size:0.68rem;color:var(--text-muted);
                      letter-spacing:0.08em;text-transform:uppercase;margin-top:2px;">
            ${c.country} · ${c.type}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
          <span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text-muted);">
            ${c.length} KM
          </span>
          <span style="font-size:1.1rem;">${c.flag}</span>
          <span style="font-family:var(--font-ui);font-size:0.65rem;color:var(--neon);
                       letter-spacing:0.1em;text-transform:uppercase;">LOAD →</span>
        </div>
      </a>`,
      )
      .join("");

    // Hover effect inline (can't use CSS without a class definition here)
    listEl.querySelectorAll("a").forEach((a) => {
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

  /*-- SECTION: CIRCUIT HEADER --*/

  /**
   * Fills the static circuit info: title, meta line, and stats strip.
   * Runs before the API fetch so the page always shows circuit context.
   */
  _populateCircuitHeader() {
    const c = this.circuit;

    // Page title (will be decoded in by main.js boot sequence)
    const titleEl = document.getElementById("circuitTitle");
    if (titleEl) {
      titleEl.textContent = c.name.toUpperCase();
      // Trigger decode-in once boot sequence completes (slight delay)
      setTimeout(() => {
        window.ApexAnim?.decodeText(titleEl, c.name.toUpperCase(), {
          duration: 400,
        });
      }, 180);
    }

    this._setText("circuitCountry", c.country.toUpperCase());
    this._setText("circuitType", c.type.toUpperCase());
    this._setText("circuitLength", `${c.length} KM`);

    // Loading state label
    this._setText("loadingCircuit", c.shortName.toUpperCase());

    // Stats strip (bottom of workbench)
    this._setText("statLength", `${c.length} KM`);
    this._setText("statTurns", `${c.turns}`);
    this._setText("statLapRecord", c.lapRecord);
    this._setText("statAltitude", `${c.altitudeM} M`);
    this._setText("statGrip", c.surfaceGrip.toUpperCase());
  }

  /*-- SECTION: TABS --*/

  /**
   * Initialises TabController. Done before the fetch so tabs are
   * interactive the moment the workbench panel becomes visible.
   */
  _initTabs() {
    this.tabController = new window.TabController(
      ".workbench-nav",
      ".workbench-panes",
      (tabName) => this._onTabSwitch(tabName),
    );
  }

  /*-- SECTION: FETCH & RENDER --*/

  /**
   * Main async loop: show loading → fetch → run engine → render → show workbench.
   * Catches all failures and routes them to the error state with a retry hook.
   */
  async _fetchAndRender() {
    this._showLoading();

    try {
      const weather = await this.weatherService.fetchWeather(
        this.circuit.lat,
        this.circuit.lon,
        this.circuit.id,
      );

      const engine = new window.SetupEngine(this.circuit, weather);
      this.report = engine.generateReport();

      this._updateWeatherHeader(weather);
      this._renderTyrePane(this.report);
      this._renderAeroPane(this.report);
      this._renderWetPane(this.report);
      this._renderVerdict(this.report.conditions);
      this._startDataAgeTimer();
      this._applyRainAlerts(weather.isRaining);

      this._showWorkbench();
    } catch (err) {
      console.error("[WorkbenchController]", err);
      this._showError(err.message ?? "FETCH FAILED");

      document.getElementById("retryBtn").onclick = () =>
        this._fetchAndRender();
    }
  }

  /*-- SECTION: WEATHER HEADER --*/

  /**
   * Populates the live conditions panel in the page header.
   * Temperature counts up; condition text decodes in.
   */
  _updateWeatherHeader(weather) {
    const anim = window.ApexAnim;

    // Temperature — count up
    const tempEl = document.getElementById("tempReadout");
    if (tempEl && anim) {
      tempEl.dataset.rawValue = "0";
      anim.animateValue(tempEl, weather.temp, {
        duration: 600,
        decimals: 0,
        suffix: "°C",
      });
    }

    // Estimated track temp in smaller header field
    const trackHdr = document.getElementById("trackTempHeader");
    if (trackHdr && anim) {
      trackHdr.dataset.rawValue = "0";
      anim.animateValue(trackHdr, weather.trackTempEstimate, {
        duration: 700,
        decimals: 0,
        suffix: "°C",
      });
    }

    // Wind
    const windEl = document.getElementById("windReadout");
    if (windEl) {
      windEl.textContent = `${weather.windArrow} ${weather.windSpeed} km/h ${weather.windDir}`;
    }

    // Condition — decode in
    const condEl = document.getElementById("condReadout");
    if (condEl && anim) {
      anim.decodeText(condEl, weather.weatherMain.toUpperCase(), {
        duration: 300,
      });
    } else if (condEl) {
      condEl.textContent = weather.weatherMain.toUpperCase();
    }

    // Humidity
    const humEl = document.getElementById("humidReadout");
    if (humEl) humEl.textContent = `${weather.humidity}%`;

    // Update dot to live
    this._setDotClass("weatherDot", "status-live");
  }

  /*-- SECTION: TYRE PANE RENDER --*/

  /**
   * Fills Pane 1: pressures (animated), compound (decoded), conditions rec-blocks.
   */
  _renderTyrePane(report) {
    const { tyres, compound, conditions } = report;
    const anim = window.ApexAnim;

    // PSI values — animate up with 1 decimal
    this._animateCell(
      "frontPsi",
      "frontPsiCell",
      tyres.frontPsi,
      1,
      tyres.status,
      anim,
    );
    this._animateCell(
      "rearPsi",
      "rearPsiCell",
      tyres.rearPsi,
      1,
      tyres.status,
      anim,
    );
    this._animateCell(
      "frontKpa",
      "frontKpaCell",
      tyres.frontKpa,
      1,
      tyres.status,
      anim,
    );
    this._animateCell(
      "rearKpa",
      "rearKpaCell",
      tyres.rearKpa,
      1,
      tyres.status,
      anim,
    );

    // Compound — decode in
    const compoundEl = document.getElementById("compoundReadout");
    if (compoundEl) {
      if (anim) {
        anim.decodeText(compoundEl, compound.compound, { duration: 360 });
      } else {
        compoundEl.textContent = compound.compound;
      }
      // Apply compound status colour
      compoundEl.style.color =
        compound.status === "critical"
          ? "var(--danger)"
          : compound.status === "warning"
            ? "var(--warning)"
            : "var(--neon)";
    }

    // Compound status dot
    this._setDotClass(
      "compoundStatusDot",
      compound.status === "critical"
        ? "status-error"
        : compound.status === "warning"
          ? "status-loading"
          : "status-live",
    );

    // Compound reason
    this._setText("compoundReason", compound.reason);

    // Rec-blocks
    this._fillRecBlock(
      "trackTempBlock",
      `${conditions.trackTemp}°C`,
      `Estimated surface temperature (ambient + solar model)`,
      conditions.trackTemp > 55
        ? "critical"
        : conditions.trackTemp > 42
          ? "warning"
          : "optimal",
    );

    this._fillRecBlock(
      "ambientTempBlock",
      `${conditions.ambientTemp}°C`,
      `Air temperature at ${this.circuit.altitudeM}m altitude`,
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
  }

  /*-- SECTION: AERO PANE RENDER --*/

  /**
   * Fills Pane 2: wing angles (animated), wind analysis, engineering notes.
   */
  _renderAeroPane(report) {
    const { aero, conditions } = report;
    const anim = window.ApexAnim;

    // Wing angles
    this._animateCell(
      "frontWing",
      "frontWingCell",
      aero.frontWingAngle,
      0,
      aero.status,
      anim,
    );
    this._animateCell(
      "rearWing",
      "rearWingCell",
      aero.rearWingAngle,
      0,
      aero.status,
      anim,
    );

    // Drag coefficient — text, no animation
    const dragEl = document.getElementById("dragCoeff");
    if (dragEl) dragEl.textContent = aero.dragCoefficient;
    const dragCell = document.getElementById("dragCoeffCell");
    if (dragCell) {
      dragCell.classList.remove("optimal", "warning", "critical");
      // Only add a class when there's a meaningful signal — MEDIUM/HIGH get no colour override
      const dcStatus =
        aero.dragCoefficient === "VERY HIGH"
          ? "warning"
          : aero.dragCoefficient === "LOW"
            ? "optimal"
            : null; // MEDIUM and HIGH: default text colour, no class
      if (dcStatus) dragCell.classList.add(dcStatus);
    }

    // Wind analysis blocks
    const windStatus =
      conditions.windSpeed > 70
        ? "critical"
        : conditions.windSpeed > 40
          ? "warning"
          : "optimal";

    this._fillRecBlock(
      "windSpeedBlock",
      `${conditions.windArrow ?? ""} ${conditions.windSpeed} km/h`,
      conditions.windSpeed > 70
        ? "SEVERE — major aerodynamic disturbance expected"
        : conditions.windSpeed > 40
          ? "ELEVATED — stability adjustments applied"
          : "Within normal operating range",
      windStatus,
    );

    this._fillRecBlock(
      "windDirBlock",
      `${conditions.windDir} ${conditions.windArrow ?? ""}`,
      "Crosswind effect varies by circuit orientation — monitor driver feedback on high-speed entry",
    );

    this._fillRecBlock(
      "drsBlock",
      aero.drsEnabled ? "ENABLED" : "DISABLED (MONACO)",
      aero.drsEnabled
        ? `${this.circuit.shortName} has DRS zones active. Exploitation depends on qualifying position.`
        : "Monaco circuit does not permit DRS use — max mechanical downforce held throughout.",
      aero.drsEnabled ? "optimal" : "warning",
    );

    // Engineering notes — decode in
    const notesEl = document.getElementById("aeroNotes");
    if (notesEl) {
      if (anim) {
        anim.decodeText(notesEl, aero.notes, { duration: 400 });
      } else {
        notesEl.textContent = aero.notes;
      }
    }
  }

  /*-- SECTION: WET PANE RENDER --*/

  /**
   * Fills Pane 3: shows dry confirmation or full wet strategy details.
   */
  _renderWetPane(report) {
    const wet = report.wetStrategy;
    const statusBanner = document.getElementById("wetStatusReadout");
    const statusSub = document.getElementById("wetStatusSub");

    if (!wet.required) {
      // Dry: show the calm panel, hide the details grid
      this._show("dryConditionsPanel");
      this._hide("wetDetailsGrid");

      if (statusBanner) {
        statusBanner.textContent = "DRY CONDITIONS — NO WET STRATEGY REQUIRED";
        statusBanner.className = "dry";
      }
      if (statusSub)
        statusSub.textContent = "Standard dry configuration active";
    } else {
      // Wet: fill the details grid and show it
      this._hide("dryConditionsPanel");
      this._show("wetDetailsGrid");

      const isHeavy = wet.status === "critical";

      if (statusBanner) {
        statusBanner.textContent =
          wet.compound +
          " — " +
          (isHeavy ? "CRITICAL CONDITIONS" : "MONITORING");
        statusBanner.className = isHeavy ? "heavy" : "wet";
      }
      if (statusSub) statusSub.textContent = wet.recommendation;

      // Rainfall
      const rainEl = document.getElementById("rainfallBlock");
      if (rainEl) rainEl.textContent = report.conditions.rain1h.toFixed(1);

      // Aquaplane risk — style it
      const aquaEl = document.getElementById("aquaplaneBlock");
      if (aquaEl) {
        aquaEl.textContent = wet.aquaplaningRisk ?? "LOW";
        aquaEl.classList.remove("optimal", "warning", "critical");
        aquaEl.classList.add(
          wet.aquaplaningRisk === "CRITICAL"
            ? "critical"
            : wet.aquaplaningRisk === "MEDIUM"
              ? "warning"
              : "optimal",
        );
      }

      // Visibility
      const visEl = document.getElementById("visibilityBlock");
      if (visEl) visEl.textContent = `${report.conditions.visibility ?? "--"}`;

      // Rec-blocks
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

  /*-- SECTION: VERDICT --*/

  /**
   * Generates and decodes in the one-line conditions verdict.
   */
  _renderVerdict(conditions) {
    const el = document.getElementById("conditionsVerdict");
    if (!el) return;
    const text = buildVerdict(conditions, this.circuit);
    if (window.ApexAnim) {
      window.ApexAnim.decodeText(el, text, { duration: 450 });
    } else {
      el.textContent = text;
    }
  }

  /*-- SECTION: DATA AGE TIMER --*/

  /**
   * Ticks a "UPDATED Xs AGO" counter in the weather panel header.
   * Clears old timer on each re-fetch.
   */
  _startDataAgeTimer() {
    clearInterval(this._ageTimer);
    const el = document.getElementById("dataAge");
    if (!el || !this.report) return;

    const fetchTime = new Date(this.report.fetchedAt);

    this._ageTimer = setInterval(() => {
      const secs = Math.round((Date.now() - fetchTime) / 1000);
      if (secs < 60) {
        el.textContent = `${secs}s AGO`;
      } else {
        const mins = Math.floor(secs / 60);
        el.textContent = `${mins}m AGO`;
        // After 10 minutes the cache is stale — signal it
        if (mins >= 10) el.style.color = "var(--warning)";
      }
    }, 1000);
  }

  /*-- SECTION: RAIN ALERTS --*/

  /**
   * When raining: highlight the WET tab with amber, keep it enabled.
   * When dry: ensure the tab is normal.
   */
  _applyRainAlerts(isRaining) {
    const wetTab = document.querySelector('[data-tab="wet"]');
    if (!wetTab) return;
    if (isRaining) {
      wetTab.classList.add("tab-rain-alert");
    } else {
      wetTab.classList.remove("tab-rain-alert");
    }
  }

  /*-- SECTION: TAB SWITCH CALLBACK --*/

  /**
   * Called by TabController after every tab switch.
   * Logs for debugging; could trigger lazy-render in future.
   */
  _onTabSwitch(tabName) {
    console.log(`[WorkbenchController] Tab: ${tabName}`);

    // If switching to wet and dry conditions: brief status reminder in console
    if (tabName === "wet" && this.report && !this.report.wetStrategy.required) {
      console.log(
        "[WorkbenchController] WET tab: dry conditions — no action required",
      );
    }
  }

  /*-- SECTION: STATE MANAGEMENT --*/

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

  _showError(message) {
    this._hide("loadingState");
    this._hide("workbenchMain");
    this._show("errorState");
    this._setText("errorMessage", message);
    this._setDotClass("weatherDot", "status-error");

    // Wire retry
    const retryBtn = document.getElementById("retryBtn");
    if (retryBtn) retryBtn.onclick = () => this._fetchAndRender();
  }

  /*-- SECTION: DOM HELPERS --*/

  /** Show an element by removing .hidden */
  _show(id) {
    document.getElementById(id)?.classList.remove("hidden");
  }

  /** Hide an element by adding .hidden */
  _hide(id) {
    document.getElementById(id)?.classList.add("hidden");
  }

  /** Set textContent safely */
  _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text ?? "--";
  }

  /**
   * Animate a data-cell number span and apply status class to its wrapper.
   * @param {string} numId     - ID of the <span> containing the number
   * @param {string} cellId    - ID of the .data-cell-value wrapper
   * @param {number} value     - Target value
   * @param {number} decimals  - Decimal places (0 or 1)
   * @param {string} status    - 'optimal' | 'warning' | 'critical'
   * @param {object|null} anim - window.ApexAnim or null
   */
  _animateCell(numId, cellId, value, decimals, status, anim) {
    const numEl = document.getElementById(numId);
    const cellEl = document.getElementById(cellId);

    if (numEl && anim) {
      anim.animateValue(numEl, value, { decimals, duration: 650 });
    } else if (numEl) {
      numEl.textContent = value.toFixed(decimals);
    }

    if (cellEl) {
      cellEl.classList.remove("optimal", "warning", "critical");
      if (status) cellEl.classList.add(status);
    }
  }

  /**
   * Fills a rec-block element: status class, value, reason.
   * @param {string} id
   * @param {string} value
   * @param {string} reason
   * @param {string} status  - 'optimal' | 'warning' | 'critical'
   */
  _fillRecBlock(id, value, reason, status = "optimal") {
    const block = document.getElementById(id);
    if (!block) return;

    block.classList.remove("rec-warning", "rec-critical");
    if (status === "warning") block.classList.add("rec-warning");
    if (status === "critical") block.classList.add("rec-critical");

    const vEl = block.querySelector(".rec-value");
    const rEl = block.querySelector(".rec-reason");
    if (vEl) vEl.textContent = value ?? "--";
    if (rEl && reason !== undefined && reason !== "") rEl.textContent = reason;
  }

  /**
   * Swaps the status-* class on a dot element cleanly.
   * @param {string} id
   * @param {string} cls  - 'status-live' | 'status-loading' | 'status-error'
   */
  _setDotClass(id, cls) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("status-live", "status-loading", "status-error");
    el.classList.add(cls);
  }
}

/*-- SECTION: INIT --*/

document.addEventListener("DOMContentLoaded", () => {
  const wb = new WorkbenchController();
  wb.init().catch((err) => {
    // Catch any unhandled async errors from init() itself
    console.error("[WorkbenchController] Unhandled init error:", err);
  });
});

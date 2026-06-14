/* ============================================================
   APEXSTRATEGY — SETUP ENGINE
   Converts live weather telemetry + circuit characteristics
   into engineering setup recommendations.

   All formulas are real-world approximations used in motorsport
   engineering. Values are plausible for an F1/prototype context,
   not marketing copy. Round outputs at the source — never let
   22.6000001 escape to the screen.
   ============================================================ */

/*-- SECTION: LOOKUP TABLES --*/

// Tyre compound operating windows (track surface °C)
const COMPOUND_WINDOWS = [
  {
    max: 15,
    compound: "C3 (SOFT)",
    status: "warning",
    reason:
      "Track too cold for medium or hard. Soft mandatory but warm-up will be slow — expect understeer on exit for first 3–4 laps.",
  },
  {
    max: 25,
    compound: "C3 (SOFT)",
    status: "optimal",
    reason:
      "Ideal operating window for soft compound. Expect strong early-stint grip.",
  },
  {
    max: 35,
    compound: "C2 (MEDIUM)",
    status: "optimal",
    reason:
      "Medium compound in its ideal thermal window. Good balance of pace and longevity.",
  },
  {
    max: 45,
    compound: "C1 (HARD)",
    status: "optimal",
    reason:
      "High track temp — hard compound recommended. Monitor shoulder wear on long stints.",
  },
  {
    max: Infinity,
    compound: "C1 (HARD)",
    status: "warning",
    reason:
      "Track temp critical — overheating risk even on hard compound. Increase tyre pressure 0.5 PSI and monitor via radio.",
  },
];

// Base wing angles (degrees) by circuit downforce level
const AERO_BASE = {
  Low: { front: 3, rear: 3 },
  Medium: { front: 6, rear: 7 },
  "Medium-High": { front: 9, rear: 11 },
  High: { front: 12, rear: 14 },
  "Very High": { front: 15, rear: 17 },
};

// Base tyre pressures (PSI) by circuit type
const TYRE_BASE = {
  "High-Speed": { front: 23.0, rear: 21.5 },
  Technical: { front: 22.0, rear: 21.0 },
  "Street Circuit": { front: 23.5, rear: 22.0 },
  Hybrid: { front: 22.5, rear: 21.0 },
};

// Drag coefficient label from combined wing angle total
function dragLabel(total) {
  if (total <= 8) return "LOW";
  if (total <= 18) return "MEDIUM";
  if (total <= 28) return "HIGH";
  return "VERY HIGH";
}

// Round to N decimal places at the source — no floating-point leakage
function r(n, decimals = 1) {
  return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/*-- SECTION: SETUPENGINE CLASS --*/

/**
 * APEXSTRATEGY // SETUP ENGINE
 * Takes a circuit object (from CIRCUITS array) and a weather object
 * (from WeatherService.fetchWeather) and produces a full engineering
 * setup recommendation report.
 *
 * Usage:
 *   const engine = new SetupEngine(circuit, weather);
 *   const report = engine.generateReport();
 */
class SetupEngine {
  /**
   * @param {object} circuit - Entry from window.CIRCUITS
   * @param {object} weather - Normalised object from WeatherService.fetchWeather()
   */
  constructor(circuit, weather) {
    /** @type {object} Circuit descriptor from CIRCUITS array */
    this.circuit = circuit;

    /** @type {object} Normalised weather from WeatherService */
    this.weather = weather;
  }

  /*-- SECTION: TYRE PRESSURES --*/

  /**
   * Calculates recommended tyre pressures in PSI and kPa.
   * Formula: base pressure by circuit type, adjusted for ambient temp,
   * track temp, and wet conditions. Rounded to 1 decimal.
   * @returns {{ frontPsi, rearPsi, frontKpa, rearKpa, recommendation, status }}
   */
  calculateTyrePressures() {
    const base = TYRE_BASE[this.circuit.type] ?? TYRE_BASE["Technical"];
    let front = base.front;
    let rear = base.rear;

    // Ambient temperature adjustment: ±0.2 PSI per 5°C from 20°C baseline
    // Real engineering rationale: trapped nitrogen expands with heat.
    const ambientSteps = (this.weather.temp - 20) / 5;
    const ambientAdj = r(ambientSteps * 0.2, 2);
    front += ambientAdj;
    rear += ambientAdj;

    // Track temperature adjustment: +0.3 PSI per 10°C above 30°C surface temp
    // Track temp heats the tyre from the contact patch upward — separate effect.
    if (this.weather.trackTempEstimate > 30) {
      const trackSteps = Math.floor((this.weather.trackTempEstimate - 30) / 10);
      const trackAdj = r(trackSteps * 0.3, 2);
      front += trackAdj;
      rear += trackAdj;
    }

    // Wet conditions: lower pressure improves contact patch on wet surface
    if (this.weather.isRaining) {
      front -= 1.5;
      rear -= 1.5;
    }

    // Clamp to physically plausible range (18–27 PSI for open-wheel)
    front = Math.max(18.0, Math.min(27.0, r(front)));
    rear = Math.max(17.5, Math.min(26.0, r(rear)));

    // Derive status and recommendation text
    let status = "optimal";
    let recommendation = "WITHIN OPTIMAL WINDOW";

    if (this.weather.isRaining) {
      status = "warning";
      recommendation = "WET CONFIGURATION — REDUCED PRESSURE APPLIED";
    } else if (this.weather.temp > 38 || this.weather.trackTempEstimate > 58) {
      status = "warning";
      recommendation =
        "MONITOR — HIGH AMBIENT · RISK OF OVERINFLATION ON TRACK";
    } else if (this.weather.temp < 8) {
      status = "warning";
      recommendation = "MONITOR — COLD CONDITIONS · ALLOW EXTENDED WARM-UP LAP";
    } else if (this.weather.temp > 30) {
      recommendation = "SLIGHTLY ELEVATED — STANDARD FOR HIGH-TEMP RUNNING";
    }

    return {
      frontPsi: r(front),
      rearPsi: r(rear),
      frontKpa: r(front * 6.895),
      rearKpa: r(rear * 6.895),
      recommendation,
      status,
    };
  }

  /*-- SECTION: TYRE COMPOUND --*/

  /**
   * Recommends a tyre compound based on track surface temperature.
   * Wet conditions override all dry compound logic.
   * @returns {{ compound, status, reason }}
   */
  recommendTyreCompound() {
    // Wet override — compound logic is binary in rain
    if (this.weather.isRaining) {
      if (this.weather.rain1h < 0.5) {
        return {
          compound: "INTERMEDIATE",
          status: "warning",
          reason:
            "Light precipitation — intermediate compound viable. Track drying window open; pit crew on standby for slick switch.",
        };
      }
      return {
        compound: "FULL WET",
        status: "critical",
        reason: `Active precipitation at ${this.weather.rain1h.toFixed(1)}mm/h — full wet compound mandatory. Do not attempt slick running.`,
      };
    }

    // Dry: select compound by track surface temperature
    const trackTemp = this.weather.trackTempEstimate;
    const window =
      COMPOUND_WINDOWS.find((w) => trackTemp < w.max) ??
      COMPOUND_WINDOWS.at(-1);
    return {
      compound: window.compound,
      status: window.status,
      reason: window.reason,
    };
  }

  /*-- SECTION: AERODYNAMICS --*/

  /**
   * Calculates front and rear wing angles in degrees.
   * Base angles come from circuit downforce level; adjusted for wind speed
   * and wet conditions. Monaco never uses DRS.
   * @returns {{ frontWingAngle, rearWingAngle, drsEnabled, dragCoefficient, notes, status }}
   */
  calculateAeroSetup() {
    const base = AERO_BASE[this.circuit.baseDownforce] ?? AERO_BASE["Medium"];
    let front = base.front;
    let rear = base.rear;
    let status = "optimal";
    const noteLines = [];

    // Wind adjustment: more downforce for stability in crosswind
    if (this.weather.windSpeed > 70) {
      front += 2;
      rear += 2;
      status = "warning";
      noteLines.push(
        "SEVERE CROSSWIND — additional downforce applied. Expect significant lap time variation between sectors. Inform driver of gusty conditions especially at circuit perimeter.",
      );
    } else if (this.weather.windSpeed > 40) {
      front += 1;
      rear += 1;
      noteLines.push(
        "CROSSWIND RISK — +1° applied to both wings. Monitor driver feedback on high-speed entry stability.",
      );
    }

    // Wet: full wet trim needs more downforce for traction and braking stability
    if (this.weather.isRaining) {
      front += 2;
      rear += 2;
      if (status !== "warning") status = "warning";
      noteLines.push(
        "WET CONFIGURATION — maximum downforce for mechanical traction and braking stability under low-grip conditions.",
      );
    }

    // Clamp wing angles to physical range (1–20°)
    front = Math.max(1, Math.min(20, front));
    rear = Math.max(1, Math.min(22, rear));

    // If no specific conditions, produce a standard circuit note
    if (noteLines.length === 0) {
      noteLines.push(
        `${this.circuit.baseDownforce.toUpperCase()} DOWNFORCE CONFIGURATION — baseline for ${this.circuit.shortName}. ` +
          `Drag coefficient: ${dragLabel(front + rear)}.`,
      );
    }

    return {
      frontWingAngle: front,
      rearWingAngle: rear,
      drsEnabled: this.circuit.id !== "monaco",
      dragCoefficient: dragLabel(front + rear),
      notes: noteLines.join(" "),
      status,
    };
  }

  /*-- SECTION: WET STRATEGY --*/

  /**
   * Generates a full wet-weather strategy block.
   * Returns a minimal object when conditions are dry.
   * @returns {{ required, recommendation, status, compound?, pitWindow?, ... }}
   */
  calculateWetStrategy() {
    const { isRaining, rain1h, visibility } = this.weather;

    // Fully dry — keep it short, don't clutter the UI
    if (!isRaining && rain1h < 0.1) {
      return {
        required: false,
        recommendation: "DRY CONDITIONS — STANDARD SETUP",
        status: "optimal",
      };
    }

    // Heavy rain
    if (rain1h >= 2) {
      return {
        required: true,
        compound: "FULL WET",
        pitWindow: "PIT IMMEDIATELY — CONDITIONS CRITICAL",
        visibilityRisk: "HIGH",
        aquaplaningRisk: rain1h > 5 ? "CRITICAL" : "MEDIUM",
        brakesBias: "FRONT +2% (wet bias for stability)",
        engineMap: "RAIN MAP — REDUCED POWER DELIVERY",
        recommendation: `Full wet compound mandatory. Rain: ${rain1h.toFixed(1)}mm/h. Reduce throttle-on point by 15–20m in slow corners. Increase brake bias to front for stability under heavy trail-braking.`,
        status: "critical",
      };
    }

    // Light to moderate rain (rain1h 0.1–2mm)
    return {
      required: true,
      compound: "INTERMEDIATE",
      pitWindow: "MONITOR — INTERMEDIATE VIABLE",
      visibilityRisk: visibility < 5 ? "HIGH" : "LOW",
      aquaplaningRisk: "LOW",
      brakesBias: "FRONT +2% (wet bias for stability)",
      engineMap: "RAIN MAP — REDUCED POWER DELIVERY",
      recommendation: `Light precipitation at ${rain1h.toFixed(1)}mm/h — intermediate compound viable. Track may dry; maintain slick tyres in pit-lane on standby. Visibility${visibility < 5 ? " critically reduced" : " acceptable"}.`,
      status: "warning",
    };
  }

  /*-- SECTION: FULL REPORT --*/

  /**
   * Generates the complete engineering report by calling all sub-methods.
   * This is the primary output consumed by WorkbenchController to populate the UI.
   * @returns {object} Full setup report
   */
  generateReport() {
    return {
      circuit: this.circuit.name,
      circuitId: this.circuit.id,
      fetchedAt: this.weather.fetchedAt,

      tyres: this.calculateTyrePressures(),
      compound: this.recommendTyreCompound(),
      aero: this.calculateAeroSetup(),
      wetStrategy: this.calculateWetStrategy(),

      conditions: {
        ambientTemp: this.weather.temp,
        trackTemp: this.weather.trackTempEstimate,
        humidity: this.weather.humidity,
        windSpeed: this.weather.windSpeed,
        windDir: this.weather.windDir,
        windArrow: this.weather.windArrow,
        weatherMain: this.weather.weatherMain,
        weatherDesc: this.weather.weatherDesc,
        cloudCover: this.weather.cloudCover,
        visibility: this.weather.visibility,
        pressure: this.weather.pressure,
        isRaining: this.weather.isRaining,
        rain1h: this.weather.rain1h,
      },
    };
  }
}

/*-- SECTION: EXPORT --*/

window.SetupEngine = SetupEngine;

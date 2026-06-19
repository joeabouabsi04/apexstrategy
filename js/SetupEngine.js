/* ============================================================
   APEXSTRATEGY — SETUP ENGINE  (ES6 module)
   No dependencies. Pass circuit + weather objects to constructor.
   ============================================================ */

/*-- SECTION: LOOKUP TABLES --*/

const COMPOUND_WINDOWS = [
  {
    max: 15,
    compound: "C3 (SOFT)",
    status: "warning",
    reason:
      "Track too cold — soft mandatory but warm-up will be slow. Expect understeer for first 3–4 laps.",
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
      "Track temp critical — overheating risk even on hard compound. Increase pressure 0.5 PSI and monitor.",
  },
];

const AERO_BASE = {
  Low: { front: 3, rear: 3 },
  Medium: { front: 6, rear: 7 },
  "Medium-High": { front: 9, rear: 11 },
  High: { front: 12, rear: 14 },
  "Very High": { front: 15, rear: 17 },
};

const TYRE_BASE = {
  "High-Speed": { front: 23.0, rear: 21.5 },
  Technical: { front: 22.0, rear: 21.0 },
  "Street Circuit": { front: 23.5, rear: 22.0 },
  Hybrid: { front: 22.5, rear: 21.0 },
};

const r = (n, d = 1) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);

function dragLabel(total) {
  if (total <= 8) return "LOW";
  if (total <= 18) return "MEDIUM";
  if (total <= 28) return "HIGH";
  return "VERY HIGH";
}

/*-- SECTION: CLASS --*/

export class SetupEngine {
  constructor(circuit, weather) {
    this.circuit = circuit;
    this.weather = weather;
  }

  calculateTyrePressures() {
    const base = TYRE_BASE[this.circuit.type] ?? TYRE_BASE["Technical"];
    let front = base.front;
    let rear = base.rear;

    const ambientAdj = r(((this.weather.temp - 20) / 5) * 0.2, 2);
    front += ambientAdj;
    rear += ambientAdj;

    if (this.weather.trackTempEstimate > 30) {
      const trackAdj = r(
        Math.floor((this.weather.trackTempEstimate - 30) / 10) * 0.3,
        2,
      );
      front += trackAdj;
      rear += trackAdj;
    }

    if (this.weather.isRaining) {
      front -= 1.5;
      rear -= 1.5;
    }

    front = Math.max(18.0, Math.min(27.0, r(front)));
    rear = Math.max(17.5, Math.min(26.0, r(rear)));

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

  recommendTyreCompound() {
    // Base degradation lookup by circuit tyre-wear classification.
    // These represent the percentage of useful tyre life consumed per stint
    // under race pace — calibrated to real-world F1 engineering ranges.
    const wearBase = { Low: 32, Medium: 50, High: 68, "Very High": 84 };
    const base = wearBase[this.circuit.tyreWear] ?? 50;

    // Track temperature bonus: every 10°C above 20°C adds ~4% additional thermal stress.
    const trackTemp = this.weather.trackTempEstimate;
    const tempBonus = Math.max(0, (trackTemp - 20) * 0.35);

    // Compound multipliers: soft = 1.0x, medium = 0.58x, hard = 0.33x
    // Soft in rain has dramatically reduced thermal load (cooler track).
    const rainReduction = this.weather.isRaining ? 0.65 : 1.0;

    const degSoft = Math.min(
      100,
      Math.round((base + tempBonus) * rainReduction),
    );
    const degMedium = Math.min(
      100,
      Math.round((base * 0.58 + tempBonus * 0.58) * rainReduction),
    );
    const degHard = Math.min(
      100,
      Math.round((base * 0.33 + tempBonus * 0.33) * rainReduction),
    );

    if (this.weather.isRaining) {
      if (this.weather.rain1h < 0.5)
        return {
          compound: "INTERMEDIATE",
          status: "warning",
          reason:
            "Light precipitation — intermediate viable. Monitor for slick window.",
          degSoft,
          degMedium,
          degHard,
        };
      return {
        compound: "FULL WET",
        status: "critical",
        reason: `Active precipitation at ${this.weather.rain1h.toFixed(1)}mm/h — full wet mandatory.`,
        degSoft,
        degMedium,
        degHard,
      };
    }
    const w =
      COMPOUND_WINDOWS.find((w) => this.weather.trackTempEstimate < w.max) ??
      COMPOUND_WINDOWS.at(-1);
    return {
      compound: w.compound,
      status: w.status,
      reason: w.reason,
      degSoft,
      degMedium,
      degHard,
    };
  }

  calculateAeroSetup() {
    const base = AERO_BASE[this.circuit.baseDownforce] ?? AERO_BASE["Medium"];
    let front = base.front;
    let rear = base.rear;
    let status = "optimal";
    const notes = [];

    if (this.weather.windSpeed > 70) {
      front += 2;
      rear += 2;
      status = "warning";
      notes.push(
        "SEVERE CROSSWIND — additional downforce. Significant lap time variation expected.",
      );
    } else if (this.weather.windSpeed > 40) {
      front += 1;
      rear += 1;
      notes.push(
        "CROSSWIND RISK — +1° applied. Monitor high-speed entry stability.",
      );
    }

    if (this.weather.isRaining) {
      front += 2;
      rear += 2;
      status = "warning";
      notes.push("WET CONFIGURATION — maximum downforce for traction.");
    }

    front = Math.max(1, Math.min(20, front));
    rear = Math.max(1, Math.min(22, rear));

    if (!notes.length)
      notes.push(
        `${this.circuit.baseDownforce.toUpperCase()} DOWNFORCE — baseline for ${this.circuit.shortName}. Drag: ${dragLabel(front + rear)}.`,
      );

    return {
      frontWingAngle: front,
      rearWingAngle: rear,
      drsEnabled: this.circuit.id !== "monaco",
      dragCoefficient: dragLabel(front + rear),
      notes: notes.join(" "),
      status,
    };
  }

  calculateWetStrategy() {
    const { isRaining, rain1h, visibility } = this.weather;
    if (!isRaining && rain1h < 0.1)
      return {
        required: false,
        recommendation: "DRY CONDITIONS — STANDARD SETUP",
        status: "optimal",
      };

    if (rain1h >= 2)
      return {
        required: true,
        compound: "FULL WET",
        pitWindow: "PIT IMMEDIATELY — CONDITIONS CRITICAL",
        visibilityRisk: "HIGH",
        aquaplaningRisk: rain1h > 5 ? "CRITICAL" : "MEDIUM",
        brakesBias: "FRONT +2% (wet bias for stability)",
        engineMap: "RAIN MAP — REDUCED POWER DELIVERY",
        recommendation: `Full wet mandatory. Rain: ${rain1h.toFixed(1)}mm/h.`,
        status: "critical",
      };

    return {
      required: true,
      compound: "INTERMEDIATE",
      pitWindow: "MONITOR — INTERMEDIATE VIABLE",
      visibilityRisk: visibility < 5 ? "HIGH" : "LOW",
      aquaplaningRisk: "LOW",
      brakesBias: "FRONT +2% (wet bias for stability)",
      engineMap: "RAIN MAP — REDUCED POWER DELIVERY",
      recommendation: `Light rain at ${rain1h.toFixed(1)}mm/h — intermediate viable. Slick tyres on standby.`,
      status: "warning",
    };
  }

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

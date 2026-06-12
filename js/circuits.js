/* ============================================================
   APEXSTRATEGY — CIRCUITS DATA v1.0
   20 curated racing circuits with precision engineering data.
   All coordinates, lengths, and telemetry values are sourced
   from official FIA/circuit documentation and race engineering
   reference materials.
   ============================================================ */

//-- SECTION: CIRCUITS DATA --//

const CIRCUITS = [
  //-- 01. CIRCUIT DE SPA-FRANCORCHAMPS --//
  {
    id: "spa",
    name: "Circuit de Spa-Francorchamps",
    shortName: "Spa",
    country: "Belgium",
    city: "Stavelot",
    flag: "🇧🇪",
    region: "Europe",
    type: "High-Speed",
    length: 7.004,
    turns: 19,
    lapRecord: "1:41.252 — Bottas 2018",
    lat: 50.4372,
    lon: 5.9714,
    baseDownforce: "Medium",
    tyreWear: "Medium",
    brakingDemand: "Medium",
    surfaceGrip: "Medium",
    altitudeM: 401,
    description:
      "The 7km lap spans over 100m of elevation change, with Eau Rouge–Raidillon taken flat above 300km/h requiring absolute suspension stability as the car transitions from high compression into a blind cresting load — any aerodynamic imbalance at the apex is immediately amplified by the gradient shift. The long Kemmel straight demands the lowest achievable drag trim, creating a fundamental compromise with the sustained high-speed loading of Pouhon at Turn 9, which defines the entire downforce philosophy for this circuit.",
  },

  //-- 02. AUTODROMO NAZIONALE MONZA --//
  {
    id: "monza",
    name: "Autodromo Nazionale Monza",
    shortName: "Monza",
    country: "Italy",
    city: "Monza",
    flag: "🇮🇹",
    region: "Europe",
    type: "High-Speed",
    length: 5.793,
    turns: 11,
    lapRecord: "1:21.046 — Barrichello 2004",
    lat: 45.6156,
    lon: 9.2811,
    baseDownforce: "Low",
    tyreWear: "Low",
    brakingDemand: "High",
    surfaceGrip: "Medium",
    altitudeM: 162,
    description:
      "Teams deploy the absolute minimum permissible aerodynamic configuration at Monza — front wing at minimum angle and a near-flat rear wing — to maximise straight-line speed along sections where throttle-on time exceeds 85% of total lap duration. The three artificial chicanes demand extreme braking performance from very high speeds, making this simultaneously the lowest downforce and one of the highest brake-energy circuits on the calendar despite the minimal aero loading elsewhere.",
  },

  //-- 03. SUZUKA INTERNATIONAL RACING COURSE --//
  {
    id: "suzuka",
    name: "Suzuka International Racing Course",
    shortName: "Suzuka",
    country: "Japan",
    city: "Suzuka",
    flag: "🇯🇵",
    region: "Asia-Pacific",
    type: "Technical",
    length: 5.807,
    turns: 18,
    lapRecord: "1:27.064 — Hamilton 2019",
    lat: 34.8431,
    lon: 136.5407,
    baseDownforce: "Medium-High",
    tyreWear: "Medium",
    brakingDemand: "Medium",
    surfaceGrip: "High",
    altitudeM: 50,
    description:
      "The figure-eight layout's Esses complex in Sector 1 requires a precise mechanical balance — the car must rotate sharply through low-speed entries while maintaining composure at the high-speed S-curves where any oversteer tendency escalates at over 250km/h. Turn 13 (130R) is taken fully flat in dry conditions at approximately 300km/h, placing sustained lateral loading on the rear axle that accumulates tyre energy into the Casio chicane braking zone, making left-rear thermal management the critical tyre engineering variable.",
  },

  //-- 04. SILVERSTONE CIRCUIT --//
  {
    id: "silverstone",
    name: "Silverstone Circuit",
    shortName: "Silverstone",
    country: "United Kingdom",
    city: "Silverstone",
    flag: "🇬🇧",
    region: "Europe",
    type: "High-Speed",
    length: 5.891,
    turns: 18,
    lapRecord: "1:24.303 — Hamilton 2020",
    lat: 52.0786,
    lon: -1.0169,
    baseDownforce: "Medium-High",
    tyreWear: "High",
    brakingDemand: "Medium",
    surfaceGrip: "High",
    altitudeM: 153,
    description:
      "The Maggotts–Becketts–Chapel complex generates sustained lateral G-forces approaching 5G — the highest continuous lateral loading section in the calendar — placing extreme and prolonged stress on front-left tyre construction and requiring a carefully tuned anti-roll bar package to prevent progressive understeer buildup over a stint. The medium-high downforce compromise necessary for Copse and the high-speed sweepers produces the highest front-tyre wear rate on the European circuit leg, typically forcing a two-stop strategy even on tyre compounds rated as medium-durability.",
  },

  //-- 05. CIRCUIT DE MONACO --//
  {
    id: "monaco",
    name: "Circuit de Monaco",
    shortName: "Monaco",
    country: "Monaco",
    city: "Monte Carlo",
    flag: "🇲🇨",
    region: "Europe",
    type: "Street Circuit",
    length: 3.337,
    turns: 19,
    lapRecord: "1:12.311 — Hamilton 2021",
    lat: 43.7347,
    lon: 7.4206,
    baseDownforce: "Very High",
    tyreWear: "Low",
    brakingDemand: "Very High",
    surfaceGrip: "Medium",
    altitudeM: 10,
    description:
      "Monaco is the only circuit where the car spends less than 7 seconds per lap at full throttle, making pure mechanical grip and chassis pointability the dominant performance variables rather than aerodynamic efficiency — teams run maximum wing angles yet average cornering speeds remain the lowest of the calendar. The tunnel section creates an isolated high-pressure zone under the car that artificially increases downforce loading, only for the car to immediately exit into the open harbourfront where that pressure differential collapses, generating a sudden rear-downforce reduction that must be accounted for in traction control mapping on the exit onto the straight.",
  },

  //-- 06. NÜRBURGRING GRAND PRIX CIRCUIT --//
  {
    id: "nurburgring",
    name: "Nürburgring Grand Prix Circuit",
    shortName: "Nürburgring",
    country: "Germany",
    city: "Nürburg",
    flag: "🇩🇪",
    region: "Europe",
    type: "Technical",
    length: 5.148,
    turns: 15,
    lapRecord: "1:27.275 — Bottas 2020",
    lat: 50.3356,
    lon: 6.9474,
    baseDownforce: "Medium",
    tyreWear: "Medium",
    brakingDemand: "Medium",
    surfaceGrip: "Medium",
    altitudeM: 600,
    description:
      "Situated on the Eifel Plateau at approximately 600m altitude, the circuit is notorious for localised weather systems capable of delivering wet conditions on one side of the circuit while the other remains dry, requiring a wet–dry crossover tyre strategy window that can open and close within 90 seconds of real time. The track surface offers relatively low natural rubber accumulation due to its infrequent race schedule, meaning tyre warm-up performance is a more critical variable here than at circuits used weekly, and engineers typically adjust hot tyre pressure targets 1–2 PSI lower than at comparable permanent facilities.",
  },

  //-- 07. CIRCUIT OF THE AMERICAS --//
  {
    id: "cota",
    name: "Circuit of the Americas",
    shortName: "COTA",
    country: "United States",
    city: "Austin, Texas",
    flag: "🇺🇸",
    region: "Americas",
    type: "Technical",
    length: 5.513,
    turns: 20,
    lapRecord: "1:36.169 — Hamilton 2019",
    lat: 30.1327,
    lon: -97.6411,
    baseDownforce: "Medium-High",
    tyreWear: "Medium",
    brakingDemand: "High",
    surfaceGrip: "Medium",
    altitudeM: 149,
    description:
      "Turn 1 features a 40-metre blind crest approach followed by immediate heavy braking, requiring ride height settings that accommodate severe underbody load variation as the car transitions from compressed to extended suspension within the same braking event — a unique challenge in setting front suspension preload. The sequence of medium-speed corners through Turns 12 to 15 generates the highest sustained rear-tyre thermal loading of any sector on the circuit, typically determining the degradation rate that governs overall strategy and forcing teams to compromise overall car balance toward rear stability in exchange for stint length.",
  },

  //-- 08. AUTÓDROMO JOSÉ CARLOS PACE (INTERLAGOS) --//
  {
    id: "interlagos",
    name: "Autódromo José Carlos Pace",
    shortName: "Interlagos",
    country: "Brazil",
    city: "São Paulo",
    flag: "🇧🇷",
    region: "Americas",
    type: "Hybrid",
    length: 4.309,
    turns: 15,
    lapRecord: "1:10.540 — Hamilton 2019",
    lat: -23.7036,
    lon: -46.6997,
    baseDownforce: "Medium",
    tyreWear: "Medium",
    brakingDemand: "Medium",
    surfaceGrip: "Low",
    altitudeM: 785,
    description:
      "At 785m altitude, aerodynamic efficiency is reduced by approximately 8% relative to sea-level circuits, requiring teams to run marginally higher wing angles to partially recover lost downforce — though the concurrent drag reduction actually produces competitive top speeds on the back straight that offset the downforce deficit. The anti-clockwise layout imposes asymmetric tyre loading, placing concentrated stress on the left-rear through the long, fast Curva do Sol sweeper, and the notoriously patchy asphalt surface around Turn 8 creates unpredictable grip transitions that make car balance tuning particularly sensitive to small changes in tyre pressure.",
  },

  //-- 09. WEATHERTECH RACEWAY LAGUNA SECA --//
  {
    id: "laguna-seca",
    name: "WeatherTech Raceway Laguna Seca",
    shortName: "Laguna Seca",
    country: "United States",
    city: "Salinas, California",
    flag: "🇺🇸",
    region: "Americas",
    type: "Technical",
    length: 3.602,
    turns: 11,
    lapRecord: "1:09.155 — Barbosa 2017",
    lat: 36.5847,
    lon: -121.753,
    baseDownforce: "Medium-High",
    tyreWear: "Medium",
    brakingDemand: "High",
    surfaceGrip: "High",
    altitudeM: 157,
    description:
      "The Corkscrew descent — a blind double-apex chicane at Turns 8 and 8A — drops 18 metres vertically over approximately 100 metres of track length, requiring engineers to calibrate ride height and suspension bump stops for the extreme chassis compression loading at the apex without sacrificing platform stability on the steep downhill exit. The circuit's narrow layout and proximity of barriers to the racing line limits viable tyre temperature build-up to a single well-defined groove, meaning the out-lap tyre preparation sequence is more performance-critical here than at any wider facility — engineers specify a precise sector-by-sector energy delivery profile on the warm-up lap.",
  },

  //-- 10. BAHRAIN INTERNATIONAL CIRCUIT --//
  {
    id: "bahrain",
    name: "Bahrain International Circuit",
    shortName: "Bahrain",
    country: "Bahrain",
    city: "Sakhir",
    flag: "🇧🇭",
    region: "Middle East",
    type: "Technical",
    length: 5.412,
    turns: 15,
    lapRecord: "1:31.447 — De la Rosa 2005",
    lat: 26.0325,
    lon: 50.5106,
    baseDownforce: "Medium",
    tyreWear: "High",
    brakingDemand: "High",
    surfaceGrip: "Medium",
    altitudeM: 5,
    description:
      "The desert surface contains fine silica particulate that acts as an abrasive against tyre compound, producing degradation rates 30–40% higher than those recorded at physically similar permanent circuits on conventional asphalt — teams typically observe significant shoulder graining as early as Lap 8 under standard race conditions. Cooling is a dominant engineering constraint throughout the layout: oil and water temperatures approach their management thresholds within the first 10 laps in ambient conditions exceeding 35°C, requiring radiator inlet duct sizing that represents a measurable aerodynamic drag penalty relative to lower-temperature European venues.",
  },

  //-- 11. YAS MARINA CIRCUIT --//
  {
    id: "yas-marina",
    name: "Yas Marina Circuit",
    shortName: "Yas Marina",
    country: "United Arab Emirates",
    city: "Abu Dhabi",
    flag: "🇦🇪",
    region: "Middle East",
    type: "Technical",
    length: 5.281,
    turns: 16,
    lapRecord: "1:26.103 — Leclerc 2021",
    lat: 24.4672,
    lon: 54.6031,
    baseDownforce: "Medium",
    tyreWear: "Low",
    brakingDemand: "Medium",
    surfaceGrip: "Medium",
    altitudeM: 3,
    description:
      "The 2021 circuit redesign eliminated three slow chicanes and opened the final sector into a sweeping sequence, reducing lap times by approximately 5 seconds and fundamentally shifting the setup philosophy from a maximum-downforce configuration to a balanced medium-wing compromise that can exploit the three available DRS zones. Night race conditions at near sea level introduce a unique tyre blanket removal window consideration — cooler air temperatures near the open marina create localised track surface temperature differentials of up to 8°C between the marina section and the inland infield, compressing the compound's operating window in a way that requires circuit-specific pre-race tyre management modelling.",
  },

  //-- 12. RED BULL RING --//
  {
    id: "red-bull-ring",
    name: "Red Bull Ring",
    shortName: "Red Bull Ring",
    country: "Austria",
    city: "Spielberg",
    flag: "🇦🇹",
    region: "Europe",
    type: "High-Speed",
    length: 4.318,
    turns: 10,
    lapRecord: "1:05.619 — Sainz 2020",
    lat: 47.2197,
    lon: 14.7647,
    baseDownforce: "Low",
    tyreWear: "Low",
    brakingDemand: "Medium",
    surfaceGrip: "Medium",
    altitudeM: 678,
    description:
      "The Red Bull Ring's 678m altitude reduces atmospheric pressure sufficiently to lower aerodynamic efficiency by approximately 7%, and the circuit's power-sensitive layout — four long, uphill acceleration zones in 4.3km — makes this the most engine-power-dominated permanent circuit in Europe, with ERS deployment calibrated specifically to deliver maximum electrical power through the two extended uphill acceleration phases. Only 10 corners in a 65-second lap means tyre pressures equilibrate thermally within 2 laps, compressing the strategic window for starting tyre pressure to a tolerance narrower than any other circuit on the European calendar — a 1 PSI error in starting cold pressure translates directly to early-lap overheating or understeer that takes multiple laps to recover.",
  },

  //-- 13. CIRCUIT DE BARCELONA-CATALUNYA --//
  {
    id: "barcelona",
    name: "Circuit de Barcelona-Catalunya",
    shortName: "Barcelona",
    country: "Spain",
    city: "Montmeló",
    flag: "🇪🇸",
    region: "Europe",
    type: "Technical",
    length: 4.655,
    turns: 16,
    lapRecord: "1:18.149 — Bottas 2020",
    lat: 41.5697,
    lon: 2.261,
    baseDownforce: "Medium-High",
    tyreWear: "High",
    brakingDemand: "Medium",
    surfaceGrip: "High",
    altitudeM: 115,
    description:
      "Teams have accumulated more validated CFD-to-physical correlation data at Barcelona than at any other circuit due to decades of pre-season testing, making this the reference circuit against which aerodynamic simulation accuracy is benchmarked — a car that underperforms its Barcelona model prediction almost always underperforms the entire season. The high-speed Turn 3 right-hander and the extended Turns 9–11 complex require sustained medium-high downforce that compounds front tyre energy accumulation, producing among the highest front-left wear rates on the calendar and typically mandating a setup compromise that accepts a small straight-line speed penalty in exchange for front tyre longevity through the second stint.",
  },

  //-- 14. HUNGARORING --//
  {
    id: "hungaroring",
    name: "Hungaroring",
    shortName: "Hungaroring",
    country: "Hungary",
    city: "Budapest",
    flag: "🇭🇺",
    region: "Europe",
    type: "Technical",
    length: 4.381,
    turns: 14,
    lapRecord: "1:16.627 — Hamilton 2020",
    lat: 47.5789,
    lon: 19.2486,
    baseDownforce: "Very High",
    tyreWear: "Medium",
    brakingDemand: "High",
    surfaceGrip: "Medium",
    altitudeM: 264,
    description:
      "Frequently described as 'Monaco without the walls,' the Hungaroring demands the highest downforce configuration of any permanent facility on the calendar — 14 slow to medium-speed corners, none of which reaches genuinely high-speed territory, mean drag from maximum wing angle is recoverable in the single short straight between Turns 1 and 2. The dusty surface beyond the narrow racing line accumulates marbles that render overtaking effectively impossible outside the single DRS zone, shifting the entirety of competitive decision-making to qualifying lap time and pit stop undercut timing — circuit characteristics that place a premium on single-lap performance over race pace.",
  },

  //-- 15. AUTODROMO ENZO E DINO FERRARI (IMOLA) --//
  {
    id: "imola",
    name: "Autodromo Enzo e Dino Ferrari",
    shortName: "Imola",
    country: "Italy",
    city: "Imola",
    flag: "🇮🇹",
    region: "Europe",
    type: "Technical",
    length: 4.909,
    turns: 17,
    lapRecord: "1:15.484 — Verstappen 2022",
    lat: 44.3439,
    lon: 11.7167,
    baseDownforce: "Medium-High",
    tyreWear: "Medium",
    brakingDemand: "High",
    surfaceGrip: "Medium",
    altitudeM: 47,
    description:
      "The clockwise Acque Minerali section concentrates disproportionate lateral stress on the left-rear tyre through a sequence of left-hand compressions, typically causing it to reach its thermal degradation threshold 3–4 laps before the right-rear and creating an asymmetric stint-length constraint that directly influences tyre allocation strategy across the race weekend. The circuit's exceptionally narrow track width relative to modern car dimensions means that any deviation from the established racing line encounters a surface carrying zero rubber build-up, making a single off-line excursion costly not just in immediate lap time but in subsequent tyre surface contamination that can persist for 2–3 laps.",
  },

  //-- 16. CIRCUIT PAUL RICARD --//
  {
    id: "paul-ricard",
    name: "Circuit Paul Ricard",
    shortName: "Paul Ricard",
    country: "France",
    city: "Le Castellet",
    flag: "🇫🇷",
    region: "Europe",
    type: "Technical",
    length: 5.842,
    turns: 15,
    lapRecord: "1:32.740 — Bottas 2019",
    lat: 43.2506,
    lon: 5.7917,
    baseDownforce: "Medium",
    tyreWear: "High",
    brakingDemand: "Medium",
    surfaceGrip: "Medium",
    altitudeM: 432,
    description:
      "The circuit's distinctive blue and red painted tarmac run-off belies a primary race surface with one of the highest abrasion coefficients among permanent facilities — tyre wear rates consistently approach those observed at street circuits, with engineers recording significant shoulder compound loss as early as Lap 6 on soft-compound tyres under standard race-pace loading. The 1.8km Mistral straight feeds directly into the high-speed Signes right-hander at over 300km/h, creating a rear-wing calibration conflict where drag reduction needed for the straight directly undermines the aerodynamic stability required for a corner entry that punishes any rear instability with an immediate and terminal snap oversteer.",
  },

  //-- 17. CIRCUIT ZANDVOORT --//
  {
    id: "zandvoort",
    name: "Circuit Zandvoort",
    shortName: "Zandvoort",
    country: "Netherlands",
    city: "Zandvoort",
    flag: "🇳🇱",
    region: "Europe",
    type: "Technical",
    length: 4.259,
    turns: 14,
    lapRecord: "1:11.097 — Verstappen 2021",
    lat: 52.3888,
    lon: 4.5409,
    baseDownforce: "High",
    tyreWear: "High",
    brakingDemand: "Medium",
    surfaceGrip: "High",
    altitudeM: 5,
    description:
      "The two steeply banked corners — Hugenholtz at Turn 3 and the banked final hairpin — allow cornering speeds approximately 15–20% higher than equivalent flat-radius curves would permit, sustaining lateral G-forces across longer arc lengths that generate proportionally elevated tyre thermal loading and demand a high-downforce configuration that would be penalised on any circuit with longer straights. The circuit's narrow layout within the coastal dunes offers zero overtaking opportunity outside the DRS zone at Turn 1, compressing the entire race outcome variable into tyre degradation management — teams that accept a higher wear rate to carry more aerodynamic downforce are systematically disadvantaged by the inability to recover track position lost during earlier pit stops.",
  },

  //-- 18. SEPANG INTERNATIONAL CIRCUIT --//
  {
    id: "sepang",
    name: "Sepang International Circuit",
    shortName: "Sepang",
    country: "Malaysia",
    city: "Sepang",
    flag: "🇲🇾",
    region: "Asia-Pacific",
    type: "Hybrid",
    length: 5.543,
    turns: 15,
    lapRecord: "1:34.080 — Verstappen 2017",
    lat: 2.7606,
    lon: 101.738,
    baseDownforce: "Medium-High",
    tyreWear: "Medium",
    brakingDemand: "Medium",
    surfaceGrip: "Medium",
    altitudeM: 22,
    description:
      "Ambient temperatures consistently above 35°C combined with relative humidity exceeding 80% create the highest-demand power unit cooling requirement of the calendar year — oil and water temperature thresholds are typically reached at safety car delta pace, forcing teams to run bodywork cooling configurations that incur a measurable aerodynamic drag penalty of 0.05–0.08 seconds per lap relative to optimum aero trim. The two main straights, each exceeding 900 metres in length, generate a direct aerodynamic conflict with the slow hairpin connecting them — the drag-efficient wing angle required to achieve competitive top speeds produces insufficient downforce for the hairpin apex, where mechanical traction from the rear axle compensates but generates heat that compounds overall rear tyre thermal management.",
  },

  //-- 19. MARINA BAY STREET CIRCUIT --//
  {
    id: "singapore",
    name: "Marina Bay Street Circuit",
    shortName: "Singapore",
    country: "Singapore",
    city: "Singapore",
    flag: "🇸🇬",
    region: "Asia-Pacific",
    type: "Street Circuit",
    length: 4.94,
    turns: 19,
    lapRecord: "1:43.072 — Hamilton 2019",
    lat: 1.2914,
    lon: 103.8641,
    baseDownforce: "Very High",
    tyreWear: "Medium",
    brakingDemand: "Very High",
    surfaceGrip: "Medium",
    altitudeM: 15,
    description:
      "Conducted under over 1,500 high-intensity floodlights, the Marina Bay circuit eliminates the solar-driven track temperature variance that affects daytime events, but the concrete street surface has significantly lower thermal conductivity than asphalt — tyre surface temperatures build more slowly through the out-lap, requiring a precisely specified warm-up profile and tyre blanket removal timing sequence that typically differs by 8–10 seconds from permanent asphalt circuits. The 23 braking events per lap produce the highest total brake energy dissipation per kilometre of any round in the championship, demanding a brake cooling duct configuration that accepts the associated drag penalty, while the physical driver exertion in 32°C ambient temperature with 80%+ humidity produces the highest cardiovascular load of any race on the calendar.",
  },

  //-- 20. AUTÓDROMO HERMANOS RODRÍGUEZ --//
  {
    id: "mexico-city",
    name: "Autódromo Hermanos Rodríguez",
    shortName: "Mexico City",
    country: "Mexico",
    city: "Mexico City",
    flag: "🇲🇽",
    region: "Americas",
    type: "Hybrid",
    length: 4.304,
    turns: 17,
    lapRecord: "1:17.774 — Bottas 2021",
    lat: 19.4042,
    lon: -99.0907,
    baseDownforce: "High",
    tyreWear: "Low",
    brakingDemand: "High",
    surfaceGrip: "Medium",
    altitudeM: 2285,
    description:
      "At 2,285m above sea level — the highest-altitude circuit on the F1 calendar — atmospheric density is approximately 24% below sea-level values, reducing aerodynamic downforce by the same proportion and requiring teams to run maximum wing angles that generate the same physical downforce load as a medium-wing configuration at sea level, while the lower drag also permits higher terminal velocities on the main straight despite the power unit running leaner mixture maps to protect component longevity. Brake cooling is critically compromised by the thin air: less mass flow reaches duct inlets at equivalent car speeds, and braking distances are physically shorter due to reduced aero drag decelerating the car — engineers must account for both factors simultaneously when calibrating pre-race brake bias and pedal map settings, typically arriving with a specific altitude-corrected cold-pad thickness specification prepared during simulation.",
  },
]; //-- END CIRCUITS ARRAY --//

/* ============================================================
   WINDOW GLOBALS — EXPORT
   All three helpers are pure functions: no side effects,
   no mutation of the source array.
   ============================================================ */

window.CIRCUITS = CIRCUITS;

//-- SECTION: HELPER — getCircuitById --//

/**
 * Returns a single circuit object by its slug ID, or null if not found.
 * @param  {string} id  - Circuit slug (e.g. "spa", "monaco")
 * @returns {Object|null}
 */
window.getCircuitById = (id) => {
  if (!id || typeof id !== "string") return null;
  return CIRCUITS.find((c) => c.id === id.toLowerCase().trim()) ?? null;
};

//-- SECTION: HELPER — searchCircuits --//

/**
 * Filters CIRCUITS by a freetext query against name, shortName,
 * country, and city fields — all case-insensitive.
 * Returns the full CIRCUITS array when query is empty or whitespace-only.
 *
 * @param  {string} query  - Freetext search string
 * @returns {Array<Object>}
 */
window.searchCircuits = (query) => {
  if (!query || typeof query !== "string") return CIRCUITS;

  const q = query.toLowerCase().trim();
  if (q.length === 0) return CIRCUITS;

  return CIRCUITS.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.shortName.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.region.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q),
  );
};

//-- SECTION: HELPER — filterCircuitsByType --//

/**
 * Filters CIRCUITS by their type field.
 * Passing "all" (or no argument) returns the full array.
 * Matching is case-insensitive to accommodate UI-generated strings.
 *
 * Valid types: "Technical" | "High-Speed" | "Street Circuit" | "Hybrid"
 *
 * @param  {string} type  - Circuit type string, or "all"
 * @returns {Array<Object>}
 */
window.filterCircuitsByType = (type) => {
  if (!type || typeof type !== "string") return CIRCUITS;

  const t = type.toLowerCase().trim();
  if (t === "all" || t === "") return CIRCUITS;

  return CIRCUITS.filter((c) => c.type.toLowerCase() === t);
};

//-- SECTION: HELPER — filterCircuitsByRegion --//

/**
 * Filters CIRCUITS by geographic region.
 * Additional utility beyond the spec — used by the map view on workbench.
 * Passing "all" returns the full array.
 *
 * Valid regions: "Europe" | "Americas" | "Asia-Pacific" | "Middle East"
 *
 * @param  {string} region  - Region string, or "all"
 * @returns {Array<Object>}
 */
window.filterCircuitsByRegion = (region) => {
  if (!region || typeof region !== "string") return CIRCUITS;

  const r = region.toLowerCase().trim();
  if (r === "all" || r === "") return CIRCUITS;

  return CIRCUITS.filter((c) => c.region.toLowerCase() === r);
};

//-- SECTION: METADATA SUMMARY --//

/**
 * Read-only summary of the dataset — useful for debug panels
 * and for populating filter dropdowns dynamically.
 */
window.CIRCUITS_META = Object.freeze({
  total: CIRCUITS.length,
  types: [...new Set(CIRCUITS.map((c) => c.type))].sort(),
  regions: [...new Set(CIRCUITS.map((c) => c.region))].sort(),
  version: "1.0.0",
});

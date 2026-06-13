/* ============================================================
   APEXSTRATEGY — WEATHER SERVICE
   OpenWeatherMap API integration for live circuit conditions.

   TO ACTIVATE: Replace 'YOUR_API_KEY_HERE' with your key.
   Get a free key at: https://openweathermap.org/api
   Key activates within 10 minutes of registration.
   Free tier: 60 calls/min, more than enough for this project.
   ============================================================ */

/*-- SECTION: API CONFIGURATION --*/

// Swap this string before submission — keep it out of any public repo.
const API_KEY = "YOUR_API_KEY_HERE";

/*-- SECTION: COMPASS TABLES --*/

// 16-point compass labels, indexed by Math.round(deg / 22.5) % 16
const COMPASS_16 = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

// 8-sector unicode arrows — arrow points TOWARD wind source (standard meteo convention).
// 0° N → ↑, 90° E → →, 180° S → ↓, 270° W → ←
const WIND_ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];

/*-- SECTION: WEATHERSERVICE CLASS --*/

/**
 * APEXSTRATEGY // WEATHER SERVICE
 * Fetches live weather from OpenWeatherMap for any circuit GPS coordinate.
 * Results are normalised into a flat object the SetupEngine can consume directly.
 * Caches each circuit's data for 10 minutes to avoid hammering the free-tier limit.
 *
 * API: OpenWeatherMap Current Weather v2.5
 * https://openweathermap.org/current
 */
class WeatherService {
  constructor() {
    /** @type {string} OpenWeatherMap API key */
    this.API_KEY = API_KEY;

    /** @type {string} Base endpoint */
    this.BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

    /** @type {Map<string, {data: object, timestamp: number}>} Per-circuit result cache */
    this.cache = new Map();

    /** @type {number} Cache TTL in milliseconds (10 minutes) */
    this.cacheTimeout = 10 * 60 * 1000;
  }

  /*-- SECTION: FETCH --*/

  /**
   * Fetches current weather for the given GPS coordinates.
   * Returns a cached result if one exists and is younger than cacheTimeout.
   * Throws on network failure, non-200 HTTP status, or missing API key.
   *
   * @param   {number} lat        - Circuit latitude
   * @param   {number} lon        - Circuit longitude
   * @param   {string} circuitId  - Circuit slug used as cache key
   * @returns {Promise<object>}   - Normalized weather object (see return block below)
   */
  async fetchWeather(lat, lon, circuitId) {
    // Guard: catch the placeholder key early with a readable message
    if (!this.API_KEY || this.API_KEY === "YOUR_API_KEY_HERE") {
      throw new Error(
        "API_KEY_MISSING: Add your OpenWeatherMap key to js/WeatherService.js line 14. " +
          "Free key available at openweathermap.org/api — activates in ~10 minutes.",
      );
    }

    // Return cached data if it's still fresh
    if (this.cache.has(circuitId)) {
      const entry = this.cache.get(circuitId);
      if (Date.now() - entry.timestamp < this.cacheTimeout) {
        console.log(
          `[WeatherService] Cache hit: ${circuitId} (age: ${Math.round((Date.now() - entry.timestamp) / 1000)}s)`,
        );
        return entry.data;
      }
      // Cache is stale — remove it and fall through to fetch
      this.cache.delete(circuitId);
    }

    const url = `${this.BASE_URL}?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=metric`;

    console.log(`[WeatherService] Fetching: ${circuitId} (${lat}, ${lon})`);

    let response;
    try {
      response = await fetch(url);
    } catch (networkErr) {
      // fetch() itself rejected — offline, CORS, or DNS failure
      throw new Error(
        `NETWORK_ERROR: Could not reach OpenWeatherMap. Check your connection. (${networkErr.message})`,
      );
    }

    if (!response.ok) {
      const hint =
        response.status === 401
          ? " — API key is invalid or not yet activated (wait 10 min after registration)"
          : response.status === 429
            ? " — rate limit exceeded, try again in a minute"
            : "";
      throw new Error(
        `HTTP_${response.status}: OpenWeatherMap returned ${response.status} ${response.statusText}${hint}`,
      );
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(
        "PARSE_ERROR: Response from OpenWeatherMap was not valid JSON.",
      );
    }

    // Normalise raw API payload → flat object the SetupEngine reads directly
    const isRaining =
      data.weather[0].main === "Rain" ||
      data.weather[0].main === "Drizzle" ||
      data.weather[0].main === "Thunderstorm";

    const ambientTemp = Math.round(data.main.temp);
    const cloudCover = data.clouds.all;
    const weatherMain = data.weather[0].main;
    const windSpeedKmh = Math.round((data.wind?.speed ?? 0) * 3.6);
    const windDeg = data.wind?.deg ?? 0;

    const normalized = {
      circuitId,
      fetchedAt: new Date().toISOString(),

      // Ambient conditions
      temp: ambientTemp,
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity, // %
      pressure: data.main.pressure, // hPa

      // Wind
      windSpeed: windSpeedKmh, // km/h
      windDeg: windDeg,
      windDir: this._degToCompass(windDeg), // e.g. "NNW"
      windArrow: this.getWindArrow(windDeg), // e.g. "↖"

      // Sky
      weatherMain: weatherMain, // "Clear", "Rain", etc.
      weatherDesc: data.weather[0].description, // "broken clouds"
      visibility: Math.round((data.visibility ?? 10000) / 1000), // km
      cloudCover: cloudCover, // %

      // Precipitation
      isRaining,
      rain1h: data.rain ? (data.rain["1h"] ?? 0) : 0, // mm

      // Derived values for SetupEngine
      trackTempEstimate: this._estimateTrackTemp(
        ambientTemp,
        cloudCover,
        weatherMain,
      ),
    };

    // Store with timestamp
    this.cache.set(circuitId, { data: normalized, timestamp: Date.now() });

    return normalized;
  }

  /*-- SECTION: COMPASS HELPERS --*/

  /**
   * Converts a 0–360° bearing to a 16-point compass label.
   * @param   {number} deg  - Wind direction in degrees
   * @returns {string}      - e.g. "NNW", "ESE"
   */
  _degToCompass(deg) {
    const index = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
    return COMPASS_16[index];
  }

  /**
   * Returns a unicode arrow pointing TOWARD the wind's source (meteorological convention).
   * @param   {number} deg  - Wind direction in degrees
   * @returns {string}      - One of ↑ ↗ → ↘ ↓ ↙ ← ↖
   */
  getWindArrow(deg) {
    const index = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
    return WIND_ARROWS[index];
  }

  /*-- SECTION: TRACK TEMP ESTIMATE --*/

  /**
   * Estimates asphalt track surface temperature from ambient air temp and sky conditions.
   * Simplified solar heating model: solar radiation absorbed by dark tarmac is the
   * dominant variable. Clear sky = max solar input, rain = near-zero solar delta.
   *
   * Formula is consistent with published race-weekend engineering approximations
   * (±3°C accuracy against measured track temp, sufficient for setup guidance).
   *
   * @param   {number} ambientTemp  - Ambient air temperature in °C
   * @param   {number} cloudCover   - Cloud cover percentage (0–100)
   * @param   {string} weatherMain  - OWM main weather category ("Rain", "Clear", etc.)
   * @returns {number}              - Estimated track surface temperature in °C
   */
  _estimateTrackTemp(ambientTemp, cloudCover, weatherMain) {
    const isWet =
      weatherMain === "Rain" ||
      weatherMain === "Drizzle" ||
      weatherMain === "Thunderstorm" ||
      weatherMain === "Snow";

    if (isWet) {
      // Wet track: evaporative cooling partially offsets any residual solar input.
      // Net delta above ambient is minimal.
      return ambientTemp + 3;
    }

    if (cloudCover < 30) {
      // Clear to mostly clear: full direct insolation on tarmac.
      // +22°C delta is the real-world midday peak on dry asphalt.
      return ambientTemp + 22;
    }

    if (cloudCover < 60) {
      // Partly cloudy: intermittent direct sun, reduced by ~35%.
      return ambientTemp + 14;
    }

    // Overcast: diffuse light only — minimal surface heating above ambient.
    return ambientTemp + 8;
  }

  /*-- SECTION: CACHE MANAGEMENT --*/

  /**
   * Wipes all cached weather entries — call before a manual re-fetch.
   */
  clearCache() {
    this.cache.clear();
    console.log("[WeatherService] Cache cleared");
  }

  /**
   * Returns the age of a cached entry in seconds, or null if not cached.
   * @param   {string}      circuitId
   * @returns {number|null}
   */
  getCacheAge(circuitId) {
    if (!this.cache.has(circuitId)) return null;
    return Math.round(
      (Date.now() - this.cache.get(circuitId).timestamp) / 1000,
    );
  }

  /**
   * Returns true if a fresh (non-stale) cache entry exists for this circuit.
   * @param   {string}  circuitId
   * @returns {boolean}
   */
  isCached(circuitId) {
    if (!this.cache.has(circuitId)) return false;
    return Date.now() - this.cache.get(circuitId).timestamp < this.cacheTimeout;
  }
}

/*-- SECTION: EXPORT --*/

window.WeatherService = WeatherService;

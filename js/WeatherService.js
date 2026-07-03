/* ============================================================
   APEXSTRATEGY — WEATHER SERVICE  (ES6 module)

   Key handling switches by environment:
     • Local dev (localhost / 127.0.0.1) calls OpenWeather directly,
       reading the key from the gitignored js/config.js.
     • Deployed (Vercel) routes through /api/weather — a serverless
       proxy that injects the key server-side (OPENWEATHER_API_KEY env
       var), so the key never ships to the browser or the git repo.

   config.js is imported LAZILY and only in local dev, so its absence
   in production (it's never deployed) can never break this module.
   ============================================================ */

const IS_LOCAL =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "0.0.0.0", ""].includes(
    window.location.hostname,
  );

// Cache the dynamic import promise so config.js is fetched at most once.
let _localKeyPromise = null;
function getLocalKey() {
  if (!_localKeyPromise) {
    _localKeyPromise = import("./config.js")
      .then((m) => m.OPENWEATHER_API_KEY)
      .catch(() => null);
  }
  return _localKeyPromise;
}

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
const WIND_ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];

/*-- SECTION: CLASS --*/

export class WeatherService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Builds the fetch URL for an OpenWeather endpoint ("weather" or
   * "forecast"): the Vercel proxy in production, OpenWeather direct
   * (with the local key) in dev.
   */
  async _resolveUrl(endpoint, lat, lon) {
    if (!IS_LOCAL) {
      return `/api/weather?endpoint=${endpoint}&lat=${lat}&lon=${lon}`;
    }
    const key = await getLocalKey();
    if (!key || key === "YOUR_API_KEY_HERE") {
      throw new Error(
        "API_KEY_MISSING: Add your OpenWeatherMap key to js/config.js for local dev. " +
          "Free key at openweathermap.org/api · activates in ~10 minutes.",
      );
    }
    return `https://api.openweathermap.org/data/2.5/${endpoint}?lat=${lat}&lon=${lon}&appid=${key}&units=metric`;
  }

  async fetchWeather(lat, lon, circuitId) {
    if (this.isCached(circuitId)) {
      const entry = this.cache.get(circuitId);
      console.log(
        `[WeatherService] Cache hit: ${circuitId} (${Math.round((Date.now() - entry.timestamp) / 1000)}s old)`,
      );
      return entry.data;
    }

    const url = await this._resolveUrl("weather", lat, lon);
    console.log(`[WeatherService] Fetching: ${circuitId}`);

    let response;
    try {
      response = await fetch(url);
    } catch (err) {
      throw new Error(
        `NETWORK_ERROR: Could not reach OpenWeatherMap. (${err.message})`,
      );
    }

    if (!response.ok) {
      const hint =
        response.status === 401
          ? " · invalid key or not yet activated (wait 10 min)"
          : response.status === 429
            ? " · rate limit, try again in a minute"
            : "";
      throw new Error(`HTTP_${response.status}: ${response.statusText}${hint}`);
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("PARSE_ERROR: Response was not valid JSON.");
    }

    const isRaining = ["Rain", "Drizzle", "Thunderstorm"].includes(
      data.weather[0].main,
    );
    const ambientTemp = Math.round(data.main.temp);
    const cloudCover = data.clouds.all;
    const windDeg = data.wind?.deg ?? 0;
    const windSpeed = Math.round((data.wind?.speed ?? 0) * 3.6);

    const normalized = {
      circuitId,
      fetchedAt: new Date().toISOString(),
      temp: ambientTemp,
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed,
      windDeg,
      windDir: this._degToCompass(windDeg),
      windArrow: this._getWindArrow(windDeg),
      weatherMain: data.weather[0].main,
      weatherDesc: data.weather[0].description,
      visibility: Math.round((data.visibility ?? 10000) / 1000),
      cloudCover,
      isRaining,
      rain1h: data.rain ? (data.rain["1h"] ?? 0) : 0,
      trackTempEstimate: this._estimateTrackTemp(
        ambientTemp,
        cloudCover,
        data.weather[0].main,
      ),
    };

    this.cache.set(circuitId, { data: normalized, timestamp: Date.now() });
    return normalized;
  }

  _degToCompass(deg) {
    return COMPASS_16[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
  }

  _getWindArrow(deg) {
    return WIND_ARROWS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
  }

  _estimateTrackTemp(ambientTemp, cloudCover, weatherMain) {
    const isWet = ["Rain", "Drizzle", "Thunderstorm", "Snow"].includes(
      weatherMain,
    );
    if (isWet) return ambientTemp + 3;
    if (cloudCover < 30) return ambientTemp + 22;
    if (cloudCover < 60) return ambientTemp + 14;
    return ambientTemp + 8;
  }

  clearCache() {
    this.cache.clear();
    console.log("[WeatherService] Cache cleared");
  }
  getCacheAge(id) {
    return this.cache.has(id)
      ? Math.round((Date.now() - this.cache.get(id).timestamp) / 1000)
      : null;
  }
  isCached(id) {
    return (
      this.cache.has(id) &&
      Date.now() - this.cache.get(id).timestamp < this.cacheTimeout
    );
  }

  /*-- SECTION: WEEKEND FORECAST --*/

  /**
   * Fetches the 5-day / 3-hour forecast and slices out 4 specific
   * session blocks: now, practice (+24h), quali (+48h), race (+72h).
   * @param {number} lat
   * @param {number} lon
   * @param {string} circuitId
   * @returns {Promise<{now, practice, quali, race}>}
   */
  async fetchWeekendForecast(lat, lon, circuitId) {
    const cacheKey = `forecast_${circuitId}`;
    if (this.isCached(cacheKey)) {
      console.log(`[WeatherService] Forecast cache hit: ${circuitId}`);
      return this.cache.get(cacheKey).data;
    }

    const url = await this._resolveUrl("forecast", lat, lon);
    console.log(`[WeatherService] Fetching forecast: ${circuitId}`);

    let response;
    try {
      response = await fetch(url);
    } catch (err) {
      throw new Error(`NETWORK_ERROR: Forecast fetch failed. (${err.message})`);
    }

    if (!response.ok) {
      const hint =
        response.status === 401
          ? " · invalid key or not yet activated"
          : response.status === 429
            ? " · rate limit, retry in a minute"
            : "";
      throw new Error(`HTTP_${response.status}: ${response.statusText}${hint}`);
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("PARSE_ERROR: Forecast response was not valid JSON.");
    }

    // Normalise a single 3-hour forecast entry into the same shape
    // that SetupEngine expects from fetchWeather() current conditions.
    const normalizeEntry = (entry) => {
      if (!entry) return null;
      const isRaining = ["Rain", "Drizzle", "Thunderstorm"].includes(
        entry.weather[0].main,
      );
      const ambientTemp = Math.round(entry.main.temp);
      const cloudCover = entry.clouds.all;
      const windDeg = entry.wind?.deg ?? 0;
      const windSpeed = Math.round((entry.wind?.speed ?? 0) * 3.6);
      return {
        circuitId,
        // dt_txt e.g. "2025-06-20 15:00:00"
        fetchedAt: entry.dt_txt ?? new Date(entry.dt * 1000).toISOString(),
        temp: ambientTemp,
        feelsLike: Math.round(entry.main.feels_like),
        humidity: entry.main.humidity,
        pressure: entry.main.pressure,
        windSpeed,
        windDeg,
        windDir: this._degToCompass(windDeg),
        windArrow: this._getWindArrow(windDeg),
        weatherMain: entry.weather[0].main,
        weatherDesc: entry.weather[0].description,
        visibility: Math.round((entry.visibility ?? 10000) / 1000),
        cloudCover,
        isRaining,
        // OWM probability of precipitation, 0..1 → whole percent
        rainChance: Math.round((entry.pop ?? 0) * 100),
        // forecast uses 3h rain accumulation · divide to get hourly equivalent
        rain1h: entry.rain ? (entry.rain["3h"] ?? 0) / 3 : 0,
        trackTempEstimate: this._estimateTrackTemp(
          ambientTemp,
          cloudCover,
          entry.weather[0].main,
        ),
      };
    };

    // OWM forecast returns 40 entries × 3h = 120h total.
    // Index 0 = now, 8 = +24h, 16 = +48h, 24 = +72h
    const list = data.list;
    const forecast = {
      now: normalizeEntry(list[0]),
      practice: normalizeEntry(list[8] ?? list[list.length - 1]),
      quali: normalizeEntry(list[16] ?? list[list.length - 1]),
      race: normalizeEntry(list[24] ?? list[list.length - 1]),
    };

    this.cache.set(cacheKey, { data: forecast, timestamp: Date.now() });
    return forecast;
  }
}

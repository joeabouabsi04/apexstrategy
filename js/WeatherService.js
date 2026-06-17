/* ============================================================
   APEXSTRATEGY — WEATHER SERVICE  (ES6 module)
   API key lives in js/config.js which is in .gitignore.
   ============================================================ */

import { OPENWEATHER_API_KEY } from "./config.js";

const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

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
    this.API_KEY = OPENWEATHER_API_KEY;
    this.BASE_URL = BASE_URL;
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  async fetchWeather(lat, lon, circuitId) {
    if (!this.API_KEY || this.API_KEY === "YOUR_API_KEY_HERE") {
      throw new Error(
        "API_KEY_MISSING: Add your OpenWeatherMap key to js/WeatherService.js. " +
          "Free key at openweathermap.org/api — activates in ~10 minutes.",
      );
    }

    if (this.isCached(circuitId)) {
      const entry = this.cache.get(circuitId);
      console.log(
        `[WeatherService] Cache hit: ${circuitId} (${Math.round((Date.now() - entry.timestamp) / 1000)}s old)`,
      );
      return entry.data;
    }

    const url = `${this.BASE_URL}?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=metric`;
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
          ? " — invalid key or not yet activated (wait 10 min)"
          : response.status === 429
            ? " — rate limit, try again in a minute"
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
}

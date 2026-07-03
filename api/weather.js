/* ============================================================
   APEXSTRATEGY — WEATHER PROXY  (Vercel Serverless Function)

   Runs on Vercel's Node.js runtime, NOT in the browser. It injects
   the OpenWeatherMap key (stored as the OPENWEATHER_API_KEY project
   environment variable) server-side, so the key never ships to the
   client or the git repo.

   Frontend calls:  /api/weather?endpoint=weather&lat=..&lon=..
                    /api/weather?endpoint=forecast&lat=..&lon=..

   CommonJS (module.exports) is used deliberately: this project has no
   package.json, so Vercel treats .js as CommonJS — an ESM `export
   default` would fail to build. Node 18+ on Vercel provides global
   fetch, so no dependencies are needed.
   ============================================================ */

const ALLOWED_ENDPOINTS = new Set(["weather", "forecast"]);

module.exports = async function handler(req, res) {
  const { endpoint = "weather", lat, lon } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error:
        "SERVER_KEY_MISSING: OPENWEATHER_API_KEY is not set in the Vercel project settings.",
    });
  }
  if (!lat || !lon) {
    return res
      .status(400)
      .json({ error: "Missing lat or lon query parameters." });
  }

  // Whitelist the path so this can't be turned into an open proxy.
  const path = ALLOWED_ENDPOINTS.has(endpoint) ? endpoint : "weather";

  const url =
    `https://api.openweathermap.org/data/2.5/${path}` +
    `?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}` +
    `&appid=${apiKey}&units=metric`;

  try {
    const upstream = await fetch(url);
    const data = await upstream.json();
    // Forward OpenWeather's real status so the client can still detect
    // 401 (bad key) / 429 (rate limit) etc. instead of always seeing 200.
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate");
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res
      .status(502)
      .json({ error: "PROXY_FETCH_FAILED", detail: err.message });
  }
};

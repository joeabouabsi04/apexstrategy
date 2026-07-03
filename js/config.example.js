/* ============================================================
   APEXSTRATEGY — LOCAL DEV CONFIG (TEMPLATE)

   For LOCAL development only. Copy this file to `js/config.js`
   and paste your own OpenWeatherMap key below:

       cp js/config.example.js js/config.js

   js/config.js is gitignored, so your key is never committed.

   In production (Vercel) this file is NOT used at all — the key is
   injected server-side by the /api/weather serverless proxy from the
   OPENWEATHER_API_KEY environment variable.

   Free key: https://openweathermap.org/api  (activates in ~10 min)
   ============================================================ */

export const OPENWEATHER_API_KEY = "YOUR_API_KEY_HERE";

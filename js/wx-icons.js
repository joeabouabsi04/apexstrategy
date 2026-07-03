/* ============================================================
   APEXSTRATEGY — WEATHER ICONS  (ES6 module)
   Shared condition glyphs keyed by OpenWeatherMap's `weather.main`.
   Used by the workbench weather card, the weekend outlook strip,
   and the home page live radar. Colour comes from the wx-* class
   (defined once in style.css).
   ============================================================ */

export const WX_SVG = {
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.4"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7"/></svg>`,
  cloud: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 18a4 4 0 0 0 .3-8A6 6 0 0 0 6.2 11.6 3.6 3.6 0 0 0 7 18.7z"/></svg>`,
  rain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 15a4 4 0 0 0 .3-8A6 6 0 0 0 6.2 8.6 3.6 3.6 0 0 0 7 15.7"/><path d="M8 18.5l-1 2.5M12.5 18.5l-1 2.5M17 18.5l-1 2.5"/></svg>`,
  drizzle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 15a4 4 0 0 0 .3-8A6 6 0 0 0 6.2 8.6 3.6 3.6 0 0 0 7 15.7"/><path d="M9 18.2l-.4 1.1M13 18.2l-.4 1.1M17 18.2l-.4 1.1"/></svg>`,
  storm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 14a4 4 0 0 0 .3-8A6 6 0 0 0 6.2 7.6 3.6 3.6 0 0 0 7 14.7"/><path d="M12.5 12.5 10 17h3l-1.8 4"/></svg>`,
  snow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 15a4 4 0 0 0 .3-8A6 6 0 0 0 6.2 8.6 3.6 3.6 0 0 0 7 15.7"/><path d="M8.5 18.5v.01M12 20v.01M15.5 18.5v.01M10 21.5v.01M14 22v.01"/></svg>`,
  mist: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h13M7 13h13M4 17h13"/></svg>`,
  wind: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h9.5a2.5 2.5 0 1 0-2.4-3.2M3 12h14.5a2.5 2.5 0 1 1-2.4 3.2M3 16h7.5a2 2 0 1 1-1.9 2.6"/></svg>`,
};

// weather.main → { glyph key, colour class }
const WX_MAP = {
  clear: { svg: "sun", cls: "wx-clear" },
  clouds: { svg: "cloud", cls: "wx-clouds" },
  rain: { svg: "rain", cls: "wx-rain" },
  drizzle: { svg: "drizzle", cls: "wx-drizzle" },
  thunderstorm: { svg: "storm", cls: "wx-storm" },
  snow: { svg: "snow", cls: "wx-snow" },
  mist: { svg: "mist", cls: "wx-mist" },
  smoke: { svg: "mist", cls: "wx-mist" },
  haze: { svg: "mist", cls: "wx-mist" },
  fog: { svg: "mist", cls: "wx-mist" },
  dust: { svg: "mist", cls: "wx-mist" },
  sand: { svg: "mist", cls: "wx-mist" },
  squall: { svg: "wind", cls: "wx-mist" },
  tornado: { svg: "wind", cls: "wx-storm" },
};

/** Resolve a weather.main value to its { svg, cls } entry. */
export function wxFor(weatherMain) {
  return WX_MAP[(weatherMain ?? "").toLowerCase()] ?? WX_MAP.clouds;
}

/** Raw SVG markup for a weather.main value. */
export function wxSvg(weatherMain) {
  return WX_SVG[wxFor(weatherMain).svg];
}

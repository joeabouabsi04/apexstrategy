# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ApexStrategy — a static, vanilla JS (no build step, no framework, no package.json) F1 race-engineering tool. Three pages: `index.html` (circuit browser), `workbench.html` (per-circuit setup/strategy tool), `handbook.html` (tabbed reference content). All JS is loaded as native ES modules (`type="module"`) directly by the browser — there is no bundler, transpiler, or test runner in this repo.

## Running it

Open the HTML files through a local static server (ES modules and `fetch("tracks/{id}.svg")` require http(s), not `file://`). E.g. `npx serve .` or VS Code Live Server. There is no build/lint/test command — none exist in this repo.

### Weather API key

`js/config.js` exports `OPENWEATHER_API_KEY`, imported by `js/WeatherService.js`. Workbench fetches will fail with `API_KEY_MISSING` until a real OpenWeatherMap key is present.

## Architecture

**Single entry point**: `js/main.js` is loaded by all three pages. It runs `runBootSequence()` then branches on `location.pathname` to dynamically `import()` the page-specific controller (`WorkbenchController`, `TabController`, or `HomeController`/`hero.js`). Don't add new top-level `<script>` tags — route new page logic through this dispatch instead.

**Data flow on the workbench page** (the most complex page):
1. `circuits.js` exports the static `CIRCUITS` array (id, lat/lon, type, downforce/tyre-wear/braking classifications used as lookup keys elsewhere) plus `getCircuitById`/`searchCircuits`/filter helpers.
2. `WorkbenchController` reads `?circuit=<id>` from the URL, fetches current + forecast weather via `WeatherService`, and feeds both circuit + weather into `new SetupEngine(circuit, weather)`.
3. `SetupEngine.generateReport()` is a pure, dependency-free calculator (tyre pressures, compound choice, aero/wing angles, wet strategy) keyed off lookup tables (`COMPOUND_WINDOWS`, `AERO_BASE`, `TYRE_BASE`) defined at the top of `SetupEngine.js`. It has no DOM access — safe to reason about/extend in isolation.
4. `WorkbenchController` renders the report into the DOM pane-by-pane (`_renderTyrePane`, `_renderAeroPane`, `_renderWetPane`, `_renderVerdict`) and re-runs the engine without a page reload whenever the race-weekend timeline buttons (`now`/`practice`/`quali`/`race`, each a forecast slice) are clicked.

**Tabs**: `TabController` is a generic, DOM-driven tab/pane manager (data-tab / data-pane attributes, ARIA roles, arrow-key nav) reused by both `handbook.html` and the workbench's panes. It has no knowledge of circuits or weather — keep it that way.

**Track maps**: `trackmaps.js` fetches raw SVGs from `tracks/{id}.svg` (named by circuit id) and caches them in-memory; `WorkbenchController._renderMinimap()` parses the SVG, merges all `<path>` `d` attributes into one compound path, and animates a lap marker along it with `animateMotion`/`mpath`. New circuits need a matching `tracks/{id}.svg`.

**Animation helpers**: `anim.js` provides shared utilities (`runBootSequence`, `animateValue` for numeric count-up, `decodeText` for the scramble-decode text effect, `flashCell`) used across controllers — prefer reusing these over writing new one-off animation code.

**Styling**: single global stylesheet `css/style.css`; supports light/dark mode (see `nav.js` for the toggle). No CSS modules/scoping — class names are global and shared across pages.

## Conventions seen in the existing code

- Controllers are ES6 classes with `_`-prefixed private-by-convention methods; public API is `init()`/constructor + a few render/state methods.
- DOM lookups go through small `_show`/`_hide`/`_setText`/`_setDotClass` helpers rather than inline `classList`/`textContent` calls — follow this pattern when adding new render logic.
- Status values are one of `"optimal" | "warning" | "critical"` throughout (SetupEngine output, CSS classes, status dots) — keep new status logic consistent with this 3-state vocabulary.
- Lookup-table-driven logic (object literals keyed by circuit attribute, e.g. `AERO_BASE`, `TYPE_CLASS_MAP`, `DEMAND_STATE`) is the dominant pattern for mapping circuit/weather data to UI — prefer extending a table over adding conditional branches.

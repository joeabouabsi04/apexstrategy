/* ============================================================
   APEXSTRATEGY — TRACK MAPS
   Fetches circuit SVG outlines from the local tracks/ folder.
   Files are named by circuit ID: tracks/{id}.svg

   Replaces the old embedded-path approach entirely.
   All fetch results are cached in-memory for the session.
   ============================================================ */

const _svgCache = new Map();

/**
 * Fetches the raw SVG markup for a circuit from the local
 * tracks/ directory. Returns null on network or parse failure.
 *
 * The URL is relative to the HTML document (project root), so
 * tracks/spa.svg resolves correctly regardless of script location.
 *
 * @param {string} circuitId  e.g. "spa", "monza", "laguna-seca"
 * @returns {Promise<string|null>}
 */
export async function fetchTrackMap(circuitId) {
  if (!circuitId || typeof circuitId !== "string") return null;
  const id = circuitId.toLowerCase().trim();

  // Return cached result if available
  if (_svgCache.has(id)) return _svgCache.get(id);

  try {
    const res = await fetch(`tracks/${id}.svg`);
    if (!res.ok) {
      console.warn(`[TrackMaps] tracks/${id}.svg → HTTP ${res.status}`);
      _svgCache.set(id, null); // cache the failure so we don't retry
      return null;
    }
    const text = await res.text();
    _svgCache.set(id, text);
    return text;
  } catch (err) {
    console.warn(`[TrackMaps] Failed to load tracks/${id}.svg:`, err.message);
    _svgCache.set(id, null);
    return null;
  }
}

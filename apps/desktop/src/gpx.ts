import type { TripGpx } from "@pack-attack/shared";

interface ParsedPoint {
  lat: number;
  lon: number;
  ele?: number;
}

/** Parse a GPX (XML) string and extract bounds, distance (km), and elevation
 *  gain (m). Works in the browser using DOMParser; tolerates GPX 1.0/1.1
 *  with either `<trkpt>` or `<rtept>` points. */
export function parseGpx(xml: string, filename: string): TripGpx {
  const base: TripGpx = { filename, xml, uploadedAt: new Date().toISOString() };
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) return base;

    const points: ParsedPoint[] = [];
    const trackNames = new Set<string>();
    const ptNodes = doc.querySelectorAll("trkpt, rtept");
    ptNodes.forEach((node) => {
      const lat = Number.parseFloat(node.getAttribute("lat") ?? "");
      const lon = Number.parseFloat(node.getAttribute("lon") ?? "");
      if (Number.isNaN(lat) || Number.isNaN(lon)) return;
      const eleEl = node.getElementsByTagName("ele")[0];
      const ele = eleEl ? Number.parseFloat(eleEl.textContent ?? "") : undefined;
      points.push({ lat, lon, ele: Number.isFinite(ele as number) ? ele : undefined });
    });
    doc.querySelectorAll("trk > name, rte > name").forEach((n) => {
      const v = (n.textContent ?? "").trim();
      if (v) trackNames.add(v);
    });

    if (points.length === 0) return base;

    let minLat = Infinity, minLon = Infinity, maxLat = -Infinity, maxLon = -Infinity;
    let distanceKm = 0;
    let elevationGainM = 0;
    let prev: ParsedPoint | null = null;
    for (const p of points) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lon < minLon) minLon = p.lon;
      if (p.lon > maxLon) maxLon = p.lon;
      if (prev) {
        distanceKm += haversineKm(prev.lat, prev.lon, p.lat, p.lon);
        if (prev.ele !== undefined && p.ele !== undefined) {
          const d = p.ele - prev.ele;
          if (d > 0) elevationGainM += d;
        }
      }
      prev = p;
    }

    return {
      ...base,
      pointCount: points.length,
      bounds: { minLat, minLon, maxLat, maxLon },
      distanceKm: Math.round(distanceKm * 100) / 100,
      elevationGainM: Math.round(elevationGainM),
      trackNames: trackNames.size > 0 ? Array.from(trackNames) : undefined
    };
  } catch {
    return base;
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

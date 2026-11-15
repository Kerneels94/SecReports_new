/**
 * Fills in coordinates for incidents saved without a map pin, so they show on the
 * dashboard hotspot map. Looks up "suburb, city" (else the address or location) via
 * Photon, the same free OpenStreetMap geocoder the incident form uses.
 * Run with: npx tsx prisma/backfill-coordinates.ts
 */

/** Bounding box of South Africa: minLon,minLat,maxLon,maxLat. */
const ZA_BBOX = "16.3,-35.0,33.0,-22.0";

type Point = { lat: number; lng: number };

/** First Photon hit for a South African place, or null. Throws on HTTP errors (e.g. 429). */
export async function geocode(query: string): Promise<Point | null> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=en&bbox=${ZA_BBOX}`;
  // Timeout so a slow Photon cannot hang an incident save.
  const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`Photon returned ${res.status}`);
  const data = (await res.json()) as { features: { geometry: { coordinates: [number, number] } }[] };
  const hit = data.features[0];
  return hit ? { lat: hit.geometry.coordinates[1], lng: hit.geometry.coordinates[0] } : null;
}

interface Row {
  id: string;
  latitude: number | null;
  longitude: number | null;
  suburb: string | null;
  city: string | null;
  propertyAddress: string | null;
  location: string | null;
}

interface Db {
  incident: {
    findMany(args: object): Promise<Row[]>;
    update(args: { where: { id: string }; data: { latitude: number; longitude: number } }): Promise<unknown>;
  };
}

/**
 * Sets coordinates on every incident missing them. Each distinct area is looked up once,
 * with a pause between lookups because Photon's public server is fair-use.
 */
export async function backfillCoordinates(db: Db, lookup = geocode, pauseMs = 1000) {
  // Filtered in JS: on MongoDB an unset field does not match `latitude: null`.
  const incidents = (
    await db.incident.findMany({
      select: { id: true, latitude: true, longitude: true, suburb: true, city: true, propertyAddress: true, location: true },
    })
  ).filter((i) => i.latitude == null || i.longitude == null);

  const cache = new Map<string, Point | null>();
  let updated = 0;
  let noArea = 0;
  const missed = new Set<string>();

  for (const inc of incidents) {
    const query = [inc.suburb, inc.city].filter(Boolean).join(", ") || inc.propertyAddress || inc.location;
    if (!query) {
      noArea++;
      continue;
    }
    // Outlying towns (e.g. Ballito) are their own place in OSM, so "Ballito, Durban" misses: retry the suburb alone.
    const queries = [query, inc.suburb].filter((q, i, all): q is string => !!q && all.indexOf(q) === i);
    let point: Point | null | undefined = null;
    for (const q of queries) {
      if (!cache.has(q)) {
        cache.set(q, await lookup(q));
        if (pauseMs) await new Promise((r) => setTimeout(r, pauseMs));
      }
      point = cache.get(q);
      if (point) break;
    }
    if (!point) {
      missed.add(query);
      continue;
    }
    await db.incident.update({ where: { id: inc.id }, data: { latitude: point.lat, longitude: point.lng } });
    updated++;
  }

  return { updated, noArea, notFound: [...missed] };
}

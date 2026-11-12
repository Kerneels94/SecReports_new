/**
 * Address search for South Africa via Photon (komoot), a free OpenStreetMap
 * geocoder that allows search-as-you-type. No API key, no billing.
 * Photon's public server is fair-use: keep requests debounced.
 */

/** A geocoded address the user can pick. */
export interface AddressSuggestion {
  label: string;
  street: string;
  suburb: string;
  city: string;
  lat: number;
  lng: number;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
}

/** Bounding box of South Africa: minLon,minLat,maxLon,maxLat. */
const ZA_BBOX = "16.3,-35.0,33.0,-22.0";

/** Turns one Photon feature into a suggestion, or null when it is outside South Africa. */
export function toSuggestion(f: PhotonFeature): AddressSuggestion | null {
  const p = f.properties;
  if (p.countrycode && p.countrycode.toUpperCase() !== "ZA") return null;
  const road = [p.housenumber, p.street].filter(Boolean).join(" ");
  const street = road || p.name || "";
  const suburb = p.district || p.locality || "";
  const city = p.city || p.county || "";
  const label = [p.street && p.name !== p.street ? p.name : null, street, suburb, city, p.postcode]
    .filter((part, i, all) => part && all.indexOf(part) === i)
    .join(", ");
  const [lng, lat] = f.geometry.coordinates;
  return { label, street, suburb, city, lat, lng };
}

/** Searches South African addresses. Returns [] for queries under 3 characters. */
export async function searchAddress(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en&bbox=${ZA_BBOX}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Address search failed");
  const data: { features: PhotonFeature[] } = await res.json();
  return data.features.map(toSuggestion).filter((s): s is AddressSuggestion => s !== null);
}

/** Google Maps link for a point. Plain URL: no key, no cost. */
export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

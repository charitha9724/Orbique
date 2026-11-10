// Turns map positions into place names (and back) using OpenStreetMap's free
// Nominatim service. Its rules: at most about 1 request a second, so callers
// should only ask after the map stops moving.

const NOMINATIM = 'https://nominatim.openstreetmap.org';

export type Place = {
  lat: number;
  lng: number;
  /** Short name such as "Koramangala, Bengaluru". */
  area: string;
  /** The city or town, if known. */
  city: string | null;
};

type NominatimAddress = Record<string, string | undefined>;

function cityOf(address: NominatimAddress): string | null {
  return (
    address.city ?? address.town ?? address.village ?? address.municipality ?? address.county ?? null
  );
}

function areaOf(address: NominatimAddress, fallback: string): string {
  const local =
    address.suburb ?? address.neighbourhood ?? address.quarter ?? address.city_district ?? null;
  const city = cityOf(address);
  const parts = [local, city].filter((p, i, all): p is string => !!p && all.indexOf(p) === i);
  return parts.length ? parts.join(', ') : fallback;
}

/** Find the area name for a map position. */
export async function reverseGeocode(lat: number, lng: number): Promise<Place> {
  const url = `${NOMINATIM}/reverse?format=jsonv2&zoom=16&addressdetails=1&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Couldn't look up this place (${res.status})`);
  const data = await res.json();
  const address: NominatimAddress = data.address ?? {};
  return { lat, lng, area: areaOf(address, data.name || 'Selected area'), city: cityOf(address) };
}

/** Search for a place by name, e.g. "Koramangala". */
export async function searchPlaces(query: string): Promise<Place[]> {
  const url = `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data: { lat: string; lon: string; name?: string; display_name: string; address?: NominatimAddress }[] =
    await res.json();
  return data.map((item) => ({
    lat: Number(item.lat),
    lng: Number(item.lon),
    area: areaOf(item.address ?? {}, item.name || item.display_name.split(',')[0]),
    city: cityOf(item.address ?? {}),
  }));
}

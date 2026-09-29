const NOMINATIM_URL = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";

async function searchPlaces(query) {
  const cleanQuery = String(query || "").trim();
  if (cleanQuery.length < 2) return [];

  const url = new URL("/search", NOMINATIM_URL);
  url.searchParams.set("q", cleanQuery);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": process.env.NOMINATIM_USER_AGENT || "SafarSuraksha/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding provider returned ${response.status}`);
  }

  const results = await response.json();

  return results.map((place) => ({
    id: place.place_id,
    name: place.display_name,
    latitude: Number(place.lat),
    longitude: Number(place.lon),
    type: place.type,
  }));
}

async function geocodePlace(query) {
  const results = await searchPlaces(query);
  return results[0] || null;
}

module.exports = { searchPlaces, geocodePlace };

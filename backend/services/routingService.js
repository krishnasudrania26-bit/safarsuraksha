const OSRM_URL = process.env.OSRM_URL || "https://router.project-osrm.org";

function routeSummary(route, index) {
  return {
    id: `route-${index + 1}`,
    distanceKm: Number((route.distance / 1000).toFixed(2)),
    durationMinutes: Math.max(1, Math.round(route.duration / 60)),
    geometry: route.geometry,
    legs: route.legs || [],
  };
}

async function compareRoutes(origin, destination) {
  const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const url = new URL(`/route/v1/driving/${coords}`, OSRM_URL);
  url.searchParams.set("alternatives", "true");
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("steps", "true");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Routing provider returned ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== "Ok" || !Array.isArray(data.routes) || !data.routes.length) {
    throw new Error("No route could be calculated for this journey.");
  }

  return data.routes.slice(0, 3).map(routeSummary);
}

module.exports = { compareRoutes };

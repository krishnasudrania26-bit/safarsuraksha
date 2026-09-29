const OVERPASS_URL = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";
const OVERPASS_MIRRORS = [
  OVERPASS_URL,
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
].filter((url, index, list) => list.indexOf(url) === index);

function bboxFromGeometry(geometry) {
  const coords = geometry?.coordinates || [];
  if (!coords.length) throw new Error("Route geometry is required.");

  let minLat = 90, minLon = 180, maxLat = -90, maxLon = -180;
  for (const [lon, lat] of coords) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  }

  const pad = 0.003;
  return [minLat - pad, minLon - pad, maxLat + pad, maxLon + pad];
}

function factorFromCount(count, start, full) {
  if (count <= start) return 35 + (count / Math.max(1, start)) * 20;
  return Math.min(100, 55 + ((count - start) / Math.max(1, full - start)) * 45);
}

async function collectContext(geometry) {
  const [south, west, north, east] = bboxFromGeometry(geometry);
  const bbox = `(${south},${west},${north},${east})`;

  const queries = {
    hospitals: `[out:json][timeout:20];nwr["amenity"="hospital"]${bbox};out count;`,
    police: `[out:json][timeout:20];nwr["amenity"="police"]${bbox};out count;`,
    publicTransport: `[out:json][timeout:20];nwr["public_transport"]${bbox};out count;`,
    streetLights: `[out:json][timeout:20];nwr["highway"="street_lamp"]${bbox};out count;`,
    shops: `[out:json][timeout:20];node["shop"]${bbox};out count;`,
  };

  async function requestCount(endpoint, query) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": process.env.NOMINATIM_USER_AGENT || "SafarSuraksha/1.0",
        },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Safety data provider returned ${response.status}`);
      const data = await response.json();
      // Overpass `out count;` returns `{ count: { total, nodes, ways, relations } }` in JSON.\n      // Keep a legacy fallback for providers that may wrap the count differently.\n      return Number(data?.count?.total ?? data?.elements?.[0]?.tags?.total ?? 0);
    } finally {
      clearTimeout(timeout);
    }
  }

  let lastError = null;

  for (const endpoint of OVERPASS_MIRRORS) {
    try {
      const entries = await Promise.all(
        Object.entries(queries).map(async ([key, query]) => [key, await requestCount(endpoint, query)])
      );

      return Object.fromEntries(entries);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(lastError?.message || "All safety data providers failed.");
}

async function analyzeRoute(route) {
  let context;
  try {
    context = await collectContext(route.geometry);
  } catch (error) {
    context = null;
  }

  if (!context) {
    return {
      score: 50,
      level: "Moderate Risk",
      confidence: "low",
      dataSources: ["OpenStreetMap unavailable for this request"],
      factors: {
        emergencyServices: { score: 50, evidence: "Data unavailable" },
        publicTransport: { score: 50, evidence: "Data unavailable" },
        activity: { score: 50, evidence: "Data unavailable" },
        lighting: { score: 50, evidence: "Data unavailable" },
        incidentHistory: { score: 50, evidence: "No incident-history dataset configured" },
        roadQuality: { score: 50, evidence: "No road-quality dataset configured" },
      },
    };
  }

  const factors = {
    emergencyServices: {
      score: Math.round((factorFromCount(context.hospitals + context.police, 0, 8))),
      evidence: `${context.hospitals} hospitals, ${context.police} police locations in route area`,
    },
    publicTransport: {
      score: Math.round(factorFromCount(context.publicTransport, 1, 12)),
      evidence: `${context.publicTransport} public-transport locations in route area`,
    },
    activity: {
      score: Math.round(factorFromCount(context.shops, 3, 40)),
      evidence: `${context.shops} mapped shops/activity points in route area`,
    },
    lighting: {
      score: Math.round(factorFromCount(context.streetLights, 2, 30)),
      evidence: `${context.streetLights} mapped street lights in route area`,
    },
    incidentHistory: {
      score: 50,
      evidence: "No incident-history dataset configured yet",
    },
    roadQuality: {
      score: 60,
      evidence: "No independent road-quality dataset configured yet",
    },
  };

  const weights = {
    emergencyServices: 0.24,
    publicTransport: 0.14,
    activity: 0.14,
    lighting: 0.12,
    incidentHistory: 0.22,
    roadQuality: 0.14,
  };

  const score = Math.round(
    Object.entries(weights).reduce(
      (sum, [key, weight]) => sum + factors[key].score * weight,
      0
    )
  );

  const level = score >= 85 ? "Very Safe" : score >= 70 ? "Safer" : score >= 50 ? "Moderate Risk" : "High Risk";

  return {
    score,
    level,
    confidence: "medium",
    dataSources: ["OpenStreetMap / Overpass"],
    factors,
  };
}

module.exports = { analyzeRoute };

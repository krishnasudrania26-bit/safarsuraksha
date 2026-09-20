const OVERPASS_URL = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";

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
  const query = `[out:json][timeout:25];
(
  nwr["amenity"="hospital"](${south},${west},${north},${east});
  nwr["amenity"="police"](${south},${west},${north},${east});
  nwr["public_transport"](${south},${west},${north},${east});
  nwr["highway"="street_lamp"](${south},${west},${north},${east});
  nwr["shop"](${south},${west},${north},${east});
);
out center tags;
`;

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }),
  });

  if (!response.ok) throw new Error(`Safety data provider returned ${response.status}`);

  const data = await response.json();
  const elements = data.elements || [];

  const count = (predicate) => elements.filter(predicate).length;

  return {
    hospitals: count((e) => e.tags?.amenity === "hospital"),
    police: count((e) => e.tags?.amenity === "police"),
    publicTransport: count((e) => Boolean(e.tags?.public_transport)),
    streetLights: count((e) => e.tags?.highway === "street_lamp"),
    shops: count((e) => Boolean(e.tags?.shop)),
  };
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

const OVERPASS_URL = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";

const OVERPASS_MIRRORS = [
  OVERPASS_URL,
  "https://overpass.private.coffee/api/interpreter",
].filter((url, index, list) => list.indexOf(url) === index);

function bboxFromGeometry(geometry) {
  const coords = geometry?.coordinates || [];
  if (!Array.isArray(coords) || coords.length === 0) {
    throw new Error("Route geometry is required.");
  }

  let minLat = 90;
  let minLon = 180;
  let maxLat = -90;
  let maxLon = -180;

  for (const point of coords) {
    if (!Array.isArray(point) || point.length < 2) continue;
    const [lon, lat] = point;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  }

  if (minLat === 90 || minLon === 180) {
    throw new Error("Route geometry contains no valid coordinates.");
  }

  // Small corridor around the route. Overpass uses south,west,north,east.
  const pad = 0.003;
  return [minLat - pad, minLon - pad, maxLat + pad, maxLon + pad];
}

function factorFromCount(count, start, full) {
  const safeCount = Math.max(0, Number(count) || 0);
  if (safeCount <= start) {
    return 35 + (safeCount / Math.max(1, start)) * 20;
  }
  return Math.min(100, 55 + ((safeCount - start) / Math.max(1, full - start)) * 45);
}

function parseCountResponse(data) {
  // Current Overpass JSON form:
  // { count: { total, nodes, ways, relations, areas } }
  if (Number.isFinite(Number(data?.count?.total))) {
    return Number(data.count.total);
  }

  // Some Overpass-compatible servers return count as an element.
  const element = data?.elements?.find((item) => item?.type === "count");
  if (element && Number.isFinite(Number(element?.tags?.total))) {
    return Number(element.tags.total);
  }

  const legacyTotal = data?.elements?.[0]?.tags?.total;
  if (Number.isFinite(Number(legacyTotal))) {
    return Number(legacyTotal);
  }

  throw new Error("Unexpected Overpass count response.");
}

async function requestJson(endpoint, query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": process.env.NOMINATIM_USER_AGENT || "SafarSuraksha/1.0",
        Accept: "application/json",
      },
      body: new URLSearchParams({ data: query }),
      signal: controller.signal,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Safety data provider returned HTTP ${response.status}: ${text.slice(0, 160)}`);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Safety data provider returned non-JSON data.");
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function collectContext(geometry) {
  const [south, west, north, east] = bboxFromGeometry(geometry);
  const bbox = `(${south},${west},${north},${east})`;

  // One Overpass request returns five counts. This avoids five parallel requests
  // for every route, which can trigger public Overpass rate/concurrency limits.
  const query = `[out:json][timeout:25];
nwr["amenity"="hospital"]${bbox}->.hospitals;
nwr["amenity"="police"]${bbox}->.police;
nwr["public_transport"]${bbox}->.transport;
nwr["highway"="street_lamp"]${bbox}->.lights;
node["shop"]${bbox}->.shops;
.hospitals out count;
.police out count;
.transport out count;
.lights out count;
.shops out count;`;

  let lastError = null;

  for (const endpoint of OVERPASS_MIRRORS) {
    try {
      const data = await requestJson(endpoint, query);

      const countElements = Array.isArray(data?.elements)
        ? data.elements.filter((item) => item?.type === "count")
        : [];

      if (countElements.length >= 5) {
        return {
          hospitals: Number(countElements[0]?.tags?.total || 0),
          police: Number(countElements[1]?.tags?.total || 0),
          publicTransport: Number(countElements[2]?.tags?.total || 0),
          streetLights: Number(countElements[3]?.tags?.total || 0),
          shops: Number(countElements[4]?.tags?.total || 0),
        };
      }

      // Some compatible endpoints can collapse a single count response.
      const total = parseCountResponse(data);
      throw new Error(`Expected five safety counts but received one count (${total}).`);
    } catch (error) {
      lastError = error;
      console.error(`Safety provider failed [${endpoint}]: ${error.message}`);
    }
  }

  throw new Error(lastError?.message || "All safety data providers failed.");
}

async function analyzeRoute(route) {
  let context;

  try {
    context = await collectContext(route.geometry);
  } catch (error) {
    console.error("Route safety data collection failed:", error.message);
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
        roadQuality: { score: 50, evidence: "No independent road-quality dataset configured" },
      },
    };
  }

  const factors = {
    emergencyServices: {
      score: Math.round(factorFromCount(context.hospitals + context.police, 0, 8)),
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

  const level =
    score >= 85
      ? "Very Safe"
      : score >= 70
        ? "Safer"
        : score >= 50
          ? "Moderate Risk"
          : "High Risk";

  return {
    score,
    level,
    confidence: "medium",
    dataSources: ["OpenStreetMap / Overpass"],
    factors,
  };
}

module.exports = { analyzeRoute };

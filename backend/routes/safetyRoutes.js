const express = require("express");
const router = express.Router();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scoreRoute(factors = {}) {
  const weights = {
    emergencyServices: 0.24,
    publicTransport: 0.14,
    activity: 0.14,
    lighting: 0.12,
    incidentHistory: 0.22,
    roadQuality: 0.14,
  };

  const normalized = Object.fromEntries(
    Object.entries(weights).map(([key]) => [
      key,
      clamp(Number(factors[key] ?? 50), 0, 100),
    ])
  );

  const score = Math.round(
    Object.entries(weights).reduce(
      (total, [key, weight]) => total + normalized[key] * weight,
      0
    )
  );

  const level =
    score >= 85 ? "Very Safe" :
    score >= 70 ? "Safer" :
    score >= 50 ? "Moderate Risk" :
    "High Risk";

  return { score, level, factors: normalized };
}

router.post("/score", (req, res) => {
  const { routes } = req.body;

  if (!Array.isArray(routes) || routes.length === 0) {
    return res.status(400).json({
      success: false,
      message: "routes must be a non-empty array.",
    });
  }

  const scoredRoutes = routes.map((route, index) => {
    const result = scoreRoute(route.factors);
    return {
      id: route.id || `route-${index + 1}`,
      name: route.name || `Route ${index + 1}`,
      distanceKm: Number(route.distanceKm ?? 0),
      durationMinutes: Number(route.durationMinutes ?? 0),
      ...result,
    };
  }).sort((a, b) => b.score - a.score);

  res.json({
    success: true,
    recommendedRouteId: scoredRoutes[0].id,
    routes: scoredRoutes,
    methodology: {
      emergencyServices: "Hospitals, police and emergency-service coverage",
      publicTransport: "Availability of nearby public transport",
      activity: "Public activity and connectivity",
      lighting: "Well-lit/open-area coverage",
      incidentHistory: "Historical/current incident risk",
      roadQuality: "Road/route accessibility and reliability",
    },
  });
});

module.exports = router;

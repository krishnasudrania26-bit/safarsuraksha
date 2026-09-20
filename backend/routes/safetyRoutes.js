const express = require("express");
const { analyzeRoute } = require("../services/safetyAnalysisService");

const router = express.Router();

router.post("/score", async (req, res) => {
  try {
    const factors = req.body.factors || {};
    const weights = {
      emergencyServices: 0.24,
      publicTransport: 0.14,
      activity: 0.14,
      lighting: 0.12,
      incidentHistory: 0.22,
      roadQuality: 0.14,
    };

    const normalized = {};
    for (const [key, weight] of Object.entries(weights)) {
      const value = Number(factors[key]);
      normalized[key] = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 50;
      normalized[key] *= weight;
    }

    const score = Math.round(Object.values(normalized).reduce((sum, value) => sum + value, 0));
    const level = score >= 85 ? "Very Safe" : score >= 70 ? "Safer" : score >= 50 ? "Moderate Risk" : "High Risk";

    res.json({ success: true, score, level, methodology: "Weighted safety-factor model" });
  } catch (error) {
    console.error("Safety score error:", error);
    res.status(500).json({ success: false, message: "Unable to calculate safety score." });
  }
});

router.post("/analyze-route", async (req, res) => {
  try {
    if (!req.body.route?.geometry) {
      return res.status(400).json({ success: false, message: "Route geometry is required." });
    }

    const analysis = await analyzeRoute(req.body.route);
    res.json({ success: true, ...analysis });
  } catch (error) {
    console.error("Route safety analysis error:", error);
    res.status(502).json({ success: false, message: "Unable to analyze route safety." });
  }
});

module.exports = router;

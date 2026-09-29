const express = require("express");
const Journey = require("../models/Journey");
const Alert = require("../models/Alert");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth(["AUTHORITY", "ADMIN"]));

router.get("/overview", async (req, res) => {
  try {
    const [activeJourneys, activeAlerts, recentAlerts] = await Promise.all([
      Journey.find({ status: { $in: ["ACTIVE", "DEVIATED", "SOS"] } }).sort({ lastLocationAt: -1 }).limit(100).lean(),
      Alert.find({ status: "ACTIVE" }).sort({ createdAt: -1 }).limit(100).lean(),
      Alert.find().sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    res.json({
      success: true,
      summary: {
        activeJourneys: activeJourneys.length,
        activeAlerts: activeAlerts.length,
        sosAlerts: activeAlerts.filter(a => a.type === "SOS").length,
        deviations: activeAlerts.filter(a => a.type === "ROUTE_DEVIATION").length,
      },
      activeJourneys, activeAlerts, recentAlerts,
    });
  } catch (error) {
    console.error("Authority overview error:", error);
    res.status(500).json({ success: false, message: "Unable to load authority dashboard." });
  }
});

router.get("/journeys", async (req, res) => {
  try {
    const journeys = await Journey.find({ status: { $in: ["ACTIVE", "DEVIATED", "SOS"] } }).sort({ lastLocationAt: -1 }).limit(200).lean();
    res.json({ success: true, journeys });
  } catch {
    res.status(500).json({ success: false, message: "Unable to load active journeys." });
  }
});

module.exports = router;

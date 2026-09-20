const express = require("express");
const Alert = require("../models/Alert");
const Tourist = require("../models/Tourist");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { touristId, journeyId, type, severity = "MEDIUM", message, latitude = null, longitude = null, accuracy = null, metadata = {} } = req.body;
    if (!touristId || !type || !message) return res.status(400).json({ success: false, message: "touristId, type and message are required." });

    const alert = await Alert.create({
      touristId, journeyId: journeyId || null, type, severity, message,
      location: { latitude, longitude, accuracy }, metadata,
    });
    res.status(201).json({ success: true, alert });
  } catch (error) {
    console.error("Create alert error:", error);
    res.status(500).json({ success: false, message: "Unable to create alert." });
  }
});

router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.touristId) filter.touristId = req.query.touristId;
    const alerts = await Alert.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, count: alerts.length, alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to fetch alerts." });
  }
});

router.get("/:alertId", async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.alertId).lean();
    if (!alert) return res.status(404).json({ success: false, message: "Alert not found." });
    const tourist = await Tourist.findOne({ touristId: alert.touristId }).select("touristId name phone emergencyContact").lean();
    res.json({ success: true, alert, tourist });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to fetch alert." });
  }
});

router.patch("/:alertId/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["ACTIVE", "ACKNOWLEDGED", "RESOLVED", "CANCELLED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid alert status." });
    }
    const alert = await Alert.findByIdAndUpdate(
      req.params.alertId,
      { status, resolvedAt: ["RESOLVED", "CANCELLED"].includes(status) ? new Date() : null },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, message: "Alert not found." });
    res.json({ success: true, alert });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to update alert." });
  }
});

module.exports = router;

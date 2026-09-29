const express = require("express");
const Journey = require("../models/Journey");
const Alert = require("../models/Alert");
const Tourist = require("../models/Tourist");
const { distanceToRouteKm } = require("../utils/geo");
const { notifyEmergencyContact } = require("../services/notificationService");

const router = express.Router();

router.post("/start", async (req, res) => {
  try {
    const {
      touristId, destination, routeName, routeDistance, safetyScore,
      latitude, longitude, accuracy, routeGeometry, destinationLocation,
    } = req.body;

    if (!touristId || !destination || !routeName || routeDistance === undefined || safetyScore === undefined) {
      return res.status(400).json({ success: false, message: "Please provide all journey information." });
    }

    const journey = await Journey.create({
      touristId, destination, routeName, routeDistance, safetyScore,
      routeGeometry: routeGeometry || null,
      destinationLocation: destinationLocation || null,
      status: "ACTIVE",
      currentLocation: { latitude: latitude ?? null, longitude: longitude ?? null, accuracy: accuracy ?? null },
      lastLocationAt: latitude != null && longitude != null ? new Date() : null,
      distanceFromRoute: 0, routeDeviation: false, incidentWarning: false, sosActive: false,
    });

    res.status(201).json({ success: true, message: "Journey started successfully.", journey });
  } catch (error) {
    console.error("Start journey error:", error);
    res.status(500).json({ success: false, message: "Unable to start journey." });
  }
});

router.get("/:journeyId", async (req, res) => {
  try {
    const journey = await Journey.findById(req.params.journeyId);
    if (!journey) return res.status(404).json({ success: false, message: "Journey not found." });
    res.json({ success: true, journey });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to fetch journey." });
  }
});

router.put("/:journeyId/location", async (req, res) => {
  try {
    const { latitude, longitude, accuracy, incidentWarning } = req.body;
    const journey = await Journey.findById(req.params.journeyId);

    if (!journey) return res.status(404).json({ success: false, message: "Journey not found." });
    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
      return res.status(400).json({ success: false, message: "Valid GPS coordinates are required." });
    }

    const distanceFromRoute = distanceToRouteKm(
      { latitude: Number(latitude), longitude: Number(longitude) },
      journey.routeGeometry
    );
    const deviation = distanceFromRoute != null && distanceFromRoute >= Number(process.env.ROUTE_DEVIATION_KM || 0.15);
    const becameDeviated = deviation && !journey.routeDeviation;

    journey.currentLocation = { latitude: Number(latitude), longitude: Number(longitude), accuracy: Number(accuracy) || null };
    journey.distanceFromRoute = distanceFromRoute ?? 0;
    journey.routeDeviation = deviation;
    const hadIncidentWarning = journey.incidentWarning;
    const newIncidentWarning = Boolean(incidentWarning);
    journey.incidentWarning = newIncidentWarning;
    journey.lastLocationAt = new Date();
    if (deviation && journey.status === "ACTIVE") journey.status = "DEVIATED";

    if (becameDeviated) {
      const deviationAlert = await Alert.create({
        touristId: journey.touristId,
        journeyId: journey._id,
        type: "ROUTE_DEVIATION",
        severity: (distanceFromRoute || 0) >= 1 ? "HIGH" : "MEDIUM",
        message: `Tourist is ${(distanceFromRoute || 0).toFixed(2)} km away from the planned route.`,
        location: { latitude, longitude, accuracy },
        metadata: { distanceFromRoute },
      });

      const tourist = await Tourist.findOne({ touristId: journey.touristId }).lean();
      notifyEmergencyContact({ tourist, type: "ROUTE_DEVIATION", latitude, longitude }).catch((error) => {
        console.error("Deviation notification error:", error.message);
      });
    }

    if (newIncidentWarning && !hadIncidentWarning) {
      await Alert.create({
        touristId: journey.touristId,
        journeyId: journey._id,
        type: "RISK_ZONE",
        severity: "HIGH",
        message: "A risk-zone warning was triggered for the active journey.",
        location: { latitude, longitude },
      });
    }

    await journey.save();
    res.json({ success: true, message: "Journey location updated.", journey });
  } catch (error) {
    console.error("Location update error:", error);
    res.status(500).json({ success: false, message: "Unable to update journey location." });
  }
});

router.put("/:journeyId/sos", async (req, res) => {
  try {
    const { active, latitude, longitude } = req.body;
    const journey = await Journey.findByIdAndUpdate(
      req.params.journeyId,
      { sosActive: Boolean(active), status: active ? "SOS" : "ACTIVE", currentLocation: { latitude, longitude } },
      { new: true }
    );
    if (!journey) return res.status(404).json({ success: false, message: "Journey not found." });

    if (active) {
      await Alert.create({
        touristId: journey.touristId,
        journeyId: journey._id,
        type: "SOS",
        severity: "CRITICAL",
        message: "SOS activated by tourist.",
        location: { latitude, longitude },
      });

      const tourist = await Tourist.findOne({ touristId: journey.touristId }).lean();
      const notification = await notifyEmergencyContact({ tourist, type: "SOS", latitude, longitude });
      console.log("SOS notification result:", notification);
    }

    res.json({ success: true, message: active ? "SOS activated successfully." : "SOS deactivated.", journey });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to update SOS status." });
  }
});

router.put("/:journeyId/safety-check", async (req, res) => {
  try {
    const { safe = true, latitude, longitude } = req.body;
    const journey = await Journey.findById(req.params.journeyId);
    if (!journey) return res.status(404).json({ success: false, message: "Journey not found." });

    if (safe) {
      await Alert.updateMany(
        { journeyId: journey._id, type: "ROUTE_DEVIATION", status: { $in: ["ACTIVE", "ACKNOWLEDGED"] } },
        { status: "RESOLVED", resolvedAt: new Date() }
      );
      journey.routeDeviation = false;
      journey.status = journey.sosActive ? "SOS" : "ACTIVE";
      if (latitude != null && longitude != null) {
        journey.currentLocation = {
          latitude: Number(latitude),
          longitude: Number(longitude),
          accuracy: journey.currentLocation?.accuracy ?? null,
        };
      }
      await journey.save();
    }

    const alert = await Alert.create({
      touristId: journey.touristId,
      journeyId: journey._id,
      type: "SAFETY_CHECK",
      severity: safe ? "LOW" : "HIGH",
      status: safe ? "ACKNOWLEDGED" : "ACTIVE",
      message: safe ? "Tourist confirmed they are safe." : "Tourist requested assistance during a safety check.",
      location: { latitude, longitude },
    });

    if (!safe) {
      const tourist = await Tourist.findOne({ touristId: journey.touristId }).lean();
      await notifyEmergencyContact({ tourist, type: "SAFETY_CHECK", latitude, longitude });
    }

    res.json({ success: true, message: safe ? "Safety check recorded." : "Assistance requested.", alert, journey });
  } catch (error) {
    console.error("Safety check error:", error);
    res.status(500).json({ success: false, message: "Unable to record safety check." });
  }
});

router.put("/:journeyId/complete", async (req, res) => {
  try {
    const journey = await Journey.findByIdAndUpdate(
      req.params.journeyId,
      { status: "COMPLETED", sosActive: false },
      { new: true }
    );
    if (!journey) return res.status(404).json({ success: false, message: "Journey not found." });
    res.json({ success: true, message: "Journey completed successfully.", journey });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to complete journey." });
  }
});

module.exports = router;

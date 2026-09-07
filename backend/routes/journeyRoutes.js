const express = require("express");
const Journey = require("../models/Journey");

const router = express.Router();

// ===============================
// START A JOURNEY
// ===============================
router.post("/start", async (req, res) => {
  try {
    const {
      touristId,
      destination,
      routeName,
      routeDistance,
      safetyScore,
      latitude,
      longitude,
    } = req.body;

    if (
      !touristId ||
      !destination ||
      !routeName ||
      routeDistance === undefined ||
      safetyScore === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all journey information.",
      });
    }

    const journey = await Journey.create({
      touristId,
      destination,
      routeName,
      routeDistance,
      safetyScore,

      status: "ACTIVE",

      currentLocation: {
        latitude: latitude || null,
        longitude: longitude || null,
      },

      distanceFromRoute: 0,
      routeDeviation: false,
      incidentWarning: false,
      sosActive: false,
    });

    res.status(201).json({
      success: true,
      message: "Journey started successfully.",
      journey,
    });
  } catch (error) {
    console.error("Start journey error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to start journey.",
    });
  }
});

// ===============================
// GET JOURNEY BY ID
// ===============================
router.get("/:journeyId", async (req, res) => {
  try {
    const journey = await Journey.findById(req.params.journeyId);

    if (!journey) {
      return res.status(404).json({
        success: false,
        message: "Journey not found.",
      });
    }

    res.json({
      success: true,
      journey,
    });
  } catch (error) {
    console.error("Get journey error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch journey.",
    });
  }
});

// ===============================
// UPDATE TOURIST LOCATION
// ===============================
router.put("/:journeyId/location", async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      distanceFromRoute,
      routeDeviation,
      incidentWarning,
    } = req.body;

    const updateData = {
      currentLocation: {
        latitude,
        longitude,
      },
      distanceFromRoute: distanceFromRoute || 0,
      routeDeviation: routeDeviation || false,
      incidentWarning: incidentWarning || false,
    };

    if (routeDeviation) {
      updateData.status = "DEVIATED";
    }

    const journey = await Journey.findByIdAndUpdate(
      req.params.journeyId,
      updateData,
      {
        new: true,
      }
    );

    if (!journey) {
      return res.status(404).json({
        success: false,
        message: "Journey not found.",
      });
    }

    res.json({
      success: true,
      message: "Journey location updated.",
      journey,
    });
  } catch (error) {
    console.error("Location update error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update journey location.",
    });
  }
});

// ===============================
// ACTIVATE SOS
// ===============================
router.put("/:journeyId/sos", async (req, res) => {
  try {
    const { active } = req.body;

    const journey = await Journey.findByIdAndUpdate(
      req.params.journeyId,
      {
        sosActive: active,
        status: active ? "SOS" : "DEVIATED",
      },
      {
        new: true,
      }
    );

    if (!journey) {
      return res.status(404).json({
        success: false,
        message: "Journey not found.",
      });
    }

    res.json({
      success: true,
      message: active
        ? "SOS activated successfully."
        : "SOS deactivated.",
      journey,
    });
  } catch (error) {
    console.error("SOS error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update SOS status.",
    });
  }
});

// ===============================
// COMPLETE JOURNEY
// ===============================
router.put("/:journeyId/complete", async (req, res) => {
  try {
    const journey = await Journey.findByIdAndUpdate(
      req.params.journeyId,
      {
        status: "COMPLETED",
        sosActive: false,
      },
      {
        new: true,
      }
    );

    if (!journey) {
      return res.status(404).json({
        success: false,
        message: "Journey not found.",
      });
    }

    res.json({
      success: true,
      message: "Journey completed successfully.",
      journey,
    });
  } catch (error) {
    console.error("Complete journey error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to complete journey.",
    });
  }
});

module.exports = router;
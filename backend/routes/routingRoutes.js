const express = require("express");
const { compareRoutes } = require("../services/routingService");

const router = express.Router();

function validPoint(point) {
  return point && Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude));
}

router.post("/compare", async (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (!validPoint(origin) || !validPoint(destination)) {
      return res.status(400).json({
        success: false,
        message: "Origin and destination coordinates are required.",
      });
    }

    const routes = await compareRoutes(
      {
        latitude: Number(origin.latitude),
        longitude: Number(origin.longitude),
      },
      {
        latitude: Number(destination.latitude),
        longitude: Number(destination.longitude),
      }
    );

    res.json({
      success: true,
      provider: "OSRM",
      routes,
    });
  } catch (error) {
    console.error("Route comparison error:", error);
    res.status(502).json({
      success: false,
      message: "Unable to calculate routes right now.",
    });
  }
});

module.exports = router;

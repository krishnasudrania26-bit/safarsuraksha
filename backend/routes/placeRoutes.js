const express = require("express");
const { searchPlaces } = require("../services/geocodingService");

const router = express.Router();

router.get("/search", async (req, res) => {
  try {
    const results = await searchPlaces(req.query.q);
    res.json({ success: true, results });
  } catch (error) {
    console.error("Place search error:", error);
    res.status(502).json({
      success: false,
      message: "Destination search is temporarily unavailable.",
    });
  }
});

module.exports = router;

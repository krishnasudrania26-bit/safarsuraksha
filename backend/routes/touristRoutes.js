const express = require("express");
const Tourist = require("../models/Tourist");

const router = express.Router();

// Generate Digital Tourist ID
function generateTouristId() {
  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `SS-${new Date().getFullYear()}-${random}`;
}


// ===============================
// REGISTER TOURIST
// ===============================
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      phone,
      emergencyContact,
      destination,
      locationPermission,
      latitude,
      longitude,
    } = req.body;

    // Check required information
    if (
      !name ||
      !phone ||
      !emergencyContact ||
      !destination
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required information.",
      });
    }

    // Create tourist
    const tourist = await Tourist.create({
      touristId: generateTouristId(),
      name,
      phone,
      emergencyContact,
      destination,
      locationPermission: locationPermission || false,

      currentLocation: {
        latitude: latitude || null,
        longitude: longitude || null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Tourist registered successfully.",
      tourist,
    });

  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Tourist registration failed.",
    });
  }
});


// ===============================
// GET ALL TOURISTS
// ===============================
router.get("/", async (req, res) => {
  try {
    const tourists = await Tourist.find()
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tourists.length,
      tourists,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch tourists.",
    });
  }
});


// ===============================
// GET TOURIST BY DIGITAL ID
// ===============================
router.get("/:touristId", async (req, res) => {
  try {
    const tourist = await Tourist.findOne({
      touristId: req.params.touristId,
    });

    if (!tourist) {
      return res.status(404).json({
        success: false,
        message: "Tourist not found.",
      });
    }

    res.json({
      success: true,
      tourist,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch tourist.",
    });
  }
});


// ===============================
// UPDATE TOURIST LOCATION
// ===============================
router.put("/:touristId/location", async (req, res) => {
  try {
    const {
      latitude,
      longitude,
    } = req.body;

    const tourist = await Tourist.findOneAndUpdate(
      {
        touristId: req.params.touristId,
      },
      {
        currentLocation: {
          latitude,
          longitude,
        },
      },
      {
        new: true,
      }
    );

    if (!tourist) {
      return res.status(404).json({
        success: false,
        message: "Tourist not found.",
      });
    }

    res.json({
      success: true,
      message: "Location updated successfully.",
      tourist,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Location update failed.",
    });
  }
});


module.exports = router;
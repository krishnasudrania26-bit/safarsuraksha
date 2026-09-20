const mongoose = require("mongoose");

const journeySchema = new mongoose.Schema(
  {
    touristId: { type: String, required: true },
    destination: { type: String, required: true },
    routeName: { type: String, required: true },
    routeDistance: { type: Number, required: true },
    safetyScore: { type: Number, required: true },
    routeGeometry: { type: Object, default: null },
    destinationLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    status: {
      type: String,
      enum: ["PLANNED", "ACTIVE", "DEVIATED", "SOS", "COMPLETED"],
      default: "PLANNED",
    },
    currentLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
    },
    distanceFromRoute: { type: Number, default: 0 },
    routeDeviation: { type: Boolean, default: false },
    incidentWarning: { type: Boolean, default: false },
    sosActive: { type: Boolean, default: false },
    lastLocationAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Journey", journeySchema);

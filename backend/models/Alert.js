const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    touristId: { type: String, required: true, index: true },
    journeyId: { type: mongoose.Schema.Types.ObjectId, ref: "Journey", default: null, index: true },
    type: {
      type: String,
      enum: ["SOS", "ROUTE_DEVIATION", "RISK_ZONE", "SAFETY_CHECK"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "ACKNOWLEDGED", "RESOLVED", "CANCELLED"],
      default: "ACTIVE",
      index: true,
    },
    message: { type: String, required: true, trim: true },
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

alertSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Alert", alertSchema);

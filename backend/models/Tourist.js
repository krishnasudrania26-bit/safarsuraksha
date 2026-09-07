const mongoose = require("mongoose");

const touristSchema = new mongoose.Schema(
  {
    touristId: {
      type: String,
      unique: true,
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
    },

    emergencyContact: {
      type: String,
      required: true,
    },

    destination: {
      type: String,
      required: true,
    },

    locationPermission: {
      type: Boolean,
      default: false,
    },

    currentLocation: {
      latitude: {
        type: Number,
        default: null,
      },

      longitude: {
        type: Number,
        default: null,
      },
    },

    status: {
      type: String,
      enum: ["SAFE", "MONITORING", "SOS"],
      default: "SAFE",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Tourist", touristSchema);
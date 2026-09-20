const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const touristRoutes = require("./routes/touristRoutes");
const journeyRoutes = require("./routes/journeyRoutes");
const safetyRoutes = require("./routes/safetyRoutes");
const alertRoutes = require("./routes/alertRoutes");
const placeRoutes = require("./routes/placeRoutes");
const routingRoutes = require("./routes/routingRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// ===============================
// MIDDLEWARE
// ===============================

const allowedOrigins = process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim()) : true;
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ success: true, service: "safarsuraksha-api", timestamp: new Date().toISOString() });
});


// ===============================
// BASIC TEST ROUTE
// ===============================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SafarSuraksha Backend is running 🚀",
    version: "1.0.0",
  });
});


// ===============================
// TOURIST API
// ===============================

app.use("/api/tourists", touristRoutes);
app.use("/api/journeys", journeyRoutes);
app.use("/api/safety", safetyRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/routes", routingRoutes);


// ===============================
// MONGODB CONNECTION
// ===============================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

  app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SafarSuraksha backend running on port ${PORT}`);
});
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:");
    console.error(error.message);
  });
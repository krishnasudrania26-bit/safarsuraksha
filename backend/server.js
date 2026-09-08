const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const touristRoutes = require("./routes/touristRoutes");
const journeyRoutes = require("./routes/journeyRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());
app.use(express.json());


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
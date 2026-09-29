const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

function sign(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, touristId: user.touristId || null, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
}

router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ success: false, message: "Phone and password are required." });

    const user = await User.findOne({ phone, active: true });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: "Invalid phone or password." });
    }

    res.json({ success: true, token: sign(user), user: { name: user.name, role: user.role, touristId: user.touristId } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Unable to sign in." });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { name, phone, password, role = "TOURIST", touristId = null } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ success: false, message: "Name, phone and password are required." });
    if (!["TOURIST", "AUTHORITY"].includes(role)) return res.status(400).json({ success: false, message: "Invalid role." });
    if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });

    const existing = await User.findOne({ phone });
    if (existing) return res.status(409).json({ success: false, message: "An account already exists for this phone." });

    const user = await User.create({
      name, phone, touristId: touristId || null,
      role, passwordHash: await bcrypt.hash(password, 12),
    });

    res.status(201).json({ success: true, token: sign(user), user: { name: user.name, role: user.role, touristId: user.touristId } });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, message: "Unable to create account." });
  }
});

module.exports = router;

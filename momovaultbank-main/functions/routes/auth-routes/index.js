const express = require("express");
const {
  registerUser,
  loginUser,
  forgotPassword,
} = require("../../controllers/auth-controller/index");
const authenticateMiddleware = require("../../middlewares/auth-middleware");
const User = require("../../models/User");

const router = express.Router();

// Registration endpoint - creates user in Firebase Auth and MongoDB
router.post("/register", registerUser);

// Login endpoint - accepts Firebase ID token and returns user data
router.post("/login", loginUser);

// Forgot password endpoint - generates password reset link
router.post("/forgot-password", forgotPassword);

// Check authentication status
router.get("/check-auth", authenticateMiddleware, (req, res) => {
  const user = req.user;

  res.status(200).json({
    success: true,
    message: "Authenticated user!",
    data: {
      user,
    },
  });
});

// Get user by ID (public route - exclude sensitive data)
router.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password -firebaseUID");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error("Error fetching user by ID:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;

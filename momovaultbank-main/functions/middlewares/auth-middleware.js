const admin = require("../config/firebase-admin");
const User = require("../models/User");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "User is not authenticated",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token not provided",
      });
    }

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      console.error("Token verification error:", error);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
        error: error.message,
      });
    }

    const firebaseUID = decodedToken.uid;

    // Find user in MongoDB by Firebase UID
    const user = await User.findOne({ firebaseUID });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found in database",
      });
    }

    // Attach user data to request object (maintain same interface as before)
    req.user = {
      _id: user._id,
      userName: user.userName,
      userEmail: user.userEmail,
      phoneNumber: user.phoneNumber,
      role: user.role,
      firebaseUID: user.firebaseUID,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed",
      error: error.message,
    });
  }
};

module.exports = authenticate;

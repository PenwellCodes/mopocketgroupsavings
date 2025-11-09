const User = require("../../models/User");
const admin = require("../../config/firebase-admin");
const axios = require("axios");

const registerUser = async (req, res) => {
  let firebaseUser = null;
  
  try {
    const { userName, userEmail, password, phoneNumber, role } = req.body;

    // Validate required fields
    if (!userName || !userEmail || !password || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userName, userEmail, password, phoneNumber",
      });
    }

    // Check if user already exists in MongoDB
    const existingUser = await User.findOne({
      $or: [{ userEmail }, { userName }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User name or user email already exists",
      });
    }

    // Create user in Firebase Auth
    try {
      firebaseUser = await admin.auth().createUser({
        email: userEmail,
        password: password,
        displayName: userName,
        emailVerified: false, // Can be set to true if email verification is not required
      });
    } catch (firebaseError) {
      // Handle Firebase Auth errors
      if (firebaseError.code === "auth/email-already-exists") {
        return res.status(400).json({
          success: false,
          message: "Email already exists in Firebase Auth",
        });
      }
      
      // Handle permission errors with helpful message
      if (firebaseError.code === "auth/internal-error" || 
          firebaseError.message?.includes("PERMISSION_DENIED") ||
          firebaseError.message?.includes("serviceusage")) {
        console.error("Firebase Auth permission error:", firebaseError);
        return res.status(500).json({
          success: false,
          message: "Firebase service account lacks required permissions",
          error: "The service account needs the 'Service Usage Consumer' role. Please grant the 'roles/serviceusage.serviceUsageConsumer' role to your service account in Google Cloud Console.",
          details: "Visit: https://console.developers.google.com/iam-admin/iam/project?project=motrack-ce230",
          serviceAccount: "firebase-adminsdk-fbsvc@motrack-ce230.iam.gserviceaccount.com"
        });
      }
      
      console.error("Firebase Auth error:", firebaseError);
      return res.status(500).json({
        success: false,
        message: "Failed to create user in Firebase Auth",
        error: firebaseError.message,
      });
    }

    // Save user to MongoDB with Firebase UID
    const newUser = new User({
      userName,
      userEmail,
      phoneNumber,
      role: role || "user",
      firebaseUID: firebaseUser.uid,
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: "User registered successfully!",
      data: {
        firebaseUID: firebaseUser.uid,
        user: {
          _id: newUser._id,
          userName: newUser.userName,
          userEmail: newUser.userEmail,
          phoneNumber: newUser.phoneNumber,
          role: newUser.role,
        },
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    
    // If MongoDB save failed but Firebase user was created, clean up Firebase user
    if (firebaseUser && firebaseUser.uid) {
      try {
        await admin.auth().deleteUser(firebaseUser.uid);
        console.log("Cleaned up Firebase user:", firebaseUser.uid);
      } catch (deleteError) {
        console.error("Failed to clean up Firebase user:", deleteError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to register user",
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Firebase ID token is required",
      });
    }

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
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

    // Return user data (token is already verified by Firebase)
    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      data: {
        idToken, // Return the same token for frontend use
        user: {
          _id: user._id,
          userName: user.userName,
          userEmail: user.userEmail,
          phoneNumber: user.phoneNumber,
          role: user.role,
          firebaseUID: user.firebaseUID,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if user exists in Firebase Auth and MongoDB
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUserByEmail(email);
    } catch (error) {
      // If user doesn't exist, still return success (security best practice)
      // Don't reveal whether email exists or not
      return res.status(200).json({
        success: true,
        message: "If the email exists, a password reset link has been sent to your email address",
      });
    }

    // Generate password reset link with action code settings
    const resetLink = await admin.auth().generatePasswordResetLink(email, {
      url: process.env.PASSWORD_RESET_REDIRECT_URL || "http://localhost:5173/reset-password",
      handleCodeInApp: false,
      // Additional settings for the reset link
      iOS: {
        bundleId: process.env.IOS_BUNDLE_ID,
      },
      android: {
        packageName: process.env.ANDROID_PACKAGE_NAME,
        installApp: true,
      },
      // Dynamic link domain (if using Firebase Dynamic Links)
      dynamicLinkDomain: process.env.FIREBASE_DYNAMIC_LINK_DOMAIN,
    });

    // Send password reset email using Firebase REST API (Identity Toolkit API)
    // This uses Firebase's built-in email service
    if (process.env.FIREBASE_API_KEY) {
      try {
        await axios.post(
          `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${process.env.FIREBASE_API_KEY}`,
          {
            requestType: "PASSWORD_RESET",
            email: email,
            continueUrl: process.env.PASSWORD_RESET_REDIRECT_URL || "http://localhost:5173/reset-password",
          }
        );

        // If successful, Firebase will send the email automatically
        return res.status(200).json({
          success: true,
          message: "Password reset email has been sent to your email address",
        });
      } catch (apiError) {
        console.error("Firebase API error:", apiError.response?.data || apiError.message);
        // Fall through to return the reset link if API fails
      }
    }

    // Fallback: If API key is not configured or API call fails,
    // return the reset link (for development) or send via email service
    // In production, you should configure FIREBASE_API_KEY or use an email service
    
    // For development: return the link (remove in production)
    if (process.env.NODE_ENV !== "production") {
      return res.status(200).json({
        success: true,
        message: "Password reset link generated. In production, this would be sent via email.",
        resetLink, // Remove this in production
        note: "Configure FIREBASE_API_KEY in environment variables to use Firebase's built-in email service",
      });
    }

    // In production without API key, you should integrate with an email service
    // For now, return a generic message
    return res.status(200).json({
      success: true,
      message: "If the email exists, a password reset link has been sent to your email address",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    
    // Still return success to prevent email enumeration
    return res.status(200).json({
      success: true,
      message: "If the email exists, a password reset link has been sent to your email address",
    });
  }
};

module.exports = { registerUser, loginUser, forgotPassword };

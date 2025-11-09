const admin = require("firebase-admin");
const dotenv = require("dotenv");

dotenv.config();

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Preferred: use JSON key file path
      // admin.credential.cert() can accept a file path string directly
      admin.initializeApp({
        credential: admin.credential.cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      console.log("✅ Firebase Admin SDK initialized using service account file");
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Fallback: parse JSON string from env
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
      });
      console.log("✅ Firebase Admin SDK initialized using FIREBASE_SERVICE_ACCOUNT_KEY");
    } else {
      console.warn("⚠️  Firebase Admin SDK not initialized — missing credentials");
    }
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error.message);
    if (error.code === 'ENOENT') {
      console.error(`   File not found: ${error.path || process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
      console.error("   Make sure the file path in GOOGLE_APPLICATION_CREDENTIALS is correct.");
    }
  }
}

module.exports = admin;

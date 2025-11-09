# Quick Start: Firebase Setup

## 🚀 Fastest Setup (Recommended)

### Step 1: Save Your Firebase Service Account Key

1. Create a file named `firebase-service-account.json` in the `functions` folder
2. Copy and paste your entire Firebase service account JSON into this file:

```json
{
  "type": "service_account",
  "project_id": "motrack-ce230",
  "private_key_id": "8e3d22c73efc7fad71e55b36ff1e92657d11a09c",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@motrack-ce230.iam.gserviceaccount.com",
  "client_id": "108909887159263601694",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40motrack-ce230.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

3. Save the file (make sure it's valid JSON)

### Step 2: Update Your .env File

Add these lines to your `.env` file in the `functions` folder:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=motrack-ce230
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json

# Optional: For password reset emails (get this from Firebase Console)
# FIREBASE_API_KEY=your_firebase_web_api_key
# PASSWORD_RESET_REDIRECT_URL=http://localhost:5173/reset-password
```

### Step 3: Test It

1. Start your server: `npm start`
2. You should see: `Firebase Admin SDK initialized successfully` in the console
3. If you see an error, check that:
   - The JSON file is in the `functions` folder
   - The file path in `.env` is correct: `./firebase-service-account.json`
   - The JSON is valid (no syntax errors)

## ✅ That's It!

Your Firebase Authentication is now configured. The service account file is automatically ignored by git (already in `.gitignore`).

## Next Steps

1. **Enable Firebase Authentication:**
   - Go to [Firebase Console](https://console.firebase.google.com/project/motrack-ce230)
   - Click **Authentication** > **Get started**
   - Enable **Email/Password** sign-in method

2. **Get Web API Key (for password reset):**
   - Firebase Console > Project Settings > General
   - Copy the **Web API Key**
   - Add it to `.env` as `FIREBASE_API_KEY`

3. **Test Registration:**
   - Try registering a new user via your API
   - Check Firebase Console > Authentication > Users to see the new user

## Need More Help?

See `FIREBASE_SETUP.md` for detailed instructions and troubleshooting.


# Frontend Firebase Integration Guide

## Files to Create/Update

1. **Firebase Config** - `src/config/firebase.js` or `src/firebase/config.js`
2. **AuthContext** - `src/context/auth-context.jsx` or `src/context/AuthContext.jsx`
3. **Axios Instance** - `src/api/axiosInstance.js` (update existing)
4. **Auth Page** - `src/pages/auth/index.jsx` (already provided, will work with updated context)

## Installation

First, install Firebase SDK in your frontend:

```bash
npm install firebase
```

## Firebase Configuration

You'll need your Firebase Web App configuration from Firebase Console:
1. Go to Firebase Console > Project Settings
2. Scroll to "Your apps" section
3. Click the web icon (</>) to add a web app or view existing
4. Copy the `firebaseConfig` object

## Environment Variables

Add to your frontend `.env` file:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=motrack-ce230.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=motrack-ce230
VITE_FIREBASE_STORAGE_BUCKET=motrack-ce230.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```


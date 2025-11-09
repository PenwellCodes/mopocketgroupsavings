# Frontend Firebase Integration - Implementation Guide

## Overview

The frontend has been updated to use Firebase Authentication. The backend creates Firebase users and manages MongoDB sync, while the frontend handles authentication UI and token management.

## Files Created/Updated

### 1. Firebase Configuration (`src/config/firebase.js`)
- Initializes Firebase app and auth
- Uses environment variables for configuration

### 2. AuthContext (`src/context/auth-context.jsx`)
- **Updated** to use Firebase Auth instead of JWT
- Handles registration, login, logout, and password reset
- Manages auth state and token refresh
- Syncs with backend for user data

### 3. Axios Instance (`src/api/axiosInstance.js`)
- **Updated** to use Firebase ID tokens instead of JWT
- Automatically adds Firebase ID token to requests
- Handles token refresh on 401 errors

### 4. Auth Page (`src/pages/auth/index.jsx`)
- **Updated** to use new `useAuth` hook
- No major changes needed - works with updated context

## Installation Steps

### 1. Install Firebase SDK

```bash
npm install firebase
```

### 2. Get Firebase Web App Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/project/motrack-ce230)
2. Click the gear icon ⚙️ > **Project Settings**
3. Scroll to **Your apps** section
4. If you don't have a web app, click the web icon `</>` to add one
5. Copy the `firebaseConfig` object

### 3. Add Environment Variables

Create or update your `.env` file in the frontend root:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=motrack-ce230.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=motrack-ce230
VITE_FIREBASE_STORAGE_BUCKET=motrack-ce230.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here

# Optional: Password Reset Redirect URL
VITE_PASSWORD_RESET_REDIRECT_URL=http://localhost:5173/reset-password

# API URL (your existing backend URL)
VITE_API_URL=http://localhost:5001
```

### 4. Update Your App.jsx or Main Entry Point

Make sure your app is wrapped with `AuthProvider`:

```jsx
import { AuthProvider } from "@/context/auth-context";
import { BrowserRouter } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Your app routes */}
      </AuthProvider>
    </BrowserRouter>
  );
}
```

### 5. Update Imports in Your Files

Replace any old imports:
- `import { AuthContext } from "@/context/auth-context"` 
- With: `import { useAuth } from "@/context/auth-context"`

## How It Works

### Registration Flow

1. User fills out registration form
2. Frontend calls `/auth/register` with user data
3. Backend creates Firebase user and MongoDB user
4. Frontend signs in with Firebase to get ID token
5. Token stored in sessionStorage
6. User redirected to home page

### Login Flow

1. User enters email and password
2. Frontend authenticates with Firebase Auth
3. Frontend gets Firebase ID token
4. Frontend sends token to `/auth/login` endpoint
5. Backend verifies token and returns user data
6. Token and user data stored in sessionStorage
7. User redirected to home page

### API Requests

1. Before each API request, axios interceptor gets fresh Firebase ID token
2. Token added to `Authorization: Bearer <token>` header
3. Backend verifies token and fetches user from MongoDB
4. If token expires (401), interceptor refreshes token and retries

### Token Refresh

- Firebase tokens automatically refresh when needed
- `onAuthStateChanged` listener updates user state
- Axios interceptor handles token refresh on 401 errors

## Key Changes from JWT to Firebase

### Before (JWT):
```jsx
// Login
const response = await axios.post("/auth/login", { userEmail, password });
const { accessToken } = response.data;
sessionStorage.setItem("accessToken", JSON.stringify(accessToken));
```

### After (Firebase):
```jsx
// Login
const userCredential = await signInWithEmailAndPassword(auth, userEmail, password);
const idToken = await userCredential.user.getIdToken();
const response = await axios.post("/auth/login", { idToken });
sessionStorage.setItem("accessToken", JSON.stringify(idToken));
```

## Available Auth Functions

From `useAuth()` hook:

- `user` - Current user object (from MongoDB)
- `loading` - Loading state
- `signInFormData` / `setSignInFormData` - Login form state
- `signUpFormData` / `setSignUpFormData` - Registration form state
- `handleRegisterUser` - Register new user
- `handleLoginUser` - Login user
- `handleLogout` - Logout user
- `handleForgotPassword` - Send password reset email
- `refreshToken` - Manually refresh token

## Example Usage

```jsx
import { useAuth } from "@/context/auth-context";

function MyComponent() {
  const { user, handleLogout, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please login</div>;

  return (
    <div>
      <p>Welcome, {user.userName}!</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
```

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Check that Firebase config is properly set in `.env`
- Verify all environment variables are prefixed with `VITE_`
- Restart your dev server after adding env variables

### "Firebase: Error (auth/api-key-not-valid)"
- Verify your API key in Firebase Console
- Make sure you're using the Web API Key, not the Server Key

### "User not found in database" after login
- This means Firebase user exists but MongoDB user doesn't
- Check backend logs for registration errors
- User may need to re-register

### Token not being sent with requests
- Check that `auth.currentUser` exists
- Verify Firebase is initialized before making requests
- Check browser console for Firebase errors

### CORS errors
- Make sure backend CORS is configured for your frontend URL
- Check that `Authorization` header is allowed in CORS config

## Security Notes

- Firebase ID tokens are short-lived (1 hour)
- Tokens automatically refresh when needed
- Never expose Firebase service account keys in frontend
- Only use Web API Key in frontend (not service account)
- Tokens are stored in sessionStorage (cleared on browser close)

## Next Steps

1. Test registration flow
2. Test login flow
3. Test protected routes
4. Add forgot password UI (if not already present)
5. Test token refresh on long sessions
6. Add loading states and error handling UI


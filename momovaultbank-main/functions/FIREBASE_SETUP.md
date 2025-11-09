# Firebase Setup Instructions

## Step 1: Add Firebase Service Account Key to .env

You have two options for adding your Firebase service account key:

### Option 1: JSON String (Recommended for Deployment)

**Easy Way:** Use the helper script to format your JSON:
1. Save your JSON to a file (e.g., `temp-firebase-key.json`)
2. Run: `node scripts/format-firebase-key.js temp-firebase-key.json`
3. Copy the output to your `.env` file

**Manual Way:** Add the entire JSON as a single-line string. The JSON needs to be properly escaped:
- All quotes escaped
- Newlines replaced with `\n`
- Wrapped in quotes

**Example format:**
```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"motrack-ce230",...}
```

### Option 2: File Path (Recommended for Local Development - EASIEST)

1. Save your service account JSON to a file named `firebase-service-account.json`
2. Place it in the `functions` directory (same folder as `index.js`)
3. The file is already ignored by `.gitignore` (it ignores `*.json` files with sensitive data)
4. Add to your `.env` file:

```env
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
FIREBASE_PROJECT_ID=motrack-ce230
```

**Quick Setup:**
1. Create `firebase-service-account.json` in the `functions` folder
2. Paste your entire JSON (the one you received from Firebase)
3. Save the file
4. Add the two lines above to your `.env` file

## Step 2: Add Required Environment Variables

Add these to your `.env` file:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=motrack-ce230

# Choose ONE of the following:
# Option 1: JSON string
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Option 2: File path
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json

# Optional: For password reset emails
FIREBASE_API_KEY=your_firebase_web_api_key
PASSWORD_RESET_REDIRECT_URL=http://localhost:5173/reset-password
```

## Step 3: Get Firebase Web API Key (Optional - for password reset)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **motrack-ce230**
3. Click the gear icon ⚙️ > **Project Settings**
4. Scroll down to **Your apps** section
5. Copy the **Web API Key** (starts with `AIza...`)
6. Add it to `.env` as `FIREBASE_API_KEY`

## Step 4: Configure Firebase Authentication

1. Go to Firebase Console > **Authentication**
2. Click **Get started** (if not already enabled)
3. Go to **Sign-in method** tab
4. Enable **Email/Password** provider
5. (Optional) Configure email templates for password reset:
   - Go to **Templates** tab
   - Customize the password reset email template

## Step 5: Configure Authorized Domains

1. In Firebase Console > **Authentication** > **Settings** > **Authorized domains**
2. Add your frontend domain (e.g., `localhost`, your production domain)
3. This allows password reset emails to work from your domain

## Step 6: Test the Configuration

1. Start your server: `npm start`
2. Check the console for: `Firebase Admin SDK initialized successfully`
3. If you see an error, check:
   - Service account key is correctly formatted
   - Project ID matches your Firebase project
   - All required fields are present

## Security Notes

⚠️ **IMPORTANT:**
- Never commit your `.env` file or service account JSON to git
- The `.env` file is already in `.gitignore`
- If using a service account file, make sure it's also in `.gitignore`
- Keep your service account keys secure and rotate them periodically
- Never expose service account keys in client-side code

## Troubleshooting

### Error: "Firebase Admin SDK not initialized"
- Check that `FIREBASE_SERVICE_ACCOUNT_KEY` or `GOOGLE_APPLICATION_CREDENTIALS` is set
- Verify the JSON is properly formatted (if using JSON string)
- Check that the file path is correct (if using file path)

### Error: "Invalid credential"
- Verify your service account key is correct
- Check that the project ID matches: `motrack-ce230`
- Ensure all required fields are present in the JSON

### Password Reset Not Working
- Make sure `FIREBASE_API_KEY` is set (for email sending)
- Verify email templates are configured in Firebase Console
- Check that your domain is in authorized domains list


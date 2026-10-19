# Jobify — Google authentication and light-theme update

## Changes made
- Updated `frontend/src/components/GoogleAuthButton.js` so web uses the browser redirect URI while Android/iOS keep native redirect handling.
- Logs the exact web redirect URI in the browser console when the Google button is clicked, so it can be registered accurately.
- Removed visible theme toggle controls and fixed the app to light mode, regardless of any previously saved theme preference.
- Preserved backend API routes, frontend navigation, application features, and dependencies.
- Preserved the frontend `.env` because it contains only public Expo configuration and OAuth client IDs; excluded `backend/.env` because it contained private credentials. Use the `.env.example` templates for reference.

## Run the frontend
In PowerShell, open the project folder and run:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
```

Edit `frontend/.env` and enter your real client IDs. Do not add Google client secrets to the frontend app.

Start Expo:

```powershell
npx expo start --clear
```

## Google OAuth setup for browser testing
1. Open Google Cloud Console → APIs & Services → Credentials.
2. Select the same Google Cloud project that owns the Web OAuth client ID in `frontend/.env`.
3. Open the OAuth client of type **Web application**.
4. Under **Authorized JavaScript origins**, add `http://localhost:8081`.
5. Run the app, open the browser DevTools console, and click **Continue with Google**. The app logs `[Jobify Google OAuth] redirect URI: ...`.
6. Copy that exact URI and add it under **Authorized redirect URIs** for the same Web client. Do not guess it; the port or path can differ by setup.
7. Save, wait a few minutes, restart Expo with `npx expo start --clear`, and test again.

The code cannot edit Google Cloud Console on your behalf. A `redirect_uri_mismatch` error persists until the URI sent by the app exactly matches an authorized redirect URI for the selected Web client.

## Native Android
- Use an Android OAuth client configured for package `com.jobify.mobile`.
- Its SHA-1 must match the keystore used to sign the APK/AAB. Do not create a replacement keystore just to fix a web redirect mismatch.
- Test Android authentication on the installed native app; browser testing at `localhost:8081` uses the Web OAuth client.

## Backend
The backend source and API routes are unchanged. Create `backend/.env` from `backend/.env.example` and supply your own database, JWT, email, payment, Cloudinary, and Google settings before running the backend. Set `GOOGLE_ANDROID_CLIENT_ID` to the same Android client ID configured in the frontend; the backend verifies ID tokens against its configured client IDs.

## Security note
The original ZIP contained `backend/.env` with live-looking database, email, JWT, payment, and Cloudinary credentials. That file is deliberately not included in this updated ZIP. Rotate/revoke those credentials with their providers, especially the database password, JWT secret, email credentials, Razorpay secret, and Cloudinary API secret. The frontend `.env` contains public client IDs only; Google OAuth client IDs are not client secrets. Do not commit `.env` files.

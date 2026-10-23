# ResourceHub

ResourceHub is a campus marketplace for PSG College of Technology students. Students can list items, request purchases, and manage their listings and orders. Administrators have a separate dashboard for marketplace operations.

## Run locally

Requirements: Node.js, a Firebase project for student accounts and marketplace data, a Cloudinary unsigned upload preset for product images, and (for account recovery) a Firebase Functions Blaze-plan project with Resend and Twilio Verify configured.

1. Install packages:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the five Firebase web-app values and the Cloudinary values below. `VITE_MERCHANT_UPI_ID` is an optional public UPI destination used by the demo payment screen when a seller has not supplied one:

   ```dotenv
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   VITE_MERCHANT_UPI_ID=
   VITE_CLOUDINARY_CLOUD_NAME=
   VITE_CLOUDINARY_UPLOAD_PRESET=
   ```

3. In Firebase, enable Email/Password Authentication and create a Firestore database. Deploy `firestore.rules` for transaction, role, report, and verified-phone permissions. For images, open the Cloudinary Console, copy the cloud name from the dashboard, then go to **Settings → Upload → Upload presets → Add upload preset**. Set **Signing Mode** to **Unsigned**, restrict allowed formats to JPG/PNG/WEBP and the file size to 5 MB, save the preset, and put its exact name in `VITE_CLOUDINARY_UPLOAD_PRESET`. Put the dashboard cloud name in `VITE_CLOUDINARY_CLOUD_NAME`, then restart Vite. Never put the Cloudinary API secret in `.env` or frontend code. Without both values, image publishing displays “Image upload is not configured. Please contact the administrator.”
4. Start the development server:

   ```sh
   npm run dev
   ```

Open the local URL printed by Vite. Do not commit `.env` or put private credentials in client-side environment variables. The Firebase web app config is used by the browser; secure access with Firebase Rules.

## Deploy the web app

1. Install the Firebase CLI and sign in with an account that can deploy to the Firebase project:

   ```sh
   npm install -g firebase-tools
   firebase login
   ```

2. Set the production Firebase web-app and Cloudinary values in a local `.env` file. Do not commit `.env`; Vite embeds `VITE_` values in the public client bundle, so only use browser-safe Firebase configuration and an unsigned, restricted Cloudinary upload preset.
3. Build and deploy Hosting from the project root:

   ```sh
   npm run build
   firebase deploy --only hosting --project YOUR_FIREBASE_PROJECT_ID
   ```

   The Firebase Hosting configuration serves the `dist` build. Firebase prints the public URL after deployment. Configure that domain in Firebase Authentication's authorized domains if it is not already listed.
4. Deploy Firestore rules and Cloud Functions separately with `npm run deploy:functions` after configuring the Firebase Functions secrets and production email/SMS providers described below. Password recovery and phone verification require those functions; the public website can be hosted independently.

## Secure password recovery setup

Password recovery uses a custom, one-time email link and a required SMS OTP. Firebase's standard password-reset action code can be submitted directly to Firebase to change the password, so it cannot enforce this additional factor. Instead, the trusted callable backend validates the one-time email capability and uses Firebase Admin Authentication to update the password only after both factors pass. It reads the user's verified profile phone and checks OTPs through Twilio Verify. No SMS credentials or reset secrets belong in the Vite environment.

1. Upgrade the Firebase project to the Blaze plan, install the Firebase CLI, use Node.js 22 for Functions, and run `npm install` from the `functions` directory.
2. In Resend, verify the sending domain and create an API key. In Twilio, create a Verify Service and ensure SMS delivery to your users is enabled.
3. Configure backend secrets (the CLI prompts for values; do not commit them):

   ```sh
   firebase functions:secrets:set RESEND_API_KEY
   firebase functions:secrets:set TWILIO_ACCOUNT_SID
   firebase functions:secrets:set TWILIO_AUTH_TOKEN
   firebase functions:secrets:set TWILIO_VERIFY_SERVICE_SID
   ```

4. Deploy Functions and Firestore rules with `npm run deploy:functions`. On first deploy, supply `RESET_FROM_EMAIL` as a Resend-verified sender (for example, `ResourceHub <no-reply@example.edu>`) and `WEB_APP_URL` as the HTTPS public app origin. The generated email links use the application's hash route.
5. Existing and new student accounts must verify their phone from **Profile**. Older profiles and registration phone numbers are not trusted as verified until an OTP is confirmed. The client is not allowed to set `phoneVerified: true`; changing a phone resets its verification state.

The backend stores only SHA-256 digests of email and reset-session tokens. Twilio owns OTP issuance and expiry; backend attempts, resend cooldowns, email/IP rate limits, and one-time session consumption are enforced by callable functions. Firestore's default deny behavior applies to the internal `passwordResetLinks`, `passwordResetChallenges`, `phoneVerificationChallenges`, and `securityRateLimits` collections. Their `expiresAt` fields are Firestore timestamps and may be configured for TTL cleanup; TTL is cleanup only and is not relied on for authorization. Missing SMS/email configuration fails closed and is surfaced as an administrator setup error.

## Student guide

1. Choose **Create account** and register with an `@psgtech.ac.in` email address, a valid Indian phone number, your register number, and a password of at least six characters.
2. Open the verification email and verify the account. Verified email is required to use protected buying and selling pages.
3. Browse resources. To sell, open **Sell an Item**, enter the title, description, category, price, condition, quantity, and payment options, then publish. Product images upload to Cloudinary and only their secure URLs are stored in Firestore. UPI may use the seller's ID or configured merchant ID.
4. To buy, open a resource and select **Buy Now**. Checkout creates a purchase request. The seller must accept it before an order is created and stock is reserved.
5. For UPI orders, use **Pay now** in your dashboard to open the clearly labeled demo payment page. Opening a UPI app does not verify a bank payment. Selecting a demo outcome writes a payment record; a successful demo advances the order, and the seller marks handover complete.
6. Completed orders can be reviewed or returned from the dashboard. **Report** on a resource or **Report transaction** on an order creates a complaint that can be tracked in your dashboard.

## Admin guide

### Set up an administrator

There is no public administrator sign-up. With Firebase configured:

1. Create the administrator account in Firebase Authentication using Email/Password and verify its email.
2. In Firestore, create `users/{AUTH_UID}` using that account's exact Authentication UID. Add at least these fields:

   ```json
   {
     "email": "admin@example.com",
     "fullName": "ResourceHub Admin",
     "name": "ResourceHub Admin",
     "role": "admin"
   }
   ```

3. From the public site, choose **Login**, then **Admin Login**, and sign in with that Firebase account. The admin pages are available at `/#/admin/dashboard` after login.

The dashboard provides an overview; **Students** supports searching profiles and blocking/unblocking accounts; **Products** and **Orders** support search and detail views; **Returns** and **Complaints** expose submitted workflows for admin review; **Sales** shows order totals; and **Settings** displays marketplace status. Orders use persistent `RH-YYYY-N` display numbers while retaining their Firestore document IDs internally. Opening Orders backfills display numbers on legacy records. These pages require a working Firebase configuration and matching Firestore permissions.

## Payment and security notes

- UPI uses a project/demo result flow. It does not contact a payment gateway or verify a bank transfer. Do not describe demo success as real payment verification.
- Before deploying publicly, review Firestore rules and make administrator role assignment server-controlled. Do not rely on client-side role checks as the security boundary.
- Reset email is sent with Resend; mobile OTP is sent and verified by Twilio Verify. Keep all provider credentials in Firebase Functions secrets.
- Do not share passwords, UPI PINs, or banking credentials with buyers, sellers, or support.

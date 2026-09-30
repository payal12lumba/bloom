/* Sankalpa settings — fill in the 3 PASTE_ values once, and every device
   (laptop, phone, APK) connects automatically.
   These values are safe in a public repo: Firebase web keys are meant to be
   public. Your Firestore rules are what keep each person's data private.

   Where to find them:
   apiKey + appId → Firebase → ⚙️ Project settings → General → Your apps → bloom → Config
   vapid          → Firebase → ⚙️ Project settings → Cloud Messaging → Web Push certificates (Key pair)
   Keep the quotes " " around each value. */
window.BLOOM_CONFIG = {
  firebase: {
    apiKey: "PASTE_API_KEY",
    authDomain: "bloom-8d3fc.firebaseapp.com",
    projectId: "bloom-8d3fc",
    messagingSenderId: "481784985538",
    appId: "PASTE_APP_ID"
  },
  vapid: "PASTE_VAPID_KEY"
};

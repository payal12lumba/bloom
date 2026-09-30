
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
    apiKey: "AIzaSyCDwnIi6zk9zWCDj0F0AzGf0Ds6b5UXiuM",
    authDomain: "bloom-8d3fc.firebaseapp.com",
    projectId: "bloom-8d3fc",
    messagingSenderId: "481784985538",
    appId: "1:481784985538:web:286a5618511343bfcc885b"
  },
  vapid: "BFBq3PpGTsNVPx2nUFw9o_801UfjB75ZPdCuT7jTkeFHgIiYq2dYg233JUZVe_Inh6LHvnIxz2kUdk4t2jl0IQg"
};

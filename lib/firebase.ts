import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
const storage = getStorage(app);

// App Check (bot / abuse protection). Browser-only, and a NO-OP until
// NEXT_PUBLIC_RECAPTCHA_SITE_KEY is set AND App Check is enabled in the Firebase console
// with a reCAPTCHA v3 provider. Once live, the SDK attaches App Check tokens to Auth +
// Firestore calls automatically; turning on enforcement in the console then blocks
// unattested clients (e.g. a bot minting trials via createUserWithEmailAndPassword).
if (typeof window !== "undefined") {
    const appCheckSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (appCheckSiteKey) {
        import("firebase/app-check")
            .then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
                try {
                    initializeAppCheck(app, {
                        provider: new ReCaptchaV3Provider(appCheckSiteKey),
                        isTokenAutoRefreshEnabled: true,
                    });
                } catch (err) {
                    console.warn("App Check init failed:", err);
                }
            })
            .catch(() => {});
    }
}

export { app, auth, db, storage };

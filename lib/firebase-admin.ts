import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccount) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(serviceAccount)),
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            });
        } catch (error) {
            console.error("Error initializing Firebase Admin:", error);
            // Fallback to default credentials (works in Firebase environment)
            admin.initializeApp({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            });
        }
    } else {
        // For local development or if credentials not set
        admin.initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
    }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export default admin;

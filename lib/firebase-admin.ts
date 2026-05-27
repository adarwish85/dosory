import * as admin from "firebase-admin";

if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) {
        throw new Error(
            "FIREBASE_SERVICE_ACCOUNT_KEY is required to initialize Firebase Admin. " +
                "Set it in .env.local or your deployment environment to the JSON contents of a Firebase service-account key."
        );
    }

    let serviceAccount: admin.ServiceAccount;
    try {
        serviceAccount = JSON.parse(raw);
    } catch {
        throw new Error(
            "FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON. " +
                "Expected the full contents of a Firebase service-account JSON key."
        );
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export default admin;

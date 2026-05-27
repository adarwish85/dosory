/**
 * Shared Firebase Admin SDK initializer for scripts/.
 *
 * Source of credentials: FIREBASE_SERVICE_ACCOUNT_KEY env var (JSON blob).
 * Throws clearly if missing or malformed. No file fallback.
 *
 * Usage:
 *   import { admin, db, auth } from "./_admin";
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

function loadDotEnvLocal() {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;
    const envConfig = fs.readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (!match) return;
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = value;
    });
}

function initAdmin(): admin.app.App {
    if (admin.apps.length) return admin.app();

    loadDotEnvLocal();

    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) {
        throw new Error(
            "FIREBASE_SERVICE_ACCOUNT_KEY is required. " +
                "Set it in .env.local or your shell environment to the JSON contents of a Firebase service-account key."
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
    });
    return admin.app();
}

export const app = initAdmin();
export const auth = app.auth();
export const db = app.firestore();
export { admin };

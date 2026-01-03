#!/usr/bin/env npx tsx
/**
 * List Super Admin Users Script
 * 
 * Lists all users with isSuperAdmin custom claim set to true.
 * 
 * Usage:
 *   npx tsx scripts/listSuperAdmins.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
    // Initialize Firebase Admin SDK
    try {
        let serviceAccount: admin.ServiceAccount | undefined;

        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            } catch {
                const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
                if (fs.existsSync(keyPath)) {
                    serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
                }
            }
        }

        if (!serviceAccount) {
            const defaultPath = path.join(process.cwd(), 'service-account.json');
            if (fs.existsSync(defaultPath)) {
                serviceAccount = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
            }
        }

        if (!serviceAccount) {
            console.error('Firebase service account not found.');
            process.exit(1);
        }

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    } catch (error) {
        console.error('Failed to initialize Firebase Admin SDK:', error);
        process.exit(1);
    }

    const auth = admin.auth();
    const superAdmins: { uid: string; email: string; role: string }[] = [];

    // List all users (paginated)
    let nextPageToken: string | undefined;
    do {
        const listResult = await auth.listUsers(1000, nextPageToken);

        for (const user of listResult.users) {
            const claims = user.customClaims || {};
            if (claims.isSuperAdmin === true) {
                superAdmins.push({
                    uid: user.uid,
                    email: user.email || '(no email)',
                    role: claims.superRole || '(no role)'
                });
            }
        }

        nextPageToken = listResult.pageToken;
    } while (nextPageToken);

    console.log('');
    console.log('Super Admin Users:');
    console.log('==================');

    if (superAdmins.length === 0) {
        console.log('No Super Admin users found.');
        console.log('');
        console.log('To set a user as Super Admin, run:');
        console.log('  npx tsx scripts/setSuperAdminClaims.ts <uid> PlatformAdmin');
    } else {
        for (const admin of superAdmins) {
            console.log(`  ${admin.email}`);
            console.log(`    UID:  ${admin.uid}`);
            console.log(`    Role: ${admin.role}`);
            console.log('');
        }
    }
}

main().catch(console.error);

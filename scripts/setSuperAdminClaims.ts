#!/usr/bin/env npx tsx
/**
 * Super Admin Custom Claims Assignment Script
 * 
 * This script sets Firebase Auth custom claims for Super Admin users.
 * Run this manually after creating a user that needs Super Admin access.
 * 
 * Usage:
 *   npx tsx scripts/setSuperAdminClaims.ts <uid> [role]
 * 
 * Arguments:
 *   uid  - Firebase Auth User ID
 *   role - Optional: PlatformAdmin (default), ContentAdmin, SupportAgent, BillingAdmin, SecurityAdmin
 * 
 * Example:
 *   npx tsx scripts/setSuperAdminClaims.ts abc123xyz PlatformAdmin
 * 
 * After running this script, the user MUST:
 *   - Log out and log back in, OR
 *   - Force token refresh in the app
 * 
 * This is required because Firebase Auth tokens are cached for up to 1 hour.
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Valid Super Admin roles
const VALID_ROLES = [
    'PlatformAdmin',
    'ContentAdmin',
    'SupportAgent',
    'BillingAdmin',
    'SecurityAdmin'
] as const;

type SuperAdminRole = typeof VALID_ROLES[number];

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.error('Usage: npx tsx scripts/setSuperAdminClaims.ts <uid> [role]');
        console.error('');
        console.error('Arguments:');
        console.error('  uid  - Firebase Auth User ID');
        console.error('  role - Optional: PlatformAdmin (default), ContentAdmin, SupportAgent, BillingAdmin, SecurityAdmin');
        process.exit(1);
    }

    const uid = args[0];
    const role = (args[1] || 'PlatformAdmin') as SuperAdminRole;

    // Validate role
    if (!VALID_ROLES.includes(role)) {
        console.error(`Invalid role: ${role}`);
        console.error(`Valid roles: ${VALID_ROLES.join(', ')}`);
        process.exit(1);
    }

    // Initialize Firebase Admin SDK
    try {
        // Try to load service account from environment variable first
        let serviceAccount: admin.ServiceAccount | undefined;

        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            } catch {
                // If it's a path, read the file
                const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
                if (fs.existsSync(keyPath)) {
                    serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
                }
            }
        }

        // Fallback: look for service-account.json in project root
        if (!serviceAccount) {
            const defaultPath = path.join(process.cwd(), 'service-account.json');
            if (fs.existsSync(defaultPath)) {
                serviceAccount = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
            }
        }

        if (!serviceAccount) {
            console.error('Firebase service account not found.');
            console.error('Please set FIREBASE_SERVICE_ACCOUNT_KEY env var or place service-account.json in project root.');
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

    // Verify user exists
    let user: admin.auth.UserRecord;
    try {
        user = await auth.getUser(uid);
        console.log(`Found user: ${user.email || uid}`);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            console.error(`User not found: ${uid}`);
        } else {
            console.error('Error fetching user:', error.message);
        }
        process.exit(1);
    }

    // Set custom claims
    const claims = {
        isSuperAdmin: true,
        superRole: role
    };

    try {
        await auth.setCustomUserClaims(uid, claims);

        console.log('');
        console.log('✅ Custom claims set successfully!');
        console.log('');
        console.log('User:', user.email || uid);
        console.log('Claims:', JSON.stringify(claims, null, 2));
        console.log('');
        console.log('⚠️  IMPORTANT: The user must log out and log back in');
        console.log('   (or force token refresh) for changes to take effect.');
        console.log('');
    } catch (error: any) {
        console.error('Failed to set custom claims:', error.message);
        process.exit(1);
    }
}

main().catch(console.error);

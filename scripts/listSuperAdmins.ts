#!/usr/bin/env npx tsx
/**
 * List Super Admin Users Script
 *
 * Lists all users with isSuperAdmin custom claim set to true.
 *
 * Usage:
 *   npx tsx scripts/listSuperAdmins.ts
 */

import { auth } from "./_admin";

async function main() {
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
                    email: user.email || "(no email)",
                    role: claims.superRole || "(no role)",
                });
            }
        }

        nextPageToken = listResult.pageToken;
    } while (nextPageToken);

    console.log("");
    console.log("Super Admin Users:");
    console.log("==================");

    if (superAdmins.length === 0) {
        console.log("No Super Admin users found.");
        console.log("");
        console.log("To set a user as Super Admin, run:");
        console.log("  npx tsx scripts/setSuperAdminClaims.ts <uid> PlatformAdmin");
    } else {
        for (const admin of superAdmins) {
            console.log(`  ${admin.email}`);
            console.log(`    UID:  ${admin.uid}`);
            console.log(`    Role: ${admin.role}`);
            console.log("");
        }
    }
}

main().catch(console.error);

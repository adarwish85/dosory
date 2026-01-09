/**
 * This script fixes user profiles that are missing orgId
 * Run with: node fix-profile.js YOUR_USER_ID
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixUserProfile(userId) {
    try {
        // Get user document
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            console.error('User not found:', userId);
            return;
        }

        const userData = userDoc.data();
        console.log('Current user data:', userData);

        // Check if orgId is missing
        if (!userData.orgId && !userData.organizationId) {
            console.log('orgId is missing, attempting to fix...');

            // Try to find an organization owned by this user
            const orgsSnapshot = await db.collection('organizations')
                .where('ownerId', '==', userId)
                .limit(1)
                .get();

            let orgId;
            if (!orgsSnapshot.empty) {
                orgId = orgsSnapshot.docs[0].id;
                console.log('Found owned organization:', orgId);
            } else {
                // Fallback: use uid as orgId
                orgId = userId;
                console.log('No organization found, using UID as orgId:', orgId);
            }

            // Update user profile
            await userRef.update({ orgId });
            console.log('✅ User profile updated with orgId:', orgId);
        } else {
            console.log('✅ User already has orgId:', userData.orgId || userData.organizationId);
        }

    } catch (error) {
        console.error('Error fixing profile:', error);
    }
}

// Get user ID from command line
const userId = process.argv[2];
if (!userId) {
    console.error('Usage: node fix-profile.js YOUR_USER_ID');
    process.exit(1);
}

fixUserProfile(userId).then(() => {
    console.log('Done!');
    process.exit(0);
});

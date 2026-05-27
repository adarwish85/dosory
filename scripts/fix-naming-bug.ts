import { admin, db, auth } from "./_admin";

async function fixNamingBug() {
    console.log("🔍 Scanning for users with naming issues...");

    const organizationsSnapshot = await db.collection("organizations").get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenants = organizationsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];

    console.log(`Checking ${tenants.length} tenants for naming conflicts...`);

    let updatedCount = 0;

    for (const tenant of tenants) {
        const orgName = tenant.name;

        // Find users in this org
        const usersSnapshot = await db.collection("users").where("orgId", "==", tenant.id).get();
        if (usersSnapshot.empty) continue;

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            const userEmail = userData.email || "";
            const displayName = userData.displayName || "";

            // Heuristic: If displayName is exactly the organization name, it's likely wrong
            if (displayName === orgName && orgName.length > 0) {
                console.log(
                    `⚠️  Found conflict: User ${userId} (${userEmail}) has name "${displayName}" matching Org "${orgName}"`
                );

                // Derive new name
                let firstName = userData.firstName;
                let lastName = userData.lastName;

                // If first/last name also match org name (or represent the bug pattern)
                const derivedName = deriveNameFromEmail(userEmail);

                if (!firstName || firstName === orgName) {
                    firstName = derivedName;
                }

                if (!lastName || lastName === "Admin") {
                    lastName = "Admin";
                }

                const newDisplayName = `${firstName} ${lastName}`.trim();

                console.log(`   -> Fixing to: "${newDisplayName}" (First: ${firstName}, Last: ${lastName})`);

                // Update Firestore User
                await db.collection("users").doc(userId).update({
                    displayName: newDisplayName,
                    firstName: firstName,
                    lastName: lastName,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Update Firestore Staff (if exists)
                const staffRef = db.collection("staff").doc(userId); // Try ID first
                const staffDoc = await staffRef.get();

                if (staffDoc.exists) {
                    await staffRef.update({
                        displayName: newDisplayName,
                        firstName: firstName,
                        lastName: lastName,
                    });
                } else {
                    // Try email
                    const staffEmailRef = db.collection("staff").doc(userEmail.toLowerCase());
                    const staffEmailDoc = await staffEmailRef.get();
                    if (staffEmailDoc.exists) {
                        await staffEmailRef.update({
                            displayName: newDisplayName,
                            firstName: firstName,
                            lastName: lastName,
                        });
                    }
                }

                // Update Auth Profile
                try {
                    await auth.updateUser(userId, {
                        displayName: newDisplayName,
                    });
                    console.log(`   ✅ Synced to Auth`);
                } catch (e: unknown) {
                    console.error(`   ❌ Failed to sync Auth: ${e}`);
                }

                updatedCount++;
            }
        }
    }

    console.log("--------------------------------------------------");
    console.log(`Process Complete. Fixed ${updatedCount} users.`);
}

function deriveNameFromEmail(email: string) {
    if (!email) return "User";
    const prefix = email.split("@")[0];
    // Capitalize first letter
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

fixNamingBug().catch(console.error);

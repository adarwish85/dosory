"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";

export default function FixProfilePage() {
    const { user } = useAuth();

    useEffect(() => {
        async function fixProfile() {
            if (!user) return;

            try {
                const userRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userRef);

                if (!userDoc.exists()) {
                    console.log("User profile doesn't exist");
                    return;
                }

                const data = userDoc.data();
                console.log("Current profile data:", data);

                if (data.orgId || data.organizationId) {
                    console.log("Profile already has orgId:", data.orgId || data.organizationId);
                    alert(`Your profile already has orgId: ${data.orgId || data.organizationId}`);
                    return;
                }

                // Try to find organization
                const orgsRef = collection(db, "organizations");
                const q = query(orgsRef, where("ownerId", "==", user.uid), limit(1));
                const orgSnap = await getDocs(q);

                let orgId;
                if (!orgSnap.empty) {
                    orgId = orgSnap.docs[0].id;
                    console.log("Found organization:", orgId);
                } else {
                    orgId = user.uid;
                    console.log("Using UID as orgId:", orgId);
                }

                // Update profile
                await updateDoc(userRef, { orgId });
                console.log("✅ Profile fixed with orgId:", orgId);
                alert(`✅ Profile fixed! orgId set to: ${orgId}\n\nPlease refresh the page.`);
            } catch (error) {
                console.error("Error fixing profile:", error);
                alert(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        fixProfile();
    }, [user]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Fixing Your Profile...</h1>
                <p>Check the browser console for details.</p>
            </div>
        </div>
    );
}

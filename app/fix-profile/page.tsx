"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { useTranslation } from "@/lib/i18n";

export default function FixProfilePage() {
    const { user } = useAuth();
    const { t } = useTranslation();

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
                    alert(t("auth.fixProfile.alreadyHasOrg", { orgId: data.orgId || data.organizationId }));
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
                alert(t("auth.fixProfile.fixedSuccess", { orgId }));
            } catch (error) {
                console.error("Error fixing profile:", error);
                alert(t("auth.fixProfile.error", { message: error instanceof Error ? error.message : String(error) }));
            }
        }

        fixProfile();
    }, [user, t]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">{t("auth.fixProfile.heading")}</h1>
                <p>{t("auth.fixProfile.checkConsole")}</p>
            </div>
        </div>
    );
}

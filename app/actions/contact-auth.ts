"use server";

import { adminAuth } from "@/lib/firebase-admin";

export async function setContactAuthPassword(email: string, password: string, displayName?: string) {
    try {
        // Check if user exists
        try {
            const user = await adminAuth.getUserByEmail(email);
            // User exists, update password
            await adminAuth.updateUser(user.uid, {
                password: password,
                displayName: displayName || user.displayName, // Update display name if provided
            });
            return { success: true, uid: user.uid, action: "updated" };
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // User doesn't exist, create new user
                const user = await adminAuth.createUser({
                    email: email,
                    password: password,
                    displayName: displayName,
                    emailVerified: true, // Auto verify since admin created it
                });
                return { success: true, uid: user.uid, action: "created" };
            }
            throw error;
        }
    } catch (error: any) {
        console.error("Error managing contact auth:", error);
        return { success: false, error: error.message };
    }
}

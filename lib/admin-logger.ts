import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "firebase/auth";

export interface AdminLog {
    id?: string;
    action: string;
    targetId?: string;
    targetName?: string;
    details: any;
    performedBy: string; // Email or UID
    performedAt: any;
    ip?: string;
}

/**
 * Logs a sensitive admin action to Firestore 'admin_logs' collection
 */
export async function logAdminAction(
    user: User | null | { email?: string | null; uid: string },
    action: string,
    target: { id?: string; name?: string },
    details: any = {}
) {
    if (!user) return;

    try {
        await addDoc(collection(db, "admin_logs"), {
            action,
            targetId: target.id || null,
            targetName: target.name || "Unknown",
            details,
            performedBy: user.email || user.uid,
            performedAt: serverTimestamp(),
            userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "Server",
        });
    } catch (error) {
        console.error("Failed to log admin action:", error);
        // We don't throw here to avoid blocking the actual action
    }
}

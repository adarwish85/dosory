import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

export interface AuditLogEntry {
    actorId: string;
    action: string;
    targetId?: string;
    targetType?: string;
    payload?: Record<string, unknown>;
}

/**
 * Server-side audit logging.
 * 直接写入 Firestore via Admin SDK.
 */
export async function logAudit(entry: AuditLogEntry) {
    try {
        await adminDb.collection("audit_logs").add({
            ...entry,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`[Audit] ${entry.action} by ${entry.actorId}`);
    } catch (error) {
        console.error("Failed to write audit log:", error);
        // We do strictly enforce audit logging failures to block main flow?
        // Usually audit logging shouldn't crash the user flow, but for high security it might be debated.
        // For now we log error but don't throw, to prevent system outage if logging service degrades.
    }
}

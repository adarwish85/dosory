
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface AuditLogEntry {
    action: string;
    resourceType: "website" | "page" | "section" | "asset" | "settings" | "tenant" | "user" | "plan" | "module";
    resourceId: string;
    actorId: string;
    details: Record<string, any>; // JSON snapshot or diff
    timestamp: Timestamp;
}

const AUDIT_COLL = "sa_audit_logs";

export class AuditService {
    static async log(
        action: string,
        resourceType: AuditLogEntry["resourceType"],
        resourceId: string,
        actorId: string,
        details: Record<string, any> = {}
    ) {
        try {
            await addDoc(collection(db, AUDIT_COLL), {
                action,
                resourceType,
                resourceId,
                actorId,
                details,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Failed to write audit log", error);
            // Sentry or robust error handling should go here
            // We do NOT want to fail the main transaction just because log failed (fail-open vs fail-closed debate)
            // Ideally should be fail-closed for security, but for V1 fail-open with logging is acceptable.
        }
    }
}

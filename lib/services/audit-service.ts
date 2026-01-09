import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const AUDIT_LOGS_COLL = "sa_audit_logs";

export interface AuditLogEntry {
    id?: string;
    action: string;
    targetType: "plan" | "tenant" | "user" | "module" | "settings" | "website" | "page" | "section" | "asset";
    targetId: string;
    actorId: string;
    actorRole?: string;
    payload: Record<string, any>;
    createdAt?: any;
}

export class AuditService {
    /**
     * Write an immutable audit log entry
     * Audit logs cannot be updated or deleted
     */
    static async log(entry: AuditLogEntry): Promise<string> {
        const doc = await adminDb.collection(AUDIT_LOGS_COLL).add({
            ...entry,
            createdAt: FieldValue.serverTimestamp()
        });
        return doc.id;
    }

    /**
     * Get audit logs with optional filters
     */
    static async getLogs(filters?: {
        action?: string;
        targetType?: string;
        targetId?: string;
        actorId?: string;
        limit?: number;
    }): Promise<AuditLogEntry[]> {
        let query: FirebaseFirestore.Query = adminDb.collection(AUDIT_LOGS_COLL)
            .orderBy("createdAt", "desc");

        if (filters?.action) {
            query = query.where("action", "==", filters.action);
        }
        if (filters?.targetType) {
            query = query.where("targetType", "==", filters.targetType);
        }
        if (filters?.targetId) {
            query = query.where("targetId", "==", filters.targetId);
        }
        if (filters?.actorId) {
            query = query.where("actorId", "==", filters.actorId);
        }

        query = query.limit(filters?.limit || 100);

        const snap = await query.get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogEntry));
    }

    /**
     * Get audit logs for a specific target (e.g., a plan or tenant)
     */
    static async getLogsForTarget(targetType: string, targetId: string): Promise<AuditLogEntry[]> {
        const snap = await adminDb.collection(AUDIT_LOGS_COLL)
            .where("targetType", "==", targetType)
            .where("targetId", "==", targetId)
            .orderBy("createdAt", "desc")
            .limit(50)
            .get();

        return snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogEntry));
    }
}

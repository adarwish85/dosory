
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { SuperAdminRole } from "@/lib/rbac/super-admin";
import { logAudit } from "@/lib/services/audit-service-server";

export interface ImpersonationSession {
    id: string;
    actorUid: string;
    actorEmail: string;
    actorRole: SuperAdminRole;
    targetTenantId: string;
    targetUserId?: string;
    reason: string;
    startedAt: admin.firestore.Timestamp;
    expiresAt: admin.firestore.Timestamp;
    endedAt?: admin.firestore.Timestamp;
    endedReason?: "manual" | "expired" | "force_exit";
}

const COLLECTION_NAME = "impersonationSessions";
const SESSION_DURATION_MINUTES = 15;
const MAX_SESSION_DURATION_MINUTES = 60; // For PlatformAdmin extra time if needed

export class ImpersonationService {

    /**
     * Start a new impersonation session.
     * Enforces single active session rule per admin.
     */
    static async startSession(
        actorUid: string,
        actorEmail: string,
        actorRole: SuperAdminRole,
        targetTenantId: string,
        reason: string,
        targetUserId?: string
    ): Promise<ImpersonationSession> {
        // 1. Check for existing active session
        const existingSnapshot = await adminDb.collection(COLLECTION_NAME)
            .where("actorUid", "==", actorUid)
            .where("endedAt", "==", null)
            .limit(1)
            .get();

        if (!existingSnapshot.empty) {
            // Option 1: Error out. Option 2: Auto-close previous.
            // Rule: "Only ONE active impersonation per admin".
            // We'll auto-close the previous one to be user-friendly but careful.
            const oldSessionDoc = existingSnapshot.docs[0];
            await this.endSession(oldSessionDoc.id, "force_exit");
        }

        // 2. Validate Tenant Existence (Optional but good)
        // const tenantDoc = await adminDb.collection("tenants").doc(targetTenantId).get();
        // if (!tenantDoc.exists) throw new Error("Tenant not found");

        // 3. Create Session
        const now = admin.firestore.Timestamp.now();
        const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + SESSION_DURATION_MINUTES * 60 * 1000);

        const sessionData: Omit<ImpersonationSession, "id"> = {
            actorUid,
            actorEmail,
            actorRole,
            targetTenantId,
            targetUserId: targetUserId || undefined,
            reason,
            startedAt: now,
            expiresAt,
        };

        const docRef = await adminDb.collection(COLLECTION_NAME).add(sessionData);

        // 4. Audit Log (Start)
        await logAudit({
            actorId: actorUid,
            action: "IMPERSONATION_START",
            targetId: targetTenantId,
            targetType: "tenant",
            payload: {
                sessionId: docRef.id,
                reason,
                targetUserId
            }
        });

        return {
            id: docRef.id,
            ...sessionData
        };
    }

    /**
     * End an active session.
     */
    static async endSession(sessionId: string, reason: "manual" | "expired" | "force_exit" = "manual"): Promise<void> {
        const docRef = adminDb.collection(COLLECTION_NAME).doc(sessionId);
        const doc = await docRef.get();

        if (!doc.exists) return; // Already gone?
        const data = doc.data() as ImpersonationSession;

        if (data.endedAt) return; // Already ended

        await docRef.update({
            endedAt: admin.firestore.Timestamp.now(),
            endedReason: reason
        });

        // Audit Log (End)
        await logAudit({
            actorId: data.actorUid,
            action: "IMPERSONATION_END",
            targetId: data.targetTenantId,
            targetType: "tenant",
            payload: {
                sessionId,
                reason,
                durationSeconds: (Date.now() - data.startedAt.toMillis()) / 1000
            }
        });
    }

    /**
     * Validate a session ID.
     * Checks existence, ended status, and expiration.
     */
    static async validateSession(sessionId: string): Promise<ImpersonationSession | null> {
        const doc = await adminDb.collection(COLLECTION_NAME).doc(sessionId).get();
        if (!doc.exists) return null;

        const data = doc.data() as ImpersonationSession;

        // 1. Check if already ended
        if (data.endedAt) return null;

        // 2. Check Expiry
        const now = admin.firestore.Timestamp.now();
        if (now.toMillis() > data.expiresAt.toMillis()) {
            // Lazy expiration: mark as ended now
            await this.endSession(sessionId, "expired");
            return null;
        }

        // Return session with ID
        return { ...data, id: sessionId };
    }
}

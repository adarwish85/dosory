import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SupportSettings, CannedResponse } from "@/lib/types/support";

const SETTINGS_COLLECTION = "settings";

export class SupportSettingsService {
    static async getSettings(tenantId: string): Promise<SupportSettings> {
        const docRef = doc(db, SETTINGS_COLLECTION, `${tenantId}_support`);
        // ROOT CAUSE of "ticket create is permission-denied for every user, in every tenant"
        // (2026-08-06). TicketService.createTicket awaits THIS method before its addDoc. The
        // settings/{docId} rule reads `resource.data.orgId`; on a MISSING document `resource`
        // is null, the expression errors, and the READ is denied. No tenant has ever had a
        // settings/{tenantId}_support doc, so this getDoc threw for everyone and surfaced as a
        // failed ticket create. Support settings are OPTIONAL (the defaults below are the
        // contract), so an unreadable doc must degrade to those defaults, never throw.
        //
        // NOTE: there is a SECOND, unused `getSettings` on TicketService itself. An earlier
        // pass hardened that one — same name, wrong class, no effect on this path. Resolve the
        // call target before patching (same trap as the @/lib/hooks barrel shadowing).
        let snapshot;
        try {
            snapshot = await getDoc(docRef);
        } catch (err) {
            console.warn(`[support] settings/${tenantId}_support unreadable; using defaults`, err);
            snapshot = null;
        }

        if (!snapshot || !snapshot.exists()) {
            return {
                id: `${tenantId}_support`,
                tenantId: tenantId,
                slaRules: {
                    low: { responseHours: 24, resolutionHours: 72 },
                    medium: { responseHours: 8, resolutionHours: 48 },
                    high: { responseHours: 4, resolutionHours: 24 },
                    critical: { responseHours: 1, resolutionHours: 8 },
                },
                categories: ["General", "Billing", "Technical", "Feature Request"],
                autoAssignRules: [],
                cannedResponses: [],
            };
        }

        return snapshot.data() as SupportSettings;
    }

    static async saveSettings(tenantId: string, settings: Partial<SupportSettings>) {
        const docRef = doc(db, SETTINGS_COLLECTION, `${tenantId}_support`);
        await setDoc(docRef, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
    }

    static async addCannedResponse(
        tenantId: string,
        response: Omit<CannedResponse, "id" | "createdAt" | "createdBy">,
        userId: string
    ) {
        const docRef = doc(db, SETTINGS_COLLECTION, `${tenantId}_support`);
        const settings = await this.getSettings(tenantId);

        const newResponse: CannedResponse = {
            id: crypto.randomUUID(),
            ...response,
            createdBy: userId,
            createdAt: Timestamp.now(),
        };

        const updatedResponses = [...(settings.cannedResponses || []), newResponse];

        await updateDoc(docRef, {
            cannedResponses: updatedResponses,
            updatedAt: serverTimestamp(),
        });

        return newResponse;
    }

    static async updateCannedResponse(tenantId: string, responseId: string, updates: Partial<CannedResponse>) {
        const docRef = doc(db, SETTINGS_COLLECTION, `${tenantId}_support`);
        const settings = await this.getSettings(tenantId);

        if (!settings.cannedResponses) return;

        const updatedResponses = settings.cannedResponses.map((r) => (r.id === responseId ? { ...r, ...updates } : r));

        await updateDoc(docRef, {
            cannedResponses: updatedResponses,
            updatedAt: serverTimestamp(),
        });
    }

    static async deleteCannedResponse(tenantId: string, responseId: string) {
        const docRef = doc(db, SETTINGS_COLLECTION, `${tenantId}_support`);
        const settings = await this.getSettings(tenantId);

        if (!settings.cannedResponses) return;

        const updatedResponses = settings.cannedResponses.filter((r) => r.id !== responseId);

        await updateDoc(docRef, {
            cannedResponses: updatedResponses,
            updatedAt: serverTimestamp(),
        });
    }
}

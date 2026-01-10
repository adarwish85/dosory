import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUser } from "@/lib/auth/getAuthenticatedUser";
import { TenantEntitlements } from "@/lib/entitlements/tenantEntitlements";
import { logAudit } from "@/lib/services/audit-service-server";
import { FieldValue } from "firebase-admin/firestore";
import { slugify } from "@/lib/utils/slugify";

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthenticatedUser(req);
        if (!auth.isAuthenticated || !auth.orgId || !auth.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();
        const { name, ...otherData } = data;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        // Enforce Entitlements (Write Access)
        try {
            await TenantEntitlements.ensureWriteAccess(auth.orgId);
        } catch (err: unknown) {
            const error = err as { message?: string; code?: string };
            return NextResponse.json({ error: error.message || "Unknown error", code: error.code }, { status: 403 });
        }

        // Create Lead
        const leadData = {
            ...otherData,
            name,
            name_lower: name.toLowerCase(),
            slug: slugify(name),
            orgId: auth.orgId,
            createdBy: auth.userId, // The actual user (or impersonator)
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const docRef = await adminDb.collection("leads").add(leadData);

        // Audit Log
        await logAudit({
            actorId: auth.userId,
            action: "create",
            targetType: "lead",
            targetId: docRef.id,
            // orgId not in interface but in payload maybe? Interface has actorId, action, targetId, targetType, payload.
            // I'll put orgId in payload if needed, or update interface.
            // In step 360, interface doesn't have orgId.
            payload: { name, orgId: auth.orgId },
        });

        return NextResponse.json({ id: docRef.id }, { status: 201 });
    } catch (error: unknown) {
        console.error("Error creating lead:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { headers } from "next/headers";
import { sendPortalInviteEmail } from "@/lib/email"; // Placeholder

export async function POST(req: NextRequest) {
    try {
        const { customerId, contactId, modules } = await req.json();

        // 1. Auth Check
        const { getAuthenticatedUser } = await import("@/lib/auth/getAuthenticatedUser");
        const auth = await getAuthenticatedUser(req);

        if (!auth.isAuthenticated || !auth.userId) {
            return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
        }

        let orgId = auth.orgId;

        // If orgId not in token/context, try fetching from user doc
        if (!orgId) {
            const userDoc = await adminDb.collection("users").doc(auth.userId).get();
            orgId = userDoc.data()?.orgId;
        }

        if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 403 });

        // 2. Check Entitlements
        const { TenantEntitlements } = await import("@/lib/entitlements/tenantEntitlements");

        // Ensure write access (blocks suspended/past_due)
        await TenantEntitlements.ensureWriteAccess(orgId);

        const hasPortalAccess = await TenantEntitlements.getFeature(orgId, "support", "customerPortal");

        if (!hasPortalAccess) {
            return NextResponse.json({
                error: "Client Portal is not enabled in your plan.",
                reason: "FEATURE_NOT_ENABLED",
                upgradeHint: true
            }, { status: 403 });
        }

        // 3. Verify Customer Ownership
        const customerDoc = await adminDb.collection("customers").doc(customerId).get();
        if (!customerDoc.exists || customerDoc.data()?.orgId !== orgId) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        // 4. Update Contact
        const contactRef = adminDb.collection("contacts").doc(contactId);
        const contactDoc = await contactRef.get();
        if (!contactDoc.exists || contactDoc.data()?.customerId !== customerId) {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }

        await contactRef.update({
            portalAccess: {
                enabled: true,
                modules: modules || [],
                invitedAt: new Date(),
                // Generate a temporary one-time token if building custom auth,
                // but usually we prompt them to set password via link.
            },
        });

        // 5. Send Invite Email
        const contactData = contactDoc.data();
        await sendPortalInviteEmail(contactData?.email, contactData?.firstName, customerDoc.data()?.slug || customerId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Portal Invite Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

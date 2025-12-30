import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { headers } from "next/headers";
import { sendPortalInviteEmail } from "@/lib/email"; // Placeholder

export async function POST(req: Request) {
    try {
        const { customerId, contactId, modules } = await req.json();

        // 1. Auth Check
        const headerList = await headers();
        const idToken = headerList.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const userDoc = await adminDb.collection("users").doc(uid).get();
        const orgId = userDoc.data()?.orgId;

        if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 403 });

        // 2. Check Subscription Capabilities
        const subDoc = await adminDb.collection("subscriptions").doc(orgId).get();
        const subscription = subDoc.data();

        if (!subscription?.capabilities?.clientPortal) {
            return NextResponse.json({ error: "Client Portal is not enabled in your plan." }, { status: 403 });
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

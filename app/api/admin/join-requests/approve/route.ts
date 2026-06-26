import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";
import { getAuthenticatedUser } from "@/lib/auth/getAuthenticatedUser";
import { setTenantClaims } from "@/lib/auth/claims";

export async function POST(request: NextRequest) {
    try {
        // A1: require a verified caller (reviewer identity comes from the token, not the body).
        const auth = await getAuthenticatedUser(request);
        if (!auth.isAuthenticated || !auth.userId) {
            return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
        }

        const body = await request.json();
        const { requestId, roleId, isAdmin, permissions } = body;

        if (!requestId) {
            return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
        }

        // Get the request document
        const requestRef = adminDb.collection("join_requests").doc(requestId);
        const requestSnap = await requestRef.get();

        if (!requestSnap.exists) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        const requestData = requestSnap.data();
        if (!requestData) throw new Error("No data in request");

        const { userId, userEmail, orgId } = requestData;

        // A1: caller must be an admin of the org this request belongs to. orgId match blocks
        // cross-tenant approval; admin check (role claim, with a staff-doc fallback for stale
        // tokens) blocks a regular member from minting staff.
        if (auth.orgId !== orgId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        let callerIsAdmin = auth.role === "admin";
        if (!callerIsAdmin) {
            const callerStaff = await adminDb.collection("staff").where("authUid", "==", auth.userId).limit(1).get();
            callerIsAdmin = !callerStaff.empty && callerStaff.docs[0].data().isAdmin === true;
        }
        if (!callerIsAdmin) {
            return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
        }

        const reviewerId = auth.userId; // derived from the verified token, never the body

        // Perform atomic updates using a batch
        const batch = adminDb.batch();

        // 1. Create Staff Document
        const staffRef = adminDb.collection("staff").doc(userEmail.toLowerCase());
        batch.set(staffRef, {
            authUid: userId,
            firstName: userEmail.split("@")[0], // Default first name from email
            lastName: "",
            email: userEmail,
            roleId: roleId || "employee",
            isAdmin: isAdmin || false,
            status: "active",
            orgId: orgId,
            departmentIds: [],
            permissions: permissions || [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: reviewerId,
        });

        // 2. Update User Document
        const userRef = adminDb.collection("users").doc(userId);
        batch.update(userRef, {
            orgId: orgId,
            role: isAdmin ? "admin" : "staff",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 3. Update Request Document
        batch.update(requestRef, {
            status: "approved",
            reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
            reviewedBy: reviewerId,
            assignedRole: roleId,
            assignedPermissions: permissions,
        });

        // Commit DB changes
        await batch.commit();

        // A4: set the approved user's tenant claims server-side, deterministically — don't
        // rely on the client self-heal. They are a different session; they pick this up on
        // their next token refresh (auth-provider / user-profile-provider force a refresh
        // when the orgId claim is missing).
        await setTenantClaims(userId, orgId, isAdmin ? "admin" : "staff");

        // 4. Send Email (after successful DB commit)
        let emailSent = false;
        try {
            // Get Org Name for email
            const orgDoc = await adminDb.collection("organizations").doc(orgId).get();
            const orgName = orgDoc.data()?.name || orgId;

            // Construct Portal URL
            const host = request.headers.get("host") || "localhost:3000";
            const protocol = host.includes("localhost") ? "http" : "https";
            // Use subdomain logic
            const rootDomain = host.includes("localhost") ? "localhost:3000" : "dosory.com";
            // Check if host already has subdomain, if not construct it
            // If calling from correct tenant dashboard, host might be 'acme.dosory.com'.
            // To be safe, construct explicit URL:
            const portalUrl = `${protocol}://${orgId}.${rootDomain}/dashboard`;

            const { sendJoinRequestApprovedEmail } = await import("@/lib/email");
            emailSent = await sendJoinRequestApprovedEmail(userEmail, orgName, portalUrl);
        } catch (emailError) {
            console.error("Error sending approval email:", emailError);
            // Don't fail the request if email fails, but note it
        }

        return NextResponse.json({
            success: true,
            emailSent,
            message: "Request approved successfully",
        });
    } catch (error) {
        console.error("Error approving request:", error);
        return NextResponse.json({ error: (error as Error).message || "Failed to approve request" }, { status: 500 });
    }
}

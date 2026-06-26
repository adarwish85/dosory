import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";
import { getAuthenticatedUser } from "@/lib/auth/getAuthenticatedUser";

export async function POST(request: NextRequest) {
    try {
        // A1: require a verified caller (reviewer identity comes from the token, not the body).
        const auth = await getAuthenticatedUser(request);
        if (!auth.isAuthenticated || !auth.userId) {
            return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
        }

        const body = await request.json();
        const { requestId } = body;

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
        const { userEmail, orgId } = requestData;

        // A1: caller must be an admin of the org this request belongs to.
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

        // Perform Update
        await requestRef.update({
            status: "rejected",
            reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
            reviewedBy: auth.userId,
        });

        // Send Email
        let emailSent = false;
        try {
            // Get Org Name
            const orgDoc = await adminDb.collection("organizations").doc(orgId).get();
            const orgName = orgDoc.data()?.name || orgId;

            const { sendJoinRequestRejectedEmail } = await import("@/lib/email");
            emailSent = await sendJoinRequestRejectedEmail(userEmail, orgName);
        } catch (emailError) {
            console.error("Error sending rejection email:", emailError);
        }

        return NextResponse.json({
            success: true,
            emailSent,
            message: "Request rejected successfully",
        });
    } catch (error) {
        console.error("Error rejecting request:", error);
        return NextResponse.json({ error: (error as Error).message || "Failed to reject request" }, { status: 500 });
    }
}

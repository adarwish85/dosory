import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { requestId, reviewerId } = body;

        if (!requestId || !reviewerId) {
            return NextResponse.json({ error: "Request ID and Reviewer ID are required" }, { status: 400 });
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

        // Perform Update
        await requestRef.update({
            status: "rejected",
            reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
            reviewedBy: reviewerId,
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
    } catch (error: any) {
        console.error("Error rejecting request:", error);
        return NextResponse.json({ error: error.message || "Failed to reject request" }, { status: 500 });
    }
}

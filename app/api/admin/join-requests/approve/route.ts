import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { requestId, roleId, isAdmin, permissions, reviewerId } = body;

        if (!requestId || !reviewerId) {
            return NextResponse.json(
                { error: "Request ID and Reviewer ID are required" },
                { status: 400 }
            );
        }

        // Get the request document
        const requestRef = adminDb.collection("join_requests").doc(requestId);
        const requestSnap = await requestRef.get();

        if (!requestSnap.exists) {
            return NextResponse.json(
                { error: "Request not found" },
                { status: 404 }
            );
        }

        const requestData = requestSnap.data();
        if (!requestData) throw new Error("No data in request");

        const { userId, userEmail, orgId } = requestData;

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
            createdBy: reviewerId
        });

        // 2. Update User Document
        const userRef = adminDb.collection("users").doc(userId);
        batch.update(userRef, {
            orgId: orgId,
            role: isAdmin ? "admin" : "staff",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 3. Update Request Document
        batch.update(requestRef, {
            status: "approved",
            reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
            reviewedBy: reviewerId,
            assignedRole: roleId,
            assignedPermissions: permissions
        });

        // Commit DB changes
        await batch.commit();

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
            message: "Request approved successfully"
        });

    } catch (error: any) {
        console.error("Error approving request:", error);
        return NextResponse.json(
            { error: error.message || "Failed to approve request" },
            { status: 500 }
        );
    }
}

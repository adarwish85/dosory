import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            email,
            password,
            firstName,
            lastName,
            phone,
            hourlyRate,
            isAdmin,
            isNotStaff,
            departmentIds,
            profileImageUrl,
            roleId,
            permissions,
            orgId,
            createdBy,
            sendWelcomeEmail = true,
        } = body;

        // Validate required fields
        if (!email || !firstName || !lastName || !orgId) {
            return NextResponse.json(
                { error: "Email, first name, last name, and organization are required" },
                { status: 400 }
            );
        }

        // Check Subscription Quota
        const { checkQuota } = await import("@/lib/quotas");
        const quotaCheck = await checkQuota(orgId, "staff");
        if (!quotaCheck.allowed) {
            return NextResponse.json(
                { error: quotaCheck.error || "Staff limit reached for your current plan. Please upgrade to add more staff." },
                { status: 403 }
            );
        }

        // Validate password
        if (!password || password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        let userId: string;

        try {
            // Create Firebase Auth user - this automatically enforces email uniqueness
            const userRecord = await adminAuth.createUser({
                email,
                password,
                displayName: `${firstName} ${lastName}`,
                emailVerified: false,
            });
            userId = userRecord.uid;
        } catch (authError: any) {
            if (authError.code === "auth/email-already-exists") {
                return NextResponse.json(
                    { error: "A user with this email already exists" },
                    { status: 400 }
                );
            }
            if (authError.code === "auth/invalid-email") {
                return NextResponse.json(
                    { error: "Invalid email format" },
                    { status: 400 }
                );
            }
            console.error("Firebase Auth error:", authError);
            throw authError;
        }

        // Create user document in Firestore (for auth lookup and role)
        await adminDb.collection("users").doc(userId).set({
            email,
            displayName: `${firstName} ${lastName}`,
            role: isAdmin ? "admin" : "staff",
            orgId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Use email as the staff document ID (lowercase for consistency)
        const staffDocId = email.toLowerCase();

        // Create staff document in Firestore (using email as document ID)
        await adminDb.collection("staff").doc(staffDocId).set({
            authUid: userId, // Link to Firebase Auth user
            firstName,
            lastName,
            email,
            phone: phone || "",
            hourlyRate: hourlyRate || 0,
            isAdmin: isAdmin || false,
            isNotStaff: isNotStaff || false,
            departmentIds: departmentIds || [],
            profileImageUrl: profileImageUrl || "",
            roleId: roleId || "employee",
            permissions: permissions || [],
            orgId,
            status: "active",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: createdBy || null,
        });

        // Send welcome email if requested
        let emailSent = false;
        if (sendWelcomeEmail) {
            try {
                // Generate password reset link so user can set their own password
                const resetLink = await adminAuth.generatePasswordResetLink(email);

                // Get the base URL from request or use default
                const host = request.headers.get("host") || "localhost:3000";
                const protocol = host.includes("localhost") ? "http" : "https";
                const portalUrl = `${protocol}://${host}/login`;

                // Send welcome email
                const { sendWelcomeStaffEmail } = await import("@/lib/email");
                emailSent = await sendWelcomeStaffEmail(email, firstName, portalUrl, resetLink);

                if (!emailSent) {
                    console.warn("Welcome email could not be sent, but staff was created");
                }
            } catch (emailError) {
                console.error("Error sending welcome email:", emailError);
                // Continue anyway - staff was created successfully
            }
        }

        return NextResponse.json({
            success: true,
            staffId: staffDocId, // Email-based ID for profile URL
            authUid: userId,     // Firebase Auth UID for reference
            emailSent,
            message: emailSent
                ? "Staff member created and welcome email sent"
                : "Staff member created (email not sent)",
        });

    } catch (error: any) {
        console.error("Error creating staff:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create staff member" },
            { status: 500 }
        );
    }
}

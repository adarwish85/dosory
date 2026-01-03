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
        } = body;

        const { sendWelcomeEmail = true } = body;

        // 1. Auth & Impersonation Check
        const { getAuthenticatedUser } = await import("@/lib/auth/getAuthenticatedUser");
        const auth = await getAuthenticatedUser(request);

        if (!auth.isAuthenticated || !auth.userId) {
            return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
        }

        // Enforce orgId match if user belongs to an org (unless super admin context)
        // If impersonating, auth.orgId is the target tenant.
        if (auth.orgId && auth.orgId !== orgId) {
            return NextResponse.json({ error: "Organization mismatch" }, { status: 403 });
        }

        // If not impersonating and not super admin, we trust auth.orgId
        // But wait, this is /api/admin/*, implying it's for the Tenant Admin.
        // So standard auth applies.

        // Block specific actions for Support Agents if needed? 
        // For now, allow.

        // Override createdBy with the actual actor
        const actualCreatedBy = auth.actor ? `SA:${auth.actor.email}` : auth.userId;

        // Validate required fields
        if (!email || !firstName || !lastName || !orgId) {
            return NextResponse.json(
                { error: "Email, first name, last name, and organization are required" },
                { status: 400 }
            );
        }

        // Check Subscription Quota
        const { TenantEntitlements } = await import("@/lib/entitlements/tenantEntitlements");
        try {
            await TenantEntitlements.enforceLimit(orgId, "maxUsers");
        } catch (error: any) {
            return NextResponse.json(
                {
                    error: "User limit exceeded. Please upgrade your plan or add more seats.",
                    code: "USER_LIMIT_EXCEEDED"
                },
                { status: 403 }
            );
        }

        // Validate password
        if (!password || password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
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
                return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
            }
            if (authError.code === "auth/invalid-email") {
                return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
            }
            console.error("Firebase Auth error:", authError);
            throw authError;
        }

        // Create user document in Firestore (for auth lookup and role)
        await adminDb
            .collection("users")
            .doc(userId)
            .set({
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
        await adminDb
            .collection("staff")
            .doc(staffDocId)
            .set({
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
                createdBy: actualCreatedBy || null,
            });

        // Increment usage
        const { BillingService } = await import("@/lib/services/billing-service");
        await BillingService.incrementUsage(orgId, "usersCount", 1);

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
            authUid: userId, // Firebase Auth UID for reference
            emailSent,
            message: emailSent
                ? "Staff member created and welcome email sent"
                : "Staff member created (email not sent)",
        });
    } catch (error: any) {
        console.error("Error creating staff:", error);
        return NextResponse.json({ error: error.message || "Failed to create staff member" }, { status: 500 });
    }
}

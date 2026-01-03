import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            email,
            password,
            displayName,
            organizationId,
            organizationName,
            sendPasswordReset,
            plan,
            status,
            phone,
            website,
            notes,
            subscriptionExpiry,
        } = body;

        // Validate required fields
        if (!email || !organizationName) {
            return NextResponse.json({ error: "Email and organization name are required" }, { status: 400 });
        }

        // If password is provided, validate it
        if (!sendPasswordReset && (!password || password.length < 8)) {
            return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        }

        let userId: string;
        let tempPassword = password;

        // If sendPasswordReset is true, create with a random temp password
        if (sendPasswordReset) {
            tempPassword = Math.random().toString(36).slice(-12) + "A1!";
        }

        // Helper to derive name from email
        const deriveNameFromEmail = (email: string) => {
            const prefix = email.split("@")[0];
            return prefix.charAt(0).toUpperCase() + prefix.slice(1);
        };

        const derivedName = deriveNameFromEmail(email);
        const userDisplayName = displayName || derivedName;
        const userFirstName = displayName?.split(" ")[0] || derivedName;
        const userLastName = displayName?.split(" ").slice(1).join(" ") || "Admin";

        try {
            // Create the Firebase Auth user
            const userRecord = await adminAuth.createUser({
                email,
                password: tempPassword,
                displayName: userDisplayName,
                emailVerified: false,
            });
            userId = userRecord.uid;
        } catch (authError: unknown) {
            const firebaseError = authError as { code?: string; message?: string };
            if (firebaseError.code === "auth/email-already-exists") {
                return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
            }
            throw authError;
        }

        // Create the organization document
        const tenantId = organizationId || `org_${Date.now()}`;
        await adminDb
            .collection("organizations")
            .doc(tenantId)
            .set({
                name: organizationName,
                email,
                phone: phone || "",
                website: website || "",
                plan: plan || "free",
                status: status || "trial",
                notes: notes || "",
                userCount: 1,
                ownerId: userId,
                subscriptionEndsAt: subscriptionExpiry ? new Date(subscriptionExpiry).toISOString() : null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        // Create the user document with tenant association
        await adminDb.collection("users").doc(userId).set({
            email,
            displayName: userDisplayName,
            firstName: userFirstName,
            lastName: userLastName,
            role: "admin", // Tenant admin
            orgId: tenantId,
            organizationId: tenantId, // Keep for backward compatibility if needed, else remove. Better to keep for now.
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Set Custom Claims for Tenant Admin
        await adminAuth.setCustomUserClaims(userId, {
            orgId: tenantId,
            role: "admin",
        });

        // Create the staff document for the admin (using same ID)
        await adminDb
            .collection("staff")
            .doc(userId)
            .set({
                firstName: userFirstName,
                lastName: userLastName,
                displayName: userDisplayName,
                email,
                phone: phone || "",
                roleId: "admin", // Placeholder, system should handle this
                isAdmin: true,
                status: "active",
                orgId: tenantId,
                departmentIds: [],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: userId,
            });

        // If sendPasswordReset is true, send password reset email
        if (sendPasswordReset) {
            try {
                const resetLink = await adminAuth.generatePasswordResetLink(email);
                console.log("Password reset link generated:", resetLink);

                // Send welcome email via template
                const { sendWelcomeTenantEmail } = await import("@/lib/email");
                const sent = await sendWelcomeTenantEmail(email, userDisplayName, organizationName, resetLink);

                if (!sent) {
                    console.warn("Failed to send welcome email. Check SMTP settings.");
                }
            } catch (emailError) {
                console.error("Error sending welcome email:", emailError);
                // Continue anyway - user can use forgot password
            }
        }

        // Create a welcome notification
        await adminDb.collection("notifications").add({
            orgId: tenantId,
            userId: userId,
            type: "success",
            title: "Welcome to your new platform!",
            message: "Your account has been successfully created. Get started by setting up your profile.",
            link: "/dashboard/setup/settings",
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: "system",
        });

        return NextResponse.json({
            success: true,
            userId,
            organizationId: tenantId,
            message: sendPasswordReset
                ? "Tenant created. Password reset email will be sent."
                : "Tenant created successfully.",
        });
    } catch (error: unknown) {
        console.error("Error creating tenant:", error);
        return NextResponse.json({ error: (error as Error).message || "Failed to create tenant" }, { status: 500 });
    }
}

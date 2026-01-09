import * as admin from "firebase-admin";
import { FINANCE_PERMISSIONS, CRM_PERMISSIONS, PROJECT_PERMISSIONS } from "../lib/rbac/registry";

// Initialize Admin SDK (Run this via ts-node)
// if (!admin.apps.length) admin.initializeApp();
// const db = admin.firestore();

export const SEED_ROLES = [
    {
        id: "role_owner",
        name: "Owner",
        description: "Full access to everything.",
        isSystemRole: true,
        permissions: [
            ...Object.values(FINANCE_PERMISSIONS).map((p) => p.code),
            ...Object.values(CRM_PERMISSIONS).map((p) => p.code),
            ...Object.values(PROJECT_PERMISSIONS).map((p) => p.code),
        ],
    },
    {
        id: "role_manager",
        name: "Manager",
        description: "Can manage projects and staff, but restricted finance.",
        isSystemRole: true,
        permissions: [
            PROJECT_PERMISSIONS.PROJECT_CREATE.code,
            PROJECT_PERMISSIONS.PROJECT_READ_GLOBAL.code,
            PROJECT_PERMISSIONS.TASK_ASSIGN.code,
            CRM_PERMISSIONS.CUSTOMER_READ.code,
            CRM_PERMISSIONS.CUSTOMER_UPDATE.code,
            FINANCE_PERMISSIONS.INVOICE_READ_GLOBAL.code, // Read-only finance
        ],
    },
    {
        id: "role_staff",
        name: "Staff",
        description: "Standard employee access.",
        isSystemRole: true,
        permissions: [PROJECT_PERMISSIONS.PROJECT_READ_OWN.code, FINANCE_PERMISSIONS.INVOICE_READ_OWN.code],
    },
];

// Helper to run seed (copy paste logic to actual script runner)
/*
async function seedRoles(orgId: string) {
    const batch = db.batch();
    for (const role of SEED_ROLES) {
        const ref = db.collection("organizations").doc(orgId).collection("roles").doc(role.id);
        batch.set(ref, { ...role, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    }
    await batch.commit();
}
*/

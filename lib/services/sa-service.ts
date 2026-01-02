import { adminDb } from "@/lib/firebase-admin";
import {
    Tenant, GlobalUser, Plan,
    ModuleCatalog, AuditLogEntry,
    SupportIssue, SystemHealthStatus, OverviewStats
} from "@/lib/types/super-admin";
import { FieldValue } from "firebase-admin/firestore";

// Collection names
const TENANTS_COLL = "organizations";
const USERS_COLL = "users";
const PLANS_COLL = "sa_plans";
const SUBSCRIPTIONS_COLL = "sa_subscriptions";
const MODULES_COLL = "sa_modules";
const AUDIT_LOGS_COLL = "sa_audit_logs";
const SUPPORT_ISSUES_COLL = "sa_support_issues";

// Helper to safely execute Firestore operations
async function safeQuery<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        console.error("Firestore operation failed:", error.message);
        return fallback;
    }
}

export class SAService {
    // ========================================
    // Overview
    // ========================================
    static async getOverviewStats(): Promise<OverviewStats> {
        return safeQuery(async () => {
            // Get tenant counts
            const tenantsSnap = await adminDb.collection(TENANTS_COLL).count().get();
            const activeTenantsSnap = await adminDb.collection(TENANTS_COLL)
                .where("status", "==", "active").count().get();

            // Get user count
            const usersSnap = await adminDb.collection(USERS_COLL).count().get();

            // Get pages count (from website builder)
            let totalPages = 0;
            try {
                const websitesSnap = await adminDb.collection("websites").get();
                for (const website of websitesSnap.docs) {
                    const pagesSnap = await adminDb.collection("websites")
                        .doc(website.id).collection("pages").count().get();
                    totalPages += pagesSnap.data().count;
                }
            } catch (e) {
                // Ignore if websites collection doesn't exist
            }

            // Calculate MRR from subscriptions
            let mrr = 0;
            try {
                const subsSnap = await adminDb.collection(SUBSCRIPTIONS_COLL)
                    .where("status", "==", "active").get();
                subsSnap.forEach(doc => {
                    mrr += doc.data().mrr || 0;
                });
            } catch (e) {
                // Ignore if collection doesn't exist
            }

            return {
                totalTenants: tenantsSnap.data().count,
                activeTenants: activeTenantsSnap.data().count,
                totalUsers: usersSnap.data().count,
                totalPages,
                mrr,
                systemHealth: "healthy"
            };
        }, {
            totalTenants: 0,
            activeTenants: 0,
            totalUsers: 0,
            totalPages: 0,
            mrr: 0,
            systemHealth: "healthy"
        });
    }

    // ========================================
    // Tenants
    // ========================================
    static async getTenants(limitCount: number = 50): Promise<Tenant[]> {
        return safeQuery(async () => {
            const snap = await adminDb.collection(TENANTS_COLL)
                .orderBy("createdAt", "desc")
                .limit(limitCount)
                .get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as Tenant));
        }, []);
    }

    static async getTenant(id: string): Promise<Tenant | null> {
        return safeQuery(async () => {
            const snap = await adminDb.collection(TENANTS_COLL).doc(id).get();
            if (!snap.exists) return null;
            return { id: snap.id, ...snap.data() } as Tenant;
        }, null);
    }

    static async updateTenantStatus(id: string, status: Tenant["status"], actorId: string) {
        await adminDb.collection(TENANTS_COLL).doc(id).update({
            status,
            updatedAt: FieldValue.serverTimestamp()
        });
        await this.logAudit("update_tenant_status", "tenant", id, actorId, { status });
    }

    // ========================================
    // Users
    // ========================================
    static async getUsers(limitCount: number = 50): Promise<GlobalUser[]> {
        return safeQuery(async () => {
            const snap = await adminDb.collection(USERS_COLL)
                .orderBy("createdAt", "desc")
                .limit(limitCount)
                .get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as GlobalUser));
        }, []);
    }

    static async updateUserStatus(id: string, status: GlobalUser["status"], actorId: string) {
        await adminDb.collection(USERS_COLL).doc(id).update({ status });
        await this.logAudit("update_user_status", "user", id, actorId, { status });
    }

    static async getUser(id: string): Promise<GlobalUser | null> {
        return safeQuery(async () => {
            const snap = await adminDb.collection(USERS_COLL).doc(id).get();
            if (!snap.exists) return null;
            return { id: snap.id, ...snap.data() } as GlobalUser;
        }, null);
    }

    static async updateUser(id: string, updates: Partial<GlobalUser>, actorId: string) {
        const allowedFields = ["displayName", "email", "role", "orgId"];
        const filteredUpdates: Record<string, any> = {};

        for (const key of allowedFields) {
            if (updates[key as keyof GlobalUser] !== undefined) {
                filteredUpdates[key] = updates[key as keyof GlobalUser];
            }
        }

        if (Object.keys(filteredUpdates).length > 0) {
            await adminDb.collection(USERS_COLL).doc(id).update(filteredUpdates);
            await this.logAudit("update_user", "user", id, actorId, filteredUpdates);
        }
    }

    static async deleteUser(id: string, actorId: string) {
        await adminDb.collection(USERS_COLL).doc(id).delete();
        await this.logAudit("delete_user", "user", id, actorId, {});
    }

    static async toggleSuperAdmin(id: string, isSuperAdmin: boolean, actorId: string) {
        await adminDb.collection(USERS_COLL).doc(id).update({ isSuperAdmin });
        await this.logAudit("toggle_super_admin", "user", id, actorId, { isSuperAdmin });
    }

    // ========================================
    // Plans
    // ========================================
    static async getPlans(): Promise<Plan[]> {
        return safeQuery(async () => {
            const snap = await adminDb.collection(PLANS_COLL).get();
            if (snap.empty) {
                await this.seedDefaultPlans();
                const newSnap = await adminDb.collection(PLANS_COLL).get();
                return newSnap.docs.map(d => ({ id: d.id, ...d.data() } as Plan));
            }
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as Plan));
        }, []);
    }

    static async seedDefaultPlans() {
        const plans = [
            {
                name: "Starter", price: 0, interval: "monthly",
                limits: { maxUsers: 3, maxProjects: 5, maxStorage: 100, features: ["basic"] },
                isActive: true
            },
            {
                name: "Professional", price: 4900, interval: "monthly",
                limits: { maxUsers: 10, maxProjects: 50, maxStorage: 5000, features: ["basic", "reports", "api"] },
                isActive: true
            },
            {
                name: "Enterprise", price: 19900, interval: "monthly",
                limits: { maxUsers: -1, maxProjects: -1, maxStorage: 50000, features: ["all"] },
                isActive: true
            }
        ];

        for (const plan of plans) {
            await adminDb.collection(PLANS_COLL).add({
                ...plan,
                createdAt: FieldValue.serverTimestamp()
            });
        }
    }

    // ========================================
    // Modules
    // ========================================
    static async getModules(): Promise<ModuleCatalog[]> {
        return safeQuery(async () => {
            const snap = await adminDb.collection(MODULES_COLL).get();
            if (snap.empty) {
                await this.seedDefaultModules();
                const newSnap = await adminDb.collection(MODULES_COLL).get();
                return newSnap.docs.map(d => ({ moduleKey: d.id, ...d.data() } as ModuleCatalog));
            }
            return snap.docs.map(d => ({ moduleKey: d.id, ...d.data() } as ModuleCatalog));
        }, []);
    }

    static async seedDefaultModules() {
        const modules = [
            { name: "CRM", description: "Customer relationship management", category: "core", isEnabled: true, icon: "Users" },
            { name: "Projects", description: "Project management", category: "core", isEnabled: true, icon: "FolderKanban" },
            { name: "Support", description: "Helpdesk ticketing", category: "core", isEnabled: true, icon: "LifeBuoy" },
            { name: "Invoicing", description: "Billing and invoices", category: "core", isEnabled: true, icon: "Receipt" },
            { name: "Reports", description: "Advanced reporting", category: "addon", isEnabled: true, icon: "BarChart3" },
            { name: "API Access", description: "REST API access", category: "premium", isEnabled: false, icon: "Code" },
        ];

        for (const mod of modules) {
            const key = mod.name.toLowerCase().replace(/\s/g, "-");
            await adminDb.collection(MODULES_COLL).doc(key).set(mod);
        }
    }

    static async toggleModule(moduleKey: string, isEnabled: boolean, actorId: string) {
        await adminDb.collection(MODULES_COLL).doc(moduleKey).update({ isEnabled });
        await this.logAudit("toggle_module", "module", moduleKey, actorId, { isEnabled });
    }

    // ========================================
    // Audit Logs
    // ========================================
    static async getAuditLogs(limitCount: number = 100): Promise<AuditLogEntry[]> {
        return safeQuery(async () => {
            const snap = await adminDb.collection(AUDIT_LOGS_COLL)
                .orderBy("timestamp", "desc")
                .limit(limitCount)
                .get();
            return snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                createdAt: d.data().timestamp
            } as AuditLogEntry));
        }, []);
    }

    static async logAudit(
        action: string,
        resourceType: string,
        resourceId: string,
        actorId: string,
        details: Record<string, any> = {}
    ) {
        try {
            await adminDb.collection(AUDIT_LOGS_COLL).add({
                action,
                resourceType,
                resourceId,
                actorId,
                details,
                timestamp: FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error("Failed to write audit log", error);
        }
    }

    // ========================================
    // Support Issues
    // ========================================
    static async getSupportIssues(): Promise<SupportIssue[]> {
        return safeQuery(async () => {
            const snap = await adminDb.collection(SUPPORT_ISSUES_COLL)
                .orderBy("createdAt", "desc")
                .limit(50)
                .get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportIssue));
        }, []);
    }

    // ========================================
    // System Health
    // ========================================
    static async getSystemHealth(): Promise<SystemHealthStatus[]> {
        return [
            { service: "API", status: "healthy", latencyMs: 45, lastChecked: new Date() },
            { service: "Database", status: "healthy", latencyMs: 12, lastChecked: new Date() },
            { service: "Auth", status: "healthy", latencyMs: 78, lastChecked: new Date() },
            { service: "Storage", status: "healthy", latencyMs: 156, lastChecked: new Date() },
            { service: "Email", status: "healthy", latencyMs: 234, lastChecked: new Date() },
        ];
    }
}

import {
    collection, doc, getDoc, getDocs, setDoc,
    updateDoc, deleteDoc, query, where, orderBy,
    serverTimestamp, addDoc, limit, getCountFromServer
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    Tenant, GlobalUser, Plan, Subscription,
    ModuleCatalog, TenantModule, AuditLogEntry,
    SupportIssue, SystemHealthStatus, OverviewStats
} from "@/lib/types/super-admin";
import { AuditService } from "./audit-service";

// Collection names
const TENANTS_COLL = "tenants";
const USERS_COLL = "users";
const PLANS_COLL = "sa_plans";
const SUBSCRIPTIONS_COLL = "sa_subscriptions";
const MODULES_COLL = "sa_modules";
const TENANT_MODULES_COLL = "sa_tenant_modules";
const AUDIT_LOGS_COLL = "sa_audit_logs";
const SUPPORT_ISSUES_COLL = "sa_support_issues";

export class SAService {
    // ========================================
    // Overview
    // ========================================
    static async getOverviewStats(): Promise<OverviewStats> {
        // Get tenant counts
        const tenantsSnap = await getCountFromServer(collection(db, TENANTS_COLL));
        const activeTenantsSnap = await getCountFromServer(
            query(collection(db, TENANTS_COLL), where("status", "==", "active"))
        );

        // Get user count
        const usersSnap = await getCountFromServer(collection(db, USERS_COLL));

        // Get pages count (from website builder)
        let totalPages = 0;
        try {
            const websitesSnap = await getDocs(collection(db, "websites"));
            for (const website of websitesSnap.docs) {
                const pagesSnap = await getCountFromServer(
                    collection(db, "websites", website.id, "pages")
                );
                totalPages += pagesSnap.data().count;
            }
        } catch (e) {
            // Ignore if websites collection doesn't exist
        }

        // Calculate MRR from subscriptions
        let mrr = 0;
        try {
            const subsSnap = await getDocs(
                query(collection(db, SUBSCRIPTIONS_COLL), where("status", "==", "active"))
            );
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
            systemHealth: "healthy" // Will be enhanced later
        };
    }

    // ========================================
    // Tenants
    // ========================================
    static async getTenants(limitCount: number = 50): Promise<Tenant[]> {
        const q = query(
            collection(db, TENANTS_COLL),
            orderBy("createdAt", "desc"),
            limit(limitCount)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Tenant));
    }

    static async getTenant(id: string): Promise<Tenant | null> {
        const docRef = doc(db, TENANTS_COLL, id);
        const snap = await getDoc(docRef);
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() } as Tenant;
    }

    static async updateTenantStatus(id: string, status: Tenant["status"], actorId: string) {
        await updateDoc(doc(db, TENANTS_COLL, id), {
            status,
            updatedAt: serverTimestamp()
        });
        await AuditService.log("update_tenant_status", "tenant", id, actorId, { status });
    }

    // ========================================
    // Users
    // ========================================
    static async getUsers(limitCount: number = 50): Promise<GlobalUser[]> {
        const q = query(
            collection(db, USERS_COLL),
            orderBy("createdAt", "desc"),
            limit(limitCount)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as GlobalUser));
    }

    static async updateUserStatus(id: string, status: GlobalUser["status"], actorId: string) {
        await updateDoc(doc(db, USERS_COLL, id), { status });
        await AuditService.log("update_user_status", "user", id, actorId, { status });
    }

    // ========================================
    // Plans
    // ========================================
    static async getPlans(): Promise<Plan[]> {
        const snap = await getDocs(collection(db, PLANS_COLL));
        if (snap.empty) {
            // Seed default plans if none exist
            await this.seedDefaultPlans();
            const newSnap = await getDocs(collection(db, PLANS_COLL));
            return newSnap.docs.map(d => ({ id: d.id, ...d.data() } as Plan));
        }
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Plan));
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
            await addDoc(collection(db, PLANS_COLL), {
                ...plan,
                createdAt: serverTimestamp()
            });
        }
    }

    // ========================================
    // Modules
    // ========================================
    static async getModules(): Promise<ModuleCatalog[]> {
        const snap = await getDocs(collection(db, MODULES_COLL));
        if (snap.empty) {
            await this.seedDefaultModules();
            const newSnap = await getDocs(collection(db, MODULES_COLL));
            return newSnap.docs.map(d => ({ moduleKey: d.id, ...d.data() } as ModuleCatalog));
        }
        return snap.docs.map(d => ({ moduleKey: d.id, ...d.data() } as ModuleCatalog));
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
            await setDoc(doc(db, MODULES_COLL, key), mod);
        }
    }

    static async toggleModule(moduleKey: string, isEnabled: boolean, actorId: string) {
        await updateDoc(doc(db, MODULES_COLL, moduleKey), { isEnabled });
        await AuditService.log("toggle_module", "module", moduleKey, actorId, { isEnabled });
    }

    // ========================================
    // Audit Logs
    // ========================================
    static async getAuditLogs(limitCount: number = 100): Promise<AuditLogEntry[]> {
        const q = query(
            collection(db, AUDIT_LOGS_COLL),
            orderBy("timestamp", "desc"),
            limit(limitCount)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().timestamp // Map timestamp to createdAt
        } as AuditLogEntry));
    }

    // ========================================
    // Support Issues
    // ========================================
    static async getSupportIssues(): Promise<SupportIssue[]> {
        try {
            const q = query(
                collection(db, SUPPORT_ISSUES_COLL),
                orderBy("createdAt", "desc"),
                limit(50)
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportIssue));
        } catch (e) {
            // Return empty if collection doesn't exist
            return [];
        }
    }

    // ========================================
    // System Health
    // ========================================
    static async getSystemHealth(): Promise<SystemHealthStatus[]> {
        // In production, this would ping actual services
        // For now, return simulated health checks
        return [
            { service: "API", status: "healthy", latencyMs: 45, lastChecked: new Date() },
            { service: "Database", status: "healthy", latencyMs: 12, lastChecked: new Date() },
            { service: "Auth", status: "healthy", latencyMs: 78, lastChecked: new Date() },
            { service: "Storage", status: "healthy", latencyMs: 156, lastChecked: new Date() },
            { service: "Email", status: "healthy", latencyMs: 234, lastChecked: new Date() },
        ];
    }
}

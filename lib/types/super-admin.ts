import { Timestamp } from "firebase/firestore";

// --- Tenant ---
export interface Tenant {
    id: string;
    name: string;
    subdomain: string;
    status: "active" | "suspended" | "trial" | "cancelled";
    planId: string | null;
    ownerUserId: string;
    settings: {
        logoUrl?: string;
        primaryColor?: string;
    };
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// --- Global User (Super Admin view) ---
export interface GlobalUser {
    id: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    status: "active" | "blocked";
    isSuperAdmin?: boolean;
    role?: string; // admin, member, etc.
    orgId?: string; // Primary organization ID
    tenantMemberships?: string[]; // Array of tenant IDs
    lastLoginAt?: Timestamp;
    createdAt?: Timestamp;
}

// --- Plan ---
export interface Plan {
    id: string;
    name: string;
    price: number; // monthly in cents
    interval: "monthly" | "yearly";
    limits: {
        maxUsers: number;
        maxProjects: number;
        maxStorage: number; // in MB
        features: string[];
    };
    isActive: boolean;
    createdAt: Timestamp;
}

// --- Subscription ---
export interface Subscription {
    id: string;
    tenantId: string;
    planId: string;
    status: "active" | "past_due" | "cancelled" | "trialing";
    mrr: number; // Monthly Recurring Revenue in cents
    startDate: Timestamp;
    endDate?: Timestamp;
    createdAt: Timestamp;
}

// --- Module Catalog ---
export interface ModuleCatalog {
    moduleKey: string; // e.g. "crm", "projects", "support"
    name: string;
    description: string;
    category: "core" | "addon" | "premium";
    isEnabled: boolean; // Global toggle
    icon?: string;
}

// --- Tenant Module Override ---
export interface TenantModule {
    tenantId: string;
    moduleKey: string;
    enabled: boolean;
    enabledAt?: Timestamp;
}

// --- Audit Log Entry ---
export interface AuditLogEntry {
    id: string;
    actorUserId: string;
    actorEmail?: string;
    action: string;
    targetType: "tenant" | "user" | "plan" | "module" | "website" | "page" | "section" | "asset" | "settings";
    targetId: string;
    payload: Record<string, any>;
    createdAt: Timestamp;
}

// --- Support Issue ---
export interface SupportIssue {
    id: string;
    tenantId: string;
    tenantName?: string;
    subject: string;
    status: "open" | "in_progress" | "resolved" | "closed";
    priority: "low" | "medium" | "high" | "critical";
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// --- System Health ---
export interface SystemHealthStatus {
    service: string;
    status: "healthy" | "degraded" | "down";
    latencyMs?: number;
    lastChecked: Date;
    message?: string;
}

// --- Overview Stats ---
export interface OverviewStats {
    totalTenants: number;
    activeTenants: number;
    totalUsers: number;
    totalPages: number;
    mrr: number;
    systemHealth: "healthy" | "degraded" | "down";
}

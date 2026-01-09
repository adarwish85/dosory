export enum SuperAdminRole {
    PlatformAdmin = "PlatformAdmin",
    ContentAdmin = "ContentAdmin",
    SupportAgent = "SupportAgent",
    BillingAdmin = "BillingAdmin",
    SecurityAdmin = "SecurityAdmin",
}

export interface SuperAdminUser {
    uid: string;
    email: string;
    role: SuperAdminRole;
    isSuperAdmin: true;
    status?: "active" | "disabled";
    createdAt?: unknown;
    updatedAt?: unknown;
}

export const SUPER_ADMIN_PERMISSIONS: Record<SuperAdminRole, string[]> = {
    [SuperAdminRole.PlatformAdmin]: ["*"],
    [SuperAdminRole.ContentAdmin]: ["website-builder", "media-library"],
    [SuperAdminRole.SupportAgent]: ["tenants", "users"],
    [SuperAdminRole.BillingAdmin]: ["billing", "plans"],
    [SuperAdminRole.SecurityAdmin]: ["audit-logs", "security"],
};

export function hasSuperAdminPermission(role: SuperAdminRole, permission: string): boolean {
    if (role === SuperAdminRole.PlatformAdmin) return true;
    return SUPER_ADMIN_PERMISSIONS[role]?.includes(permission) || false;
}

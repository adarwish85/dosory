// RBAC Core Type Definitions

import { BaseEntity } from "@/lib/types";

// 1. Role Definition
export interface Role extends BaseEntity {
    name: string;
    description: string;
    isSystemRole: boolean; // Immutable roles (Owner, Superadmin)
    permissions: string[]; // List of permission codes
}

// 2. Permission Definition (Static Registry Item)
export interface PermissionDefinition {
    code: string; // e.g. "finance.invoice.create.global"
    module: string;
    resource: string;
    action: RBACAction; // "create", "read", "update", "delete", "approve"
    scope: RBACScope; // "own", "global"
    description: string;
}

export type RBACAction = "create" | "read" | "update" | "delete" | "approve" | "assign" | "export" | "view" | "manage";
export type RBACScope = "own" | "global";

// 3. Normalized Permissions Structure for Frontend
export interface UserPermissions {
    isAdmin: boolean; // Bypass check for owners
    roles: string[]; // Assigned role IDs
    permissions: Set<string>; // Optimized lookup set
}

// 4. Module Registry Interface
export interface RBACModuleRegistry {
    moduleName: string;
    permissions: PermissionDefinition[];
}

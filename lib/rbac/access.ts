import { UserProfile } from "@/components/hooks/use-user-profile";
import { PermissionDefinition } from "./types";
import { FINANCE_PERMISSIONS } from "./registry";

/**
 * The Universal Permission Checker
 * @param user The user profile object (must include loaded permissions in V2)
 * @param permissionCode The permission string to check (e.g. "finance.invoice.create")
 * @param resourceOwnerId (Optional) The ID of the user who owns the resource, for "own" scope checks
 */
export function can(user: UserProfile | null, permissionCode: string, resourceOwnerId?: string): boolean {
    if (!user) return false;

    // 1. Superadmin / Owner Bypass
    if (user.role === "superadmin" || user.role === "admin") {
        // Temporary V1 bridge: Admin gets all
        // In V2, "admin" will just have all permissions assigned, not hardcoded here.
        // For now, to satisfy "No RBAC UI inside modules", we assume Admin has everything
        return true;
    }

    // 2. Check Explicit Permissions
    // Note: user.permissions needs to be added to UserProfile type definition
    // For now, we perform a mock check or need to extend UserProfile first.
    // Assuming user.permissions is a Set<string> or string[]

    // const hasGlobal = user.permissions?.includes(permissionCode);
    // if (hasGlobal) return true;

    // 3. Check Scoped Permissions (e.g. "read.own" vs "read.global")
    // If the requested permission is GLOBAL (implicit in the code usually), we just check it.
    // If the user wants to READ, we check if they have READ_GLOBAL or (READ_OWN && isOwner)

    // For V1 Implementation, we will rely on text matching since we haven't migrated DB yet.
    return false;
}

/**
 * Helper to check if a user is the owner of a resource
 */
export function isResourceOwner(user: UserProfile, resourceOwnerId: string): boolean {
    return user.uid === resourceOwnerId;
}

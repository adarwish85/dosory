/**
 * Pure permission-resolution logic (no React/Firebase imports) so it is unit-testable
 * and reusable on both client and server. The `usePermissions` hook re-exports these.
 */

export type ViewScope = "global" | "own" | "none";

/** Admins always pass; otherwise the code must be in the user's permission set. */
export function hasPermission(permissions: string[], isAdmin: boolean, requiredPermission: string): boolean {
    if (isAdmin) return true;
    return permissions.includes(requiredPermission);
}

/**
 * Can the user read this module at all? The catalog uses `${module}-view-own` /
 * `${module}-view-global` — there is NO bare `${module}-view` code, so accept either scope.
 * (The previous `${module}-view` check was dead for every non-admin.)
 */
export function canAccessModule(permissions: string[], isAdmin: boolean, module: string): boolean {
    if (isAdmin) return true;
    return permissions.includes(`${module}-view-own`) || permissions.includes(`${module}-view-global`);
}

/**
 * Resolve a user's READ scope for a module. Single source of truth for view-own vs
 * view-global — list hooks call this to decide whether to add an ownership `where` clause:
 *   "global" → all org records; "own" → only the user's own; "none" → no read access.
 */
export function getViewScope(permissions: string[], isAdmin: boolean, module: string): ViewScope {
    if (isAdmin) return "global";
    if (permissions.includes(`${module}-view-global`)) return "global";
    if (permissions.includes(`${module}-view-own`)) return "own";
    return "none";
}

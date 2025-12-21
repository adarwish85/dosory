"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ImpersonationState {
    isImpersonating: boolean;
    originalRole: string | null;
    impersonatedOrgId: string | null;
    impersonatedOrgName: string | null;
    startImpersonation: (orgId: string, orgName: string, originalRole: string) => void;
    stopImpersonation: () => void;
}

// Create a store for impersonation state that persists across page refreshes
export const useImpersonation = create<ImpersonationState>()(
    persist(
        (set) => ({
            isImpersonating: false,
            originalRole: null,
            impersonatedOrgId: null,
            impersonatedOrgName: null,
            startImpersonation: (orgId, orgName, originalRole) =>
                set({
                    isImpersonating: true,
                    impersonatedOrgId: orgId,
                    impersonatedOrgName: orgName,
                    originalRole,
                }),
            stopImpersonation: () =>
                set({
                    isImpersonating: false,
                    impersonatedOrgId: null,
                    impersonatedOrgName: null,
                    originalRole: null,
                }),
        }),
        {
            name: "impersonation-storage",
        }
    )
);

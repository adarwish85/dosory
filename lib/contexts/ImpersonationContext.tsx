"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ImpersonationState {
    isImpersonating: boolean;
    sessionId: string | null;
    impersonatedTenantId: string | null;
    startImpersonation: (sessionId: string, tenantId: string) => void;
    endImpersonation: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationState | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [impersonatedTenantId, setImpersonatedTenantId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Hydrate from localStorage
        const storedSession = localStorage.getItem("impersonation_session");
        const storedTenant = localStorage.getItem("impersonation_tenant");
        if (storedSession) setSessionId(storedSession);
        if (storedTenant) setImpersonatedTenantId(storedTenant);
    }, []);

    useEffect(() => {
        const originalFetch = window.fetch;

        if (sessionId) {
            window.fetch = async (...args) => {
                const [resource, config] = args;
                const headers = new Headers(config?.headers || {});
                headers.set("x-impersonation-session-id", sessionId);

                const newConfig = {
                    ...config,
                    headers
                };

                return originalFetch(resource, newConfig);
            };
        } else {
            window.fetch = originalFetch;
        }

        return () => {
            window.fetch = originalFetch;
        };
    }, [sessionId]);

    const startImpersonation = (sid: string, tid: string) => {
        setSessionId(sid);
        setImpersonatedTenantId(tid);
        localStorage.setItem("impersonation_session", sid);
        localStorage.setItem("impersonation_tenant", tid);
        // Force reload to ensure patch applies and SWR re-fetches
        // window.location.reload(); 
        // Actually, setting state triggers the effect which patches fetch.
        // But we want to redirect to the tenant dashboard.
        router.push("/dashboard");
    };

    const endImpersonation = async () => {
        if (!sessionId) return;
        try {
            await fetch("/api/sa/impersonation/end", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-impersonation-session-id": sessionId
                },
                body: JSON.stringify({ sessionId })
            });
        } catch (e) {
            console.error("Failed to end session clean API call", e);
        } finally {
            setSessionId(null);
            setImpersonatedTenantId(null);
            localStorage.removeItem("impersonation_session");
            localStorage.removeItem("impersonation_tenant");
            router.refresh();
            router.push("/sa/tenants");
        }
    };

    return (
        <ImpersonationContext.Provider value={{
            isImpersonating: !!sessionId,
            sessionId,
            impersonatedTenantId,
            startImpersonation,
            endImpersonation
        }}>
            {children}
        </ImpersonationContext.Provider>
    );
}

export function useImpersonation() {
    const context = useContext(ImpersonationContext);
    if (context === undefined) {
        throw new Error("useImpersonation must be used within an ImpersonationProvider");
    }
    return context;
}

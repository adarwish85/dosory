"use client";

import { useImpersonation } from "@/lib/contexts/ImpersonationContext";
import { useEffect, useState } from "react";

export function ImpersonationBanner() {
    const { isImpersonating, impersonatedTenantId, endImpersonation } = useImpersonation();
    const [elapsed, setElapsed] = useState(0);

    // Simple timer for display
    useEffect(() => {
        if (!isImpersonating) return;
        const interval = setInterval(() => setElapsed(n => n + 1), 1000);
        return () => clearInterval(interval);
    }, [isImpersonating]);

    if (!isImpersonating) return null;

    return (
        <div className="bg-orange-600 text-white px-4 py-2 flex items-center justify-between shadow-md z-50 relative">
            <div className="flex items-center gap-4 text-sm font-medium">
                <span className="bg-white/20 px-2 py-0.5 rounded text-xs uppercase tracking-wider">
                    Impersonation Mode
                </span>
                <span>
                    Viewing as Tenant: <strong>{impersonatedTenantId}</strong>
                </span>
            </div>

            <div className="flex items-center gap-4">
                <span className="text-xs opacity-80">
                    Session active
                </span>
                <button
                    onClick={() => endImpersonation()}
                    className="bg-white text-orange-700 hover:bg-orange-50 px-3 py-1 rounded text-xs font-bold transition-colors"
                >
                    Exit Impersonation
                </button>
            </div>
        </div>
    );
}

"use client";

import { LeadSidebar } from "@/components/dashboard/leads/lead-sidebar";
import { LeadProvider } from "@/components/dashboard/leads/lead-context";
import { use } from "react";

export default function LeadProfileLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const resolvedParams = use(params);

    return (
        <LeadProvider>
            <div className="flex h-full">
                {/* Secondary Sidebar */}
                <LeadSidebar />

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto bg-white p-6">
                    {children}
                </div>
            </div>
        </LeadProvider>
    );
}

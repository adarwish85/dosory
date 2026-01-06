"use client";

import { LeadSidebar } from "@/components/dashboard/leads/lead-sidebar";
import { LeadProvider } from "@/components/dashboard/leads/lead-context";
import { LeadProfileHeader } from "@/components/dashboard/leads/lead-profile-header";
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
            <div className="flex h-screen overflow-hidden">
                {/* Secondary Sidebar */}
                <LeadSidebar />

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                    <LeadProfileHeader />
                    <div className="flex-1 overflow-y-auto">{children}</div>
                </div>
            </div>
        </LeadProvider>
    );
}

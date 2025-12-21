"use client";

import { CustomerSidebar } from "@/components/dashboard/customers/customer-sidebar";
import { CustomerProvider } from "@/components/dashboard/customers/customer-context";
import { use } from "react";

export default function CustomerProfileLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const resolvedParams = use(params);

    return (
        <CustomerProvider>
            <div className="flex h-full">
                {/* Secondary Sidebar */}
                <CustomerSidebar />

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto bg-white p-6">
                    {children}
                </div>
            </div>
        </CustomerProvider>
    );
}

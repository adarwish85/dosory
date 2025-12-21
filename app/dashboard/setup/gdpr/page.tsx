"use client";

import { PageHeader } from "@/components/dashboard/shared/page-header";

export default function SetupGDPRPage() {
    return (
        <div className="p-6">
            <PageHeader title="GDPR Compliance" />
            <div className="mt-6 p-4 bg-white border rounded-lg">
                <p className="text-gray-500">GDPR compliance settings will appear here.</p>
            </div>
        </div>
    );
}

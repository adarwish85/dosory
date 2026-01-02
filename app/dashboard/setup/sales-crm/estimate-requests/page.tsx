"use client";

import { PageHeader } from "@/components/dashboard/shared/page-header";

export default function SetupEstimateRequestPage() {
    return (
        <div className="p-6">
            <PageHeader title="Estimate Request Setup" />
            <div className="mt-6 p-4 bg-white border rounded-lg">
                <p className="text-gray-500">Estimate request form settings will appear here.</p>
            </div>
        </div>
    );
}

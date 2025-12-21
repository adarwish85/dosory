"use client";

import { PageHeader } from "@/components/dashboard/shared/page-header";

export default function SetupModulesPage() {
    return (
        <div className="p-6">
            <PageHeader title="Modules Config" />
            <div className="mt-6 p-4 bg-white border rounded-lg">
                <p className="text-gray-500">Module configuration settings will appear here.</p>
            </div>
        </div>
    );
}

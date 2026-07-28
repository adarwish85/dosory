"use client";

import { useRouter } from "next/navigation";
import ImportWizard from "@/components/import/ImportWizard";

/**
 * Real route for the "Import Leads" quick action (RightSidebar links here). Without this
 * page the URL /dashboard/leads/import fell through to leads/[id] with id="import" and
 * rendered "Lead not found". A static segment takes routing precedence over [id], so this
 * fixes the fall-through and opens the existing ImportWizard directly.
 */
export default function LeadsImportPage() {
    const router = useRouter();
    const back = () => router.push("/dashboard/leads");
    return <ImportWizard open module="leads" onClose={back} onSuccess={back} />;
}

"use client";

import { useRouter } from "next/navigation";
import ImportWizard from "@/components/import/ImportWizard";

/**
 * Real route for the "Import Customers" quick action (RightSidebar links here). Same bug as
 * leads/import: without this page, /dashboard/customers/import fell through to customers/[id]
 * with id="import" and rendered a not-found state. Static segment wins over [id].
 */
export default function CustomersImportPage() {
    const router = useRouter();
    const back = () => router.push("/dashboard/customers");
    return <ImportWizard open module="customers" onClose={back} onSuccess={back} />;
}

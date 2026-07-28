"use client";

import { useRouter } from "next/navigation";
import AddCustomerPanel from "@/components/dashboard/customers/AddCustomerPanel";

/**
 * Real route for the "Add Customer" quick action (RightSidebar links here). Same bug class as
 * leads/customers /import (fixed in 70fc1c32): without this page, /dashboard/customers/new fell
 * through to customers/[id] with id="new" and hung on "Loading overview..." (plus a
 * permission-denied read of the nonexistent customers/new doc). A static segment wins over
 * [id], so this opens the existing AddCustomerPanel directly — mirroring leads/new, which is
 * why the leads quick action never had the bug.
 */
export default function NewCustomerPage() {
    const router = useRouter();
    const back = () => router.push("/dashboard/customers");
    return <AddCustomerPanel open onClose={back} onSuccess={back} />;
}

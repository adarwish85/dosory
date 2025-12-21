"use client";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import { DataTableShell } from "@/components/dashboard/shared/data-table-shell";
import { useInvoices } from "@/lib/hooks/use-invoices";

export default function SalesPage() {
    const { invoices, loading } = useInvoices();

    const data = invoices.map(inv => ({
        id: inv.id,
        invoiceId: inv.number,
        customer: inv.customerName || "Unknown",
        amount: inv.total,
        status: inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
        date: inv.date?.toDate().toLocaleDateString() || "",
    }));

    const columns = [
        { key: "invoiceId", label: "Invoice #" },
        { key: "customer", label: "Customer" },
        { key: "amount", label: "Amount" },
        { key: "status", label: "Status" },
        { key: "date", label: "Date" },
    ];

    return (
        <div className="p-6">
            <PageHeader title="Sales & Invoices" actionLabel="Create Invoice" />
            <DataTableShell columns={columns} data={data} searchPlaceholder="Search invoices..." />
        </div>
    );
}

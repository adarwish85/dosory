"use client";

import { PageHeader } from "@/components/dashboard/shared/page-header";
import { DataTableShell } from "@/components/dashboard/shared/data-table-shell";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { useTranslation } from "@/lib/i18n";

export default function SalesPage() {
    const { t } = useTranslation();
    const { invoices, loading } = useInvoices();

    const data = invoices.map((inv) => ({
        id: inv.id,
        invoiceId: inv.number,
        customer: inv.customerName || t("sales.invoices.unknownCustomer"),
        amount: inv.total,
        status: inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
        date: inv.date?.toDate().toLocaleDateString() || "",
    }));

    const columns = [
        { key: "invoiceId", label: t("sales.invoices.column.invoiceNumber") },
        { key: "customer", label: t("sales.invoices.column.customer") },
        { key: "amount", label: t("common.amount") },
        { key: "status", label: t("common.status") },
        { key: "date", label: t("common.date") },
    ];

    return (
        <div className="p-6">
            <PageHeader title={t("sales.invoices.title")} actionLabel={t("sales.invoices.create")} />
            <DataTableShell columns={columns} data={data} searchPlaceholder={t("sales.invoices.searchPlaceholder")} />
        </div>
    );
}

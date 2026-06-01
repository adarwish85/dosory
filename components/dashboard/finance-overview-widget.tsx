"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FileText, File } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StatusItem {
    label: string;
    count: number;
    percentage: number;
    color?: string;
}

interface OverviewColumnProps {
    title: string;
    icon: React.ReactNode;
    items: StatusItem[];
}

function OverviewColumn({ title, icon, items }: OverviewColumnProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                {/* Icon removed from header in image, but kept simple title with icon if desired. Image has icon. */}
                <div className="text-muted-foreground">{icon}</div>
                <h3 className="text-base font-bold text-gray-900">{title}</h3>
            </div>
            <div className="space-y-4">
                {items.map((item, index) => (
                    <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-700">{item.count}</span>
                                <span className={cn("font-medium", item.color)}>{item.label}</span>
                            </div>
                            <span className="text-muted-foreground text-xs">{item.percentage.toFixed(2)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full",
                                    item.color?.replace("text-", "bg-") || "bg-primary"
                                )}
                                style={{ width: `${item.percentage}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function FinanceOverviewWidget({
    invoiceStats,
    estimateStats,
}: {
    invoiceStats?: any;
    estimateStats?: any;
}) {
    const getPerc = (val: number, total: number) => (total > 0 ? (val / total) * 100 : 0);

    // Corrected Mapping
    // Draft: draft
    // Not Sent: sent but not viewed? Or just 'sent' + 'viewed' as "Sent"?
    // The previous code had "Not Sent" = sent + viewed. That's weird.
    // Let's assume standard flow: Draft -> Sent -> Viewed -> Partial -> Paid
    // "Not Sent" should be 0 if we follow standard logic, or maybe "Created" but not sent? usually that's Draft.
    // Let's stick to the labels but ensure counts are correct.

    // Total count for denominator
    const totalInvoices = invoiceStats?.total || 1;

    const invoiceItems = [
        {
            label: "Draft",
            count: invoiceStats?.draft || 0,
            percentage: getPerc(invoiceStats?.draft || 0, totalInvoices),
            color: "text-gray-500",
        },
        {
            label: "Sent",
            count: (invoiceStats?.sent || 0) + (invoiceStats?.viewed || 0),
            percentage: getPerc((invoiceStats?.sent || 0) + (invoiceStats?.viewed || 0), totalInvoices),
            color: "text-blue-600",
        },
        { label: "Unpaid", count: 0, percentage: 0, color: "text-red-500" }, // 'Unpaid' usually means Sent/Viewed but 0 payment. But we count those as Sent/Viewed. Let's keep 0 for now or map 'viewed' here?
        {
            label: "Partially Paid",
            count: invoiceStats?.partial || 0,
            percentage: getPerc(invoiceStats?.partial || 0, totalInvoices),
            color: "text-orange-500",
        },
        {
            label: "Overdue",
            count: invoiceStats?.overdue || 0,
            percentage: getPerc(invoiceStats?.overdue || 0, totalInvoices),
            color: "text-amber-600",
        },
        {
            label: "Paid",
            count: invoiceStats?.paid || 0,
            percentage: getPerc(invoiceStats?.paid || 0, totalInvoices),
            color: "text-green-500",
        },
        {
            label: "Cancelled",
            count: invoiceStats?.cancelled || 0,
            percentage: getPerc(invoiceStats?.cancelled || 0, totalInvoices),
            color: "text-gray-400",
        }, // Added Cancelled
    ];

    const estimateItems = [
        {
            label: "Draft",
            count: estimateStats?.draft || 0,
            percentage: getPerc(estimateStats?.draft || 0, estimateStats?.total || 1),
            color: "text-gray-500",
        },
        {
            label: "Sent",
            count: estimateStats?.sent || 0,
            percentage: getPerc(estimateStats?.sent || 0, estimateStats?.total || 1),
            color: "text-blue-500",
        },
        {
            label: "Expired",
            count: estimateStats?.expired || 0,
            percentage: getPerc(estimateStats?.expired || 0, estimateStats?.total || 1),
            color: "text-amber-600",
        },
        {
            label: "Declined",
            count: estimateStats?.declined || 0,
            percentage: getPerc(estimateStats?.declined || 0, estimateStats?.total || 1),
            color: "text-red-500",
        },
        {
            label: "Accepted",
            count: estimateStats?.accepted || 0,
            percentage: getPerc(estimateStats?.accepted || 0, estimateStats?.total || 1),
            color: "text-green-500",
        },
    ];

    // Calculate Amounts
    const amounts = invoiceStats?.amountsByStatus || {};
    const outstandingAmount =
        (amounts.sent || 0) + (amounts.viewed || 0) + (amounts.partial || 0) + (amounts.overdue || 0); // Everything not paid/draft/cancelled
    const pastDueAmount = amounts.overdue || 0;
    const paidAmount = amounts.paid || 0;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP" }).format(amount);
    };

    return (
        <Card className="rounded-xl border border-gray-100 shadow-sm py-0 gap-0 bg-white">
            <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <OverviewColumn
                        title="Invoice overview"
                        icon={<FileText className="h-5 w-5" />}
                        items={invoiceItems}
                    />
                    <OverviewColumn
                        title="Estimate overview"
                        icon={<File className="h-5 w-5" />}
                        items={estimateItems}
                    />
                </div>

                <div className="my-8 border-t border-gray-100" />

                <div className="space-y-4">
                    <div className="flex justify-end gap-3">
                        <Select defaultValue="EGP">
                            <SelectTrigger className="w-[100px] border-none shadow-none font-bold text-gray-600">
                                <SelectValue placeholder="Currency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EGP">EGP EGP</SelectItem>
                                <SelectItem value="USD">USD USD</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select defaultValue="2025">
                            <SelectTrigger className="w-[80px] border-none shadow-none font-bold text-gray-700">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2025">2025</SelectItem>
                                <SelectItem value="2024">2024</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-amber-600 mb-1">Outstanding Invoices</div>
                            <div className="text-lg font-bold text-gray-800">{formatCurrency(outstandingAmount)}</div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">Past Due Invoices</div>
                            <div className="text-lg font-bold text-gray-800">{formatCurrency(pastDueAmount)}</div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-green-600 mb-1">Paid Invoices</div>
                            <div className="text-lg font-bold text-gray-800">{formatCurrency(paidAmount)}</div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Invoice } from "@/lib/types";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface InvoiceHeaderProps {
    invoices: Invoice[];
}

export function InvoiceHeader({ invoices }: InvoiceHeaderProps) {
    // Calculate summaries
    const paidAmount = invoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + inv.total, 0);

    // For partial payments, we should count the paid portion towards "Paid" stats generically?
    // The design says "Paid Invoices EGP...", usually implies fully paid or total collected.
    // Let's assume Total Collected for now to be accurate to cash flow, or just sum of Paid status.
    // Given the label "Paid Invoices", it likely means sum of Full Paid invoices.
    // However, "Outstanding" usually means Amount Due.

    // Let's refine based on typical accounting:
    // Paid Invoices: Sum of `amountPaid` across all invoices? Or just invoices marked as Paid?
    // Let's go with: Sum of `amountPaid` across ALL invoices.
    const totalCollected = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);

    // Past Due: Sum of `amountDue` for overdue invoices
    const pastDueAmount = invoices
        .filter((inv) => inv.status === "overdue")
        .reduce((sum, inv) => sum + (inv.amountDue || 0), 0);

    // Outstanding: Sum of `amountDue` across ALL invoices (including sent, partial, overdue)
    const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.amountDue || 0), 0);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "EGP", // Using EGP as per screenshot, or make dynamic later
        }).format(amount);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                    <Link
                        href="#"
                        className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
                    >
                        Recurring Invoices <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>

                <div className="flex flex-col gap-3 items-end">
                    <div className="flex gap-2">
                        <Select defaultValue="EGP">
                            <SelectTrigger className="w-[80px] h-8 bg-transparent border-none font-semibold text-gray-600 hover:text-gray-900 shadow-none px-0">
                                <SelectValue placeholder="Currency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EGP">EGP</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select defaultValue="2025">
                            <SelectTrigger className="w-[80px] h-8 bg-transparent border-none font-semibold text-gray-600 hover:text-gray-900 shadow-none px-0">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2025">2025</SelectItem>
                                <SelectItem value="2024">2024</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <div className="px-3 py-1.5 rounded-md bg-green-50 border border-green-100 flex items-center gap-2">
                            <span className="text-xs font-medium text-green-600">Paid Invoices</span>
                            <span className="text-sm font-bold text-gray-900">{formatCurrency(totalCollected)}</span>
                        </div>
                        <div className="px-3 py-1.5 rounded-md bg-red-50 border border-red-100 flex items-center gap-2">
                            <span className="text-xs font-medium text-red-600">Past Due Invoices</span>
                            <span className="text-sm font-bold text-gray-900">{formatCurrency(pastDueAmount)}</span>
                        </div>
                        <div className="px-3 py-1.5 rounded-md bg-yellow-50 border border-yellow-100 flex items-center gap-2">
                            <span className="text-xs font-medium text-yellow-600">Outstanding Invoices</span>
                            <span className="text-sm font-bold text-gray-900">{formatCurrency(totalOutstanding)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

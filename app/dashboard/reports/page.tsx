"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileText, BarChart2, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function ReportsPage() {
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        invoices: false,
        items: false,
        payments: false,
        "credit-notes": false,
        proposals: false,
        estimates: false,
        customers: false,
        "total-income": false,
        "payment-modes": false,
        "total-value": false,
    });

    const toggle = (key: string) => {
        setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const SectionItem = ({ id, label }: { id: string; label: string }) => (
        <div
            className="flex items-center gap-2 py-2 px-2 hover:bg-gray-50 rounded cursor-pointer text-gray-600 font-medium text-sm transition-colors"
            onClick={() => toggle(id)}
        >
            {openSections[id] ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
            {label}
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Sales Report Column */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-6">
                        <FileText className="h-5 w-5 text-gray-600" />
                        <h2 className="text-xl font-bold text-gray-900">Sales Report</h2>
                    </div>

                    <div className="space-y-1">
                        <SectionItem id="invoices" label="Invoices Report" />
                        <SectionItem id="items" label="Items Report" />
                        <SectionItem id="payments" label="Payments Received" />
                        <SectionItem id="credit-notes" label="Credit Notes Report" />
                        <SectionItem id="proposals" label="Proposals Report" />
                        <SectionItem id="estimates" label="Estimates Report" />
                        <SectionItem id="customers" label="Customers Report" />
                    </div>

                    <div className="pt-8 flex items-center gap-2 text-red-500 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>Cancelled invoices are excluded from the report</span>
                    </div>
                </div>

                {/* Charts Based Report Column */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart2 className="h-5 w-5 text-gray-600" />
                        <h2 className="text-xl font-bold text-gray-900">Charts Based Report</h2>
                    </div>

                    <div className="space-y-1">
                        <SectionItem id="total-income" label="Total Income" />
                        <SectionItem id="payment-modes" label="Payment Modes (Transactions)" />
                        <SectionItem id="total-value" label="Total Value By Customer Groups" />
                    </div>
                </div>
            </div>
        </div>
    );
}

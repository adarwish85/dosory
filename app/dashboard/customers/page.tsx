"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { StatsRow } from "@/components/dashboard/customers/stats-row";
import { CustomersTable } from "@/components/dashboard/customers/customers-table";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Filter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import AddCustomerPanel from "@/components/dashboard/customers/AddCustomerPanel";
import { useCustomers, useContacts } from "@/lib/hooks";
import { TableSkeleton } from "@/components/ui/skeleton-loaders";

// Dynamic import for better code splitting
const ImportWizard = dynamic(() => import("@/components/import/ImportWizard"), {
    ssr: false,
});

export default function CustomersPage() {
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [showImportWizard, setShowImportWizard] = useState(false);

    // Fetch all customers/contacts for stats
    const [filterStatus, setFilterStatus] = useState<"all" | "active">("all");
    const { customers, loading } = useCustomers({ status: filterStatus });
    const { contacts } = useContacts();

    // Calculate stats
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.status === "active").length;
    const inactiveCustomers = customers.filter(c => c.status !== "active").length;

    // Calculate contact stats (filtering by status if available, assuming valid status check)
    // Contact interface has status: EntityStatus ("active" | "inactive" | "archived")
    const activeContacts = contacts.filter(c => c.status === "active").length;
    const inactiveContacts = contacts.filter(c => c.status !== "active").length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Customers</h1>
            </div>

            {/* Stats */}
            <StatsRow
                totalCustomers={totalCustomers}
                activeCustomers={activeCustomers}
                inactiveCustomers={inactiveCustomers}
                activeContacts={activeContacts}
                inactiveContacts={inactiveContacts}
            />

            {/* Actions Row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        className="bg-gray-900 hover:bg-gray-800 text-white"
                        onClick={() => setShowAddPanel(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Customer
                    </Button>
                    <Button
                        variant="outline"
                        className="text-gray-700 bg-white"
                        onClick={() => setShowImportWizard(true)}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Import Customers
                    </Button>
                </div>

                <div className="flex gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "text-gray-700 bg-white hover:bg-gray-50",
                                    filterStatus === "active" && "border-blue-600 text-blue-600 bg-blue-50"
                                )}
                            >
                                <Filter className={cn("mr-2 h-4 w-4", filterStatus === "active" ? "fill-blue-600" : "fill-none")} />
                                {filterStatus === "active" ? "Active only" : "Filter"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="end">
                            <div className="p-3 text-xs flex justify-between text-blue-600 bg-gray-50 border-b">
                                <span className="cursor-pointer hover:underline">New Filter</span>
                                <div className="space-x-2">
                                    <span
                                        className="cursor-pointer hover:underline"
                                        onClick={() => setFilterStatus("all")}
                                    >
                                        Clear Filter
                                    </span>
                                    <span className="cursor-pointer hover:underline">Edit</span>
                                </div>
                            </div>
                            <div className="p-2 space-y-1">
                                <div
                                    className={cn(
                                        "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-gray-100",
                                        filterStatus === "active" && "bg-blue-50 text-blue-600"
                                    )}
                                    onClick={() => setFilterStatus("active")}
                                >
                                    <span className={cn("text-gray-400", filterStatus === "active" && "text-blue-600")}>☆</span>
                                    <span>Active only</span>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Table */}
            <CustomersTable customers={customers} loading={loading} />

            {/* Add Customer Panel */}
            <AddCustomerPanel
                open={showAddPanel}
                onClose={() => setShowAddPanel(false)}
                onSuccess={() => {
                    // Table will auto-refresh due to hook
                }}
            />

            {/* Import Wizard */}
            <ImportWizard
                open={showImportWizard}
                onClose={() => setShowImportWizard(false)}
                module="customers"
                onSuccess={(count) => {
                    console.log(`Imported ${count} customers`);
                }}
            />
        </div>
    );
}



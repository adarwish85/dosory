"use client";

import { useState } from "react";
import { StatsRow } from "@/components/dashboard/customers/stats-row";
import { CustomersTable } from "@/components/dashboard/customers/customers-table";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import AddCustomerPanel from "@/components/dashboard/customers/AddCustomerPanel";
import ImportWizard from "@/components/import/ImportWizard";
import { useCustomers, useContacts } from "@/lib/hooks";

export default function CustomersPage() {
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [showImportWizard, setShowImportWizard] = useState(false);

    // Fetch all customers/contacts for stats
    const { customers } = useCustomers({ status: "all" });
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
                            <Button variant="outline" className="text-gray-700 bg-white border-blue-600 text-blue-600 hover:bg-blue-50">
                                <Filter className="mr-2 h-4 w-4 fill-blue-600" />
                                Active only
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="end">
                            <div className="p-3 text-xs flex justify-between text-blue-600 bg-gray-50 border-b">
                                <span className="cursor-pointer hover:underline">New Filter</span>
                                <div className="space-x-2">
                                    <span className="cursor-pointer hover:underline">Clear Filter</span>
                                    <span className="cursor-pointer hover:underline">Edit</span>
                                </div>
                            </div>
                            <div className="p-2">
                                <div className="flex items-center gap-2 px-2 py-1.5 text-sm bg-gray-100 rounded-md">
                                    <span className="text-blue-600">☆</span>
                                    <span>Active only</span>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Table */}
            <CustomersTable />

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



"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Search, RefreshCw, Pen, Trash2 } from "lucide-react";
import { AddPaymentModeDialog } from "@/components/dashboard/setup/finance/add-payment-mode-dialog";

export default function PaymentModesPage() {
    const paymentModes = [
        { id: 1, name: "Bank", description: "", active: true },
        { id: 2, name: "Cash", description: "", active: true },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <AddPaymentModeDialog />
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <p className="text-sm text-yellow-800">
                    <span className="font-semibold">Note:</span> Payment modes listed below are offline modes. Payment gateways can be configured in Setup→ Settings →Payment Gateways
                </p>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Select defaultValue="25">
                            <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="25" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="25">25</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline">Export</Button>
                        <Button variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                    <div className="relative w-64">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input placeholder="Search..." className="pl-9" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-md border shadow-sm">
                    <div className="px-6 py-3 border-b bg-gray-50">
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-1 font-bold text-gray-900 text-sm">ID</div>
                            <div className="col-span-4 font-bold text-gray-900 text-sm">Payment Mode Name</div>
                            <div className="col-span-4 font-bold text-gray-900 text-sm">Bank Accounts / Description</div>
                            <div className="col-span-2 font-bold text-gray-900 text-sm">Active</div>
                            <div className="col-span-1 font-bold text-gray-900 text-sm text-right">Options</div>
                        </div>
                    </div>
                    <div className="divide-y">
                        {paymentModes.map((mode) => (
                            <div key={mode.id} className="px-6 py-4 h-16 group hover:bg-gray-50 transition-colors">
                                <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-1 text-gray-700">{mode.id}</div>
                                    <div className="col-span-4 font-medium text-gray-900">{mode.name}</div>
                                    <div className="col-span-4 text-gray-700">{mode.description || "-"}</div>
                                    <div className="col-span-2">
                                        <Switch defaultChecked={mode.active} />
                                    </div>
                                    <div className="col-span-1 flex items-center justify-end gap-2 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Pen className="h-4 w-4 cursor-pointer hover:text-blue-600" />
                                        <Trash2 className="h-4 w-4 cursor-pointer hover:text-red-600" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="px-6 py-4 border-t bg-gray-50 rounded-b-md">
                        <div className="text-xs text-gray-500 flex justify-end items-center gap-4">
                            <span>Showing 1 to {paymentModes.length} of {paymentModes.length} entries</span>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" disabled className="text-xs">Previous</Button>
                                <div className="bg-gray-200 text-gray-700 px-2.5 py-1 rounded text-xs font-medium">1</div>
                                <Button variant="ghost" size="sm" disabled className="text-xs">Next</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

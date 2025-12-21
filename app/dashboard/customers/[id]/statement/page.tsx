"use client";

import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Download, Mail } from "lucide-react";

export default function StatementPage() {
    const { customer, loading } = useCustomer();

    if (loading) {
        return <div className="p-8">Loading statement...</div>;
    }

    const customerName = customer?.company || "Customer";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Customer Statement For {customerName}</h2>
            </div>

            {/* Statement Container (The Paper) */}
            <div className="rounded-md border bg-white shadow-sm">

                {/* Control Bar */}
                <div className="p-4 border-b flex items-center justify-between bg-gray-50/30">
                    <Select defaultValue="month">
                        <SelectTrigger className="w-[180px] bg-white">
                            <SelectValue placeholder="This Month" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="quarter">This Quarter</SelectItem>
                            <SelectItem value="year">This Year</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="bg-white text-gray-600">
                            <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="bg-white text-gray-600">
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="bg-white text-gray-600">
                            <Mail className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Statement Content */}
                <div className="p-8 space-y-8">

                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div className="invisible" /> {/* Spacer for alignment if logo needed later */}
                        <div className="text-right text-sm text-gray-600 leading-relaxed">
                            <p className="font-bold text-gray-900">Your Company</p>
                            <p>Address Line 1</p>
                            <p>City, State</p>
                            <p>Country ZIP</p>
                        </div>
                    </div>

                    {/* Addresses & Summary Header */}
                    <div className="flex justify-between items-start pt-4">
                        <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-gray-900">To:</h3>
                            <p className="text-sm font-bold text-gray-900">{customerName}</p>
                            {customer?.address?.street && <p className="text-sm text-gray-600">{customer.address.street}</p>}
                            {customer?.address?.city && <p className="text-sm text-gray-600">{customer.address.city}, {customer.address.state}</p>}
                        </div>
                        <div className="text-right space-y-1">
                            <h3 className="text-xl font-bold text-gray-900">Account Summary</h3>
                            <p className="text-sm text-gray-500">Current Period</p>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="flex justify-end pt-4">
                        <div className="w-64 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Beginning Balance:</span>
                                <span className="font-medium text-gray-900">$0.00</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Invoiced Amount:</span>
                                <span className="font-medium text-gray-900">$0.00</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Amount Paid:</span>
                                <span className="font-medium text-gray-900">$0.00</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t mt-2">
                                <span className="font-semibold text-gray-900">Balance Due:</span>
                                <span className="font-semibold text-gray-900">$0.00</span>
                            </div>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="pt-8 space-y-4">
                        <div className="text-center text-sm font-medium text-gray-600">
                            No transactions found for the selected period
                        </div>

                        <div className="border rounded-t-md overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                                        <TableHead className="font-bold text-gray-900">Date</TableHead>
                                        <TableHead className="font-bold text-gray-900">Details</TableHead>
                                        <TableHead className="font-bold text-gray-900 text-right">Amount</TableHead>
                                        <TableHead className="font-bold text-gray-900 text-right">Payments</TableHead>
                                        <TableHead className="font-bold text-gray-900 text-right">Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            No transactions found
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        {/* Footer Balance */}
                        <div className="flex justify-end p-3 bg-gray-50 rounded-b-md border-x border-b">
                            <div className="flex gap-12 text-sm">
                                <span className="font-medium text-gray-600">Balance Due</span>
                                <span className="font-bold text-gray-900">$0.00</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

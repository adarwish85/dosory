"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, RefreshCw, LayoutGrid, List, FileText, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatsGroup } from "@/components/dashboard/customers/stats-group";

export default function SalesInvoicesPage() {
    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
                        <a href="#" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                            Recurring Invoices →
                        </a>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select defaultValue="EGP">
                            <SelectTrigger className="w-[100px] border-none bg-transparent hover:bg-gray-50 focus:ring-0 font-medium">
                                <span className="text-gray-500 mr-1">EGP</span>
                                <SelectValue placeholder="EGP" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EGP">EGP</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select defaultValue="2025">
                            <SelectTrigger className="w-[80px] border-none bg-transparent hover:bg-gray-50 focus:ring-0 font-medium">
                                <SelectValue placeholder="2025" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2025">2025</SelectItem>
                                <SelectItem value="2024">2024</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Summary Badges */}
                <div className="flex justify-end gap-2 text-sm font-medium">
                    <div className="bg-green-50 text-green-700 px-3 py-1 rounded border border-green-100">
                        Paid Invoices <span className="font-bold ml-1">EGP530,722.00</span>
                    </div>
                    <div className="bg-red-50 text-red-700 px-3 py-1 rounded border border-red-100">
                        Past Due Invoices <span className="font-bold ml-1">EGP0.00</span>
                    </div>
                    <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded border border-orange-100">
                        Outstanding Invoices <span className="font-bold ml-1">EGP67,208.00</span>
                    </div>
                </div>

                {/* Stats Cards */}
                <StatsGroup
                    items={[
                        { label: "Unpaid (6.90%)", amount: "2 / 29", color: "red" },
                        { label: "Paid (75.86%)", amount: "22 / 29", color: "green" },
                        { label: "Partially Paid (3.45%)", amount: "1 / 29", color: "orange" },
                        { label: "Overdue (6.90%)", amount: "2 / 29", color: "orange" },
                        { label: "Draft (0.00%)", amount: "0 / 29", color: "default" },
                    ]}
                />
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-md">
                        <Plus className="mr-2 h-4 w-4" /> Create New Invoice
                    </Button>
                    <Button variant="outline" className="text-gray-700 font-normal">
                        <Plus className="mr-2 h-4 w-4" /> Batch Payments
                    </Button>
                    <Button variant="outline" size="icon" className="text-gray-500">
                        <FileText className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-9 w-9 text-gray-400">«</Button>
                    <Button variant="outline" className="text-gray-600">
                        <Filter className="mr-2 h-4 w-4" /> Filters
                    </Button>
                </div>
            </div>

            {/* Filters and Search */}
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
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input placeholder="Search..." className="pl-9" />
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Invoice #</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Amount</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Total Tax</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Date</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Customer</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Project</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Tags</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Due Date</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[
                            { id: "INV-000123", amount: "EGP32,604.00", tax: "EGP4,004.00", date: "09/12/2025", customer: "Egyptian German Industrial Corporation (EGIC)", project: "EGIC Export", due: "08/01/2026", status: "Unpaid" },
                            { id: "INV-000122", amount: "EGP32,604.00", tax: "EGP4,004.00", date: "09/12/2025", customer: "Egyptian German Industrial Corporation (EGIC)", project: "EGIC Local", due: "08/01/2026", status: "Unpaid" },
                            { id: "INV-000121", amount: "$684.00", tax: "$84.00", date: "02/11/2025", customer: "Tahweel Integrated", project: "", due: "02/12/2025", status: "Overdue" },
                            { id: "INV-000120", amount: "$1,026.00", tax: "$126.00", date: "26/10/2025", customer: "Tahweel Integrated", project: "", due: "25/11/2025", status: "Overdue" },
                            { id: "INV-000119", amount: "EGP47,880.00", tax: "EGP5,880.00", date: "26/10/2025", customer: "Egyptian German Industrial Corporation (EGIC)", project: "EGIC Local", due: "25/11/2025", status: "Paid" },
                            { id: "INV-000118", amount: "EGP23,940.00", tax: "EGP2,940.00", date: "26/10/2025", customer: "Insights Lab", project: "Insights Lab Website (informational)", due: "25/11/2025", status: "Paid" },
                            { id: "INV-000117", amount: "EGP62,502.78", tax: "EGP7,675.78", date: "13/10/2025", customer: "Egyptian German Industrial Corporation (EGIC)", project: "EGIC Export", due: "12/11/2025", status: "Paid" },
                        ].map((row) => (
                            <TableRow key={row.id} className="h-16 group">
                                <TableCell className="min-w-[150px] py-3">
                                    <div className="flex flex-col group">
                                        <span className="text-gray-900 hover:text-blue-600 cursor-pointer text-base font-semibold">{row.id}</span>
                                        <span className="text-gray-500 text-xs mt-0.5 group-hover:hidden">View Details</span>
                                        <div className="hidden group-hover:flex items-center gap-3 mt-0.5">
                                            <span className="text-xs font-medium text-gray-900 hover:underline cursor-pointer">Edit</span>
                                            <span className="text-gray-300">|</span>
                                            <span className="text-xs font-medium text-red-600 hover:underline cursor-pointer">Delete</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-gray-900">{row.amount}</TableCell>
                                <TableCell className="text-gray-900">{row.tax}</TableCell>
                                <TableCell className="text-gray-500">{row.date}</TableCell>
                                <TableCell className="text-gray-900 hover:text-blue-600 cursor-pointer">{row.customer}</TableCell>
                                <TableCell className="text-gray-900">{row.project}</TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-gray-900">{row.due}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`font-normal ${row.status === 'Paid' ? 'text-green-600 border-green-200 bg-green-50' :
                                        row.status === 'Unpaid' ? 'text-red-600 border-red-200 bg-red-50' :
                                            'text-orange-600 border-orange-200 bg-orange-50'
                                        }`}>
                                        {row.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center text-sm text-gray-500 gap-2 mt-4 ml-1">
                Showing 1 to 7 of 29 entries
                <div className="flex gap-1 ml-auto">
                    <Button variant="ghost" disabled className="text-gray-400">Previous</Button>
                    <Button variant="secondary" className="bg-gray-200 text-gray-900 h-8 w-8 p-0">1</Button>
                    <Button variant="secondary" className="bg-transparent hover:bg-gray-100 text-gray-900 h-8 w-8 p-0">2</Button>
                    <Button variant="secondary" className="bg-transparent hover:bg-gray-100 text-gray-900 h-8 w-8 p-0">3</Button>
                    <Button variant="secondary" className="bg-transparent hover:bg-gray-100 text-gray-900 h-8 w-8 p-0">4</Button>
                    <Button variant="ghost" className="text-gray-900 hover:bg-gray-100">Next</Button>
                </div>
            </div>
        </div>
    );
}

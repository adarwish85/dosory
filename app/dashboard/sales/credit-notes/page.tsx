"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, RefreshCw, FileText } from "lucide-react";

export default function SalesCreditNotesPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-md">
                        <Plus className="mr-2 h-4 w-4" /> New Credit Note
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
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input placeholder="Search..." className="pl-9" />
                    </div>
                </div>

                <div className="border rounded-md bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Credit Note #</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Credit Note Date</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Customer</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Status</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Project</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Reference #</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Amount</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Remaining Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-4 text-gray-500 text-left pl-4">
                                    No entries found
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
                {/* Empty state pagination often hidden or disabled, keeping simple structure */}
            </div>
        </div>
    );
}

"use client";

import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { useVault } from "@/lib/hooks/use-customer-data";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Loader2, Lock, Eye, EyeOff, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState } from "react";

export default function VaultPage() {
    const { customer, loading: customerLoading, customerId } = useCustomer();
    const { vaultItems, loading: vaultLoading, deleteVaultItem } = useVault({ customerId: customerId || undefined });
    const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());

    if (customerLoading || vaultLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "-";
        try {
            const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
            return format(date, "dd/MM/yyyy");
        } catch {
            return "-";
        }
    };

    const toggleVisibility = (id: string) => {
        setVisibleItems((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const maskContent = (content: string) => {
        return "•".repeat(Math.min(content.length, 20));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-gray-700" />
                <h2 className="text-xl font-bold text-gray-900">Vault</h2>
            </div>

            <p className="text-sm text-gray-500">
                Store sensitive customer information securely. All vault entries are encrypted.
            </p>

            <Button className="bg-gray-900 text-white hover:bg-gray-800">
                <Plus className="mr-2 h-4 w-4" /> Add Entry
            </Button>

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
                        <Button variant="outline" size="icon">
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input placeholder="Search vault..." className="pl-9" />
                    </div>
                </div>

                <div className="border rounded-md bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Title</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Content</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Visibility</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Created</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50 text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vaultItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        No vault entries found for {customer?.company || "this customer"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                vaultItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Lock className="h-4 w-4 text-gray-400" />
                                                <span className="font-medium">{item.title}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {visibleItems.has(item.id) ? item.content : maskContent(item.content)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={`font-normal ${item.visibility === "shared" ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-600"}`}
                                            >
                                                {item.visibility === "shared" ? (
                                                    <>
                                                        <Users className="h-3 w-3 mr-1" /> Shared
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock className="h-3 w-3 mr-1" /> Private
                                                    </>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-500">{formatDate(item.createdAt)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => toggleVisibility(item.id)}
                                                >
                                                    {visibleItems.has(item.id) ? (
                                                        <EyeOff className="h-4 w-4 text-gray-500" />
                                                    ) : (
                                                        <Eye className="h-4 w-4 text-gray-500" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => deleteVaultItem(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

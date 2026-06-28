"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, RefreshCw, FileText } from "lucide-react";
import Link from "next/link";

import { useCreditNotes } from "@/lib/hooks/use-customer-data";
import { useTranslation } from "@/lib/i18n";

export default function CreditNotesPage() {
    const { t } = useTranslation();
    const { creditNotes, loading } = useCreditNotes();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/accounting/credit-notes/new">
                        <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-md">
                            <Plus className="mr-2 h-4 w-4" /> {t("accounting.creditNotes.new")}
                        </Button>
                    </Link>
                    <Button variant="outline" size="icon" className="text-gray-500">
                        <FileText className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-9 w-9 text-gray-400">
                        «
                    </Button>
                    <Button variant="outline" className="text-gray-600">
                        <Filter className="mr-2 h-4 w-4" /> {t("common.filters")}
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
                        <Button variant="outline">{t("common.export")}</Button>
                        <Button variant="outline" size="icon">
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input placeholder={t("common.searchPlaceholder")} className="pl-9" />
                    </div>
                </div>

                <div className="border rounded-md bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">
                                    {t("accounting.creditNotes.number")}
                                </TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">
                                    {t("common.date")}
                                </TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("accounting.payments.customer")}</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("common.status")}</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("common.amount")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4">
                                        {t("common.loading")}
                                    </TableCell>
                                </TableRow>
                            ) : creditNotes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                                        {t("accounting.creditNotes.empty")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                creditNotes.map((note) => (
                                    <TableRow key={note.id}>
                                        <TableCell className="font-medium">
                                            <Link href={`/dashboard/accounting/credit-notes/${note.id}`} className="hover:underline">
                                                {note.number || t("accounting.creditNotes.draft")}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{note.date ? new Date(note.date.seconds * 1000).toLocaleDateString() : t("common.notAvailable")}</TableCell>
                                        <TableCell>{note.customerName || t("common.unknown")}</TableCell>
                                        <TableCell>
                                            <span className="capitalize px-2 py-1 rounded-full text-xs bg-gray-100">
                                                {note.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>{note.total?.toFixed(2)}</TableCell>
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

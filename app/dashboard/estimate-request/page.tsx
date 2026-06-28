"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function EstimateRequestPage() {
    const { t } = useTranslation();
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-md">
                    <Plus className="mr-2 h-4 w-4" /> {t("sales.estimateRequest.newForm")}
                </Button>
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
                                <TableHead className="w-10 text-gray-900 font-semibold bg-gray-100/50">#</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("common.email")}</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("sales.estimateRequest.column.tags")}</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("sales.estimateRequest.column.assigned")}</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("common.status")}</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("sales.estimateRequest.column.created")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4 text-gray-500 text-left pl-4">
                                    {t("sales.estimateRequest.noEntries")}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

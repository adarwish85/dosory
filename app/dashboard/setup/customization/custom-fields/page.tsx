"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw } from "lucide-react";
import { AddFieldDialog } from "@/components/dashboard/setup/custom-fields/add-field-dialog";
import { useTranslation } from "@/lib/i18n";

export default function CustomFieldsPage() {
    const { t } = useTranslation();
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">{t("setup.customFields.title")}</h1>
                <AddFieldDialog />
            </div>

            <div className="bg-white rounded-lg border">
                {/* Table Controls */}
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <select className="border rounded px-3 py-1.5 text-sm">
                            <option>25</option>
                            <option>50</option>
                            <option>100</option>
                        </select>
                        <Button variant="outline" size="sm">
                            {t("common.export")}
                        </Button>
                        <Button variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input placeholder={t("common.search")} className="pl-9 w-64" />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t("setup.customFields.colId")}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t("common.name")}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t("setup.customFields.colBelongsTo")}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t("setup.customFields.colType")}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t("setup.customFields.colSlug")}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t("setup.customFields.colActive")}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                    {t("setup.customFields.noEntries")}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

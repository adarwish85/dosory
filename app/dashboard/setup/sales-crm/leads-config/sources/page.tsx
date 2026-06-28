"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Pen, Trash2 } from "lucide-react";
import { AddSourceDialog } from "@/components/dashboard/setup/leads/add-source-dialog";
import { useTranslation } from "@/lib/i18n";

export default function SourcesPage() {
    const { t } = useTranslation();
    const sources = [
        { id: 6, name: "Event", totalLeads: 0 },
        { id: 2, name: "Facebook", totalLeads: 774 },
        { id: 1, name: "Google", totalLeads: 0 },
        { id: 7, name: "LinkedIn", totalLeads: 0 },
        { id: 5, name: "Other Social Media", totalLeads: 1 },
        { id: 4, name: "Referral", totalLeads: 102 },
        { id: 8, name: "Website", totalLeads: 4 },
        { id: 3, name: "ZCrm", totalLeads: 1241 },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <AddSourceDialog />
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
                    </div>
                    <div className="relative w-64">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input placeholder={t("common.search")} className="pl-9" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-md border shadow-sm">
                    <div className="px-6 py-3 border-b bg-gray-50">
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-2 font-bold text-gray-900 text-sm">{t("setup.leadsSources.id")}</div>
                            <div className="col-span-8 font-bold text-gray-900 text-sm">{t("setup.leadsSources.sourceName")}</div>
                            <div className="col-span-2 font-bold text-gray-900 text-sm text-right">{t("setup.leadsSources.options")}</div>
                        </div>
                    </div>
                    <div className="divide-y">
                        {sources.map((source) => (
                            <div key={source.id} className="px-6 py-4 h-16 group hover:bg-gray-50 transition-colors">
                                <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-2 text-gray-700">{source.id}</div>
                                    <div className="col-span-8">
                                        <div className="font-medium text-gray-900">{source.name}</div>
                                        <div className="text-xs text-gray-500">{t("setup.leadsSources.totalLeads", { count: source.totalLeads })}</div>
                                    </div>
                                    <div className="col-span-2 flex items-center justify-end gap-2 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Pen className="h-4 w-4 cursor-pointer hover:text-blue-600" />
                                        <Trash2 className="h-4 w-4 cursor-pointer hover:text-red-600" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="px-6 py-4 border-t bg-gray-50 rounded-b-md">
                        <div className="text-xs text-gray-500 flex justify-end items-center gap-4">
                            <span>
                                {t("setup.leadsTable.showingEntries", { from: 1, to: sources.length, total: sources.length })}
                            </span>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" disabled className="text-xs">
                                    {t("setup.leadsTable.previous")}
                                </Button>
                                <div className="bg-gray-200 text-gray-700 px-2.5 py-1 rounded text-xs font-medium">
                                    1
                                </div>
                                <Button variant="ghost" size="sm" disabled className="text-xs">
                                    {t("setup.leadsTable.next")}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

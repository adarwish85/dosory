"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Pen, Trash2 } from "lucide-react";
import { AddPriorityDialog } from "@/components/dashboard/setup/support/add-priority-dialog";
import { useTranslation } from "@/lib/i18n";

export default function TicketPriorityPage() {
    const { t } = useTranslation();
    const priorities = [
        { id: 1, name: t("setup.ticketPriority.low") },
        { id: 2, name: t("setup.ticketPriority.medium") },
        { id: 3, name: t("setup.ticketPriority.high") },
        { id: 4, name: t("setup.ticketPriority.critical") },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <AddPriorityDialog />
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
                            <div className="col-span-2 font-bold text-gray-900 text-sm">{t("setup.ticketPriority.colId")}</div>
                            <div className="col-span-8 font-bold text-gray-900 text-sm">{t("setup.ticketPriority.colName")}</div>
                            <div className="col-span-2 font-bold text-gray-900 text-sm text-right">{t("setup.ticketPriority.colOptions")}</div>
                        </div>
                    </div>
                    <div className="divide-y">
                        {priorities.map((priority) => (
                            <div key={priority.id} className="px-6 py-4 h-16 group hover:bg-gray-50 transition-colors">
                                <div className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-2 text-gray-700">{priority.id}</div>
                                    <div className="col-span-8 font-medium text-gray-900">{priority.name}</div>
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
                                {t("setup.supportConfig.showingEntries", { from: 1, to: priorities.length, total: priorities.length })}
                            </span>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" disabled className="text-xs">
                                    {t("setup.supportConfig.previous")}
                                </Button>
                                <div className="bg-gray-200 text-gray-700 px-2.5 py-1 rounded text-xs font-medium">
                                    1
                                </div>
                                <Button variant="ghost" size="sm" disabled className="text-xs">
                                    {t("setup.supportConfig.next")}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

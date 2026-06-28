"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Upload, ArrowUpDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "@/lib/i18n";

export default function SalesItemsPage() {
    const { t } = useTranslation();
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-gray-900">{t("sales.items.title")}</h2>
                <a href="#" className="text-sm text-blue-600 hover:underline">
                    {t("sales.items.groups")}
                </a>
            </div>

            <div className="flex items-center gap-2">
                <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-md">
                    <Plus className="mr-2 h-4 w-4" /> {t("sales.items.newItem")}
                </Button>
                <Button variant="outline" className="text-gray-700 bg-white hover:bg-gray-50">
                    <Upload className="mr-2 h-4 w-4" /> {t("sales.items.import")}
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
                        <Button variant="outline">{t("sales.items.bulkActions")}</Button>
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
                                <TableHead className="w-12 text-center bg-gray-100/50">
                                    <Checkbox />
                                </TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">
                                    <div className="flex items-center cursor-pointer hover:bg-gray-200/50 p-1 rounded -ml-1">
                                        {t("sales.items.column.description")} <ArrowUpDown className="ml-1 h-3 w-3 text-gray-400" />
                                    </div>
                                </TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">
                                    {t("sales.items.column.longDescription")}
                                </TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("sales.items.column.rate")}</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("sales.items.column.tax1")}</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("sales.items.column.tax2")}</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("sales.items.column.unit")}</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("sales.items.column.groupName")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[
                                {
                                    id: 1,
                                    desc: "Advance Website",
                                    longDesc:
                                        "- Beautifully custom-designed pages. - Responsive for desktop and mobile screens. - Unlimited number of pages. - Unlimited number of forms. - Unlimited number of article posts. - Facebook Chat integration - Whatsapp Chat integration - SEO Optimization enabled. - CRM with Marketing automation - Super High performance - #1 Website Security - Dedicated Server (Quantum) - 3 Months Technical Support + Performance Elevation Kit (Advance)",
                                    rate: "EGP37,500.00",
                                    tax1: "14.00%",
                                    tax2: "0.00%",
                                    unit: "1",
                                    group: "Web / App Dev",
                                },
                                {
                                    id: 2,
                                    desc: "Basic Website",
                                    longDesc:
                                        "- Beautifully custom-designed pages. - Responsive for desktop and mobile screens. - Unlimited number of pages. - Unlimited number of forms. - Unlimited number of article posts. - Super High performance - #1 Website Security - Dedicated Server (Quantum) - 1 Month Technical Support + Performance Elevation Kit (Advance)",
                                    rate: "EGP20,000.00",
                                    tax1: "14.00%",
                                    tax2: "0.00%",
                                    unit: "1",
                                    group: "Web / App Dev",
                                    showActions: true, // Simulated hover state
                                },
                                {
                                    id: 3,
                                    desc: "CCC Support Afternoon Shift - premium",
                                    longDesc: "Cloud Contact Center Support Afternoon Shift 05pm to 01am 5 days a week",
                                    rate: "EGP5,000.00",
                                    tax1: "14.00%",
                                    tax2: "0.00%",
                                    unit: "Month",
                                    group: "System Support",
                                },
                                {
                                    id: 4,
                                    desc: "CCC Support Morning Shift - premium",
                                    longDesc: "Cloud Contact Center Support Morning Shift 09am to 05pm 5 days a week",
                                    rate: "EGP4,000.00",
                                    tax1: "14.00%",
                                    tax2: "0.00%",
                                    unit: "Month",
                                    group: "System Support",
                                },
                            ].map((row) => (
                                <TableRow key={row.id} className="group align-top">
                                    <TableCell className="text-center pt-4">
                                        <Checkbox />
                                    </TableCell>
                                    <TableCell className="align-top pt-4">
                                        <div className="font-semibold text-gray-900">{row.desc}</div>
                                        {row.showActions && (
                                            <div className="flex gap-1 text-xs text-gray-500 mt-1">
                                                <span className="hover:text-gray-900 cursor-pointer">{t("common.edit")}</span> |
                                                <span className="text-red-600 hover:text-red-700 cursor-pointer">
                                                    {t("common.delete")}
                                                </span>{" "}
                                                |<span className="hover:text-gray-900 cursor-pointer">{t("sales.items.copy")}</span>
                                            </div>
                                        )}
                                        {/* CSS-only hover effect for non-simulated rows */}
                                        {!row.showActions && (
                                            <div className="invisible group-hover:visible flex gap-1 text-xs text-gray-500 mt-1">
                                                <span className="hover:text-gray-900 cursor-pointer">{t("common.edit")}</span> |
                                                <span className="text-red-600 hover:text-red-700 cursor-pointer">
                                                    {t("common.delete")}
                                                </span>{" "}
                                                |<span className="hover:text-gray-900 cursor-pointer">{t("sales.items.copy")}</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-gray-600 text-sm align-top pt-4 min-w-[400px]">
                                        {row.longDesc}
                                    </TableCell>
                                    <TableCell className="text-gray-900 align-top pt-4">{row.rate}</TableCell>
                                    <TableCell className="text-gray-500 align-top pt-4">{row.tax1}</TableCell>
                                    <TableCell className="text-gray-500 align-top pt-4">{row.tax2}</TableCell>
                                    <TableCell className="text-gray-900 align-top pt-4">{row.unit}</TableCell>
                                    <TableCell className="text-gray-900 align-top pt-4">{row.group}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

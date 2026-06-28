"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function PaymentsPage() {
    const { t } = useTranslation();
    return (
        <div className="space-y-6">
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
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("accounting.payments.paymentNumber")}</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("accounting.payments.invoiceNumber")}</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("accounting.payments.paymentMode")}</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("accounting.payments.transactionId")}</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("accounting.payments.customer")}</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("common.amount")}</TableHead>
                            <TableHead className="font-semibold text-gray-900 bg-gray-100/50">{t("common.date")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[
                            {
                                id: "25",
                                invoice: "INV-000119",
                                mode: "Bank",
                                transactionId: "",
                                customer: "Egyptian German Industrial Corporation (EGIC)",
                                amount: "EGP47,880.00",
                                date: "09/12/2025",
                            },
                            {
                                id: "24",
                                invoice: "INV-000117",
                                mode: "Bank",
                                transactionId: "",
                                customer: "Egyptian German Industrial Corporation (EGIC)",
                                amount: "EGP62,502.78",
                                date: "09/12/2025",
                            },
                            {
                                id: "23",
                                invoice: "INV-000116",
                                mode: "Bank",
                                transactionId: "",
                                customer: "Egyptian German Industrial Corporation (EGIC)",
                                amount: "EGP62,502.78",
                                date: "09/12/2025",
                            },
                            {
                                id: "22",
                                invoice: "INV-000115",
                                mode: "Bank",
                                transactionId: "",
                                customer: "Egyptian German Industrial Corporation (EGIC)",
                                amount: "EGP33,009.84",
                                date: "03/11/2025",
                            },
                            {
                                id: "21",
                                invoice: "INV-000114",
                                mode: "Bank",
                                transactionId: "",
                                customer: "Egyptian German Industrial Corporation (EGIC)",
                                amount: "EGP42,015.40",
                                date: "03/11/2025",
                            },
                            {
                                id: "20",
                                invoice: "INV-000118",
                                mode: "Bank",
                                transactionId: "",
                                customer: "Insights Lab",
                                amount: "EGP23,940.00",
                                date: "28/10/2025",
                            },
                            {
                                id: "19",
                                invoice: "INV-000113",
                                mode: "Bank",
                                transactionId: "",
                                customer: "Egyptian German Industrial Corporation (EGIC)",
                                amount: "EGP34,200.00",
                                date: "03/09/2025",
                            },
                            {
                                id: "18",
                                invoice: "INV-000111",
                                mode: "Bank",
                                transactionId: "",
                                customer: "Egyptian German Industrial Corporation (EGIC)",
                                amount: "EGP34,200.00",
                                date: "03/09/2025",
                            },
                            {
                                id: "17",
                                invoice: "INV-000109",
                                mode: "Bank",
                                transactionId: "",
                                customer: "Tahweel Integrated",
                                amount: "$912.00",
                                date: "06/08/2025",
                            },
                        ].map((row) => (
                            <TableRow key={row.id} className="group">
                                <TableCell className="min-w-[150px] py-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900">{row.id}</span>
                                        {/* Hover Actions Menu */}
                                        <div className="flex items-center gap-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                                            <span className="hover:text-blue-600 hover:underline cursor-pointer">
                                                {t("common.view")}
                                            </span>
                                            <span className="text-gray-300">|</span>
                                            <span className="hover:text-blue-600 hover:underline cursor-pointer">
                                                {t("common.edit")}
                                            </span>
                                            <span className="text-gray-300">|</span>
                                            <span className="hover:text-red-600 hover:underline cursor-pointer">
                                                {t("common.delete")}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-gray-900">{row.invoice}</TableCell>
                                <TableCell className="text-gray-900">{row.mode}</TableCell>
                                <TableCell className="text-gray-900">{row.transactionId || "-"}</TableCell>
                                <TableCell className="text-gray-900">{row.customer}</TableCell>
                                <TableCell className="text-gray-900 font-medium">{row.amount}</TableCell>
                                <TableCell className="text-gray-500">{row.date}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center text-sm text-gray-500 gap-2 mt-4 ml-1">
                {t("accounting.payments.showingEntries", { from: 1, to: 9, total: 25 })}
                <div className="flex gap-1 ml-auto">
                    <Button variant="ghost" disabled className="text-gray-400">
                        {t("common.previous")}
                    </Button>
                    <Button variant="secondary" className="bg-gray-200 text-gray-900 h-8 w-8 p-0">
                        1
                    </Button>
                    <Button variant="ghost" className="text-gray-900 hover:bg-gray-100">
                        {t("common.next")}
                    </Button>
                </div>
            </div>
        </div>
    );
}

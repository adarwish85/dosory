import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FinancialSummary() {
    return (
        <div className="space-y-4">
            <div className="flex justify-end gap-2">
                <Select defaultValue="EGP">
                    <SelectTrigger className="w-[80px]">
                        <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="EGP">EGP</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                </Select>
                <Select defaultValue="2025">
                    <SelectTrigger className="w-[80px]">
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-gray-100 bg-white shadow-sm rounded-xl py-0 gap-0">
                    <CardContent className="px-4 py-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="text-orange-500 shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    ></path>
                                </svg>
                            </div>
                            <div className="text-sm font-semibold text-gray-700 truncate">Outstanding Invoices</div>
                        </div>
                        <div className="text-sm font-bold text-gray-900 shrink-0">EGP67,208.00</div>
                    </CardContent>
                </Card>
                <Card className="border border-gray-100 bg-white shadow-sm rounded-xl py-0 gap-0">
                    <CardContent className="px-4 py-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="text-red-500 shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    ></path>
                                </svg>
                            </div>
                            <div className="text-sm font-semibold text-gray-700 truncate">Past Due Invoices</div>
                        </div>
                        <div className="text-sm font-bold text-gray-900 shrink-0">EGP0.00</div>
                    </CardContent>
                </Card>
                <Card className="border border-gray-100 bg-white shadow-sm rounded-xl py-0 gap-0">
                    <CardContent className="px-4 py-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="text-green-500 shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    ></path>
                                </svg>
                            </div>
                            <div className="text-sm font-semibold text-gray-700 truncate">Paid Invoices</div>
                        </div>
                        <div className="text-sm font-bold text-gray-900 shrink-0">EGP530,722.00</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

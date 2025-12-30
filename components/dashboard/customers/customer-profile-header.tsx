"use client";

import { useCustomer } from "./customer-context";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Calendar, FileText, CheckSquare, Bell, Receipt, ArrowLeft } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";

export function CustomerProfileHeader() {
    const { customer, loading } = useCustomer();
    const router = useRouter();

    if (loading || !customer) return null;

    return (
        <div className="flex items-center justify-between px-8 py-6 border-b bg-white">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={() => router.push("/dashboard/customers")}
                    className="gap-2 text-gray-600 hover:text-gray-900"
                    size="icon"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        {customer.company}
                        <span
                            className={`text-sm font-normal px-2 py-0.5 rounded-full ${
                                customer.status === "active"
                                    ? "bg-green-100 text-green-700"
                                    : customer.status === "inactive"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-gray-100 text-gray-500"
                            }`}
                        >
                            {customer.status}
                        </span>
                    </h1>
                    <div className="flex gap-4 text-gray-500 mt-1 text-sm">
                        {customer.phone && (
                            <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {customer.phone}
                            </span>
                        )}
                        {customer.website && <span className="flex items-center gap-1">🌐 {customer.website}</span>}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => customer.phone && window.open(`tel:${customer.phone}`)}
                            >
                                <Phone className="h-4 w-4 text-green-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Call Customer</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => (window.location.href = `mailto:?subject=Regarding ${customer.company}`)}
                            >
                                <Mail className="h-4 w-4 text-blue-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Send Email</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Receipt className="h-4 w-4 text-indigo-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Create Invoice</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon">
                                <FileText className="h-4 w-4 text-orange-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Create Estimate</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon">
                                <CheckSquare className="h-4 w-4 text-teal-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add Task</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Bell className="h-4 w-4 text-pink-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Set Reminder</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
}

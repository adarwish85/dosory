"use client";

import { useCustomer } from "@/components/dashboard/customers/customer-context";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CustomerMapPage() {
    const { customer, loading } = useCustomer();

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Map</h2>
            <Card>
                <CardHeader>
                    <CardTitle>Customer Location</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-96 bg-gray-100 rounded-md flex items-center justify-center text-gray-500">
                        Map integration coming soon.
                        {customer?.billingAddress?.city && ` (${customer.billingAddress.city})`}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

"use client";

import { useState, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffList } from "@/components/dashboard/setup/staff/staff-list";
import JoinRequestsPage from "../join-requests/page";
import RolesPage from "../roles/page";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export default function StaffPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get("tab") || "staff";
    const [activeTab, setActiveTab] = useState(defaultTab);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        router.push(`${pathname}?tab=${value}`);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
                <p className="text-gray-500">Manage your team members, roles, and access requests.</p>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsList className="bg-white p-1 border rounded-lg h-auto">
                    <TabsTrigger
                        value="staff"
                        className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 px-4 py-2"
                    >
                        Staff
                    </TabsTrigger>
                    <TabsTrigger
                        value="join-requests"
                        className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 px-4 py-2"
                    >
                        Join Requests
                    </TabsTrigger>
                    <TabsTrigger
                        value="roles"
                        className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 px-4 py-2"
                    >
                        Roles
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="staff" className="focus-visible:ring-0 focus-visible:outline-none">
                    <StaffList />
                </TabsContent>

                <TabsContent value="join-requests" className="focus-visible:ring-0 focus-visible:outline-none">
                    <JoinRequestsPage />
                </TabsContent>

                <TabsContent value="roles" className="focus-visible:ring-0 focus-visible:outline-none">
                    <RolesPage />
                </TabsContent>
            </Tabs>
        </div>
    );
}

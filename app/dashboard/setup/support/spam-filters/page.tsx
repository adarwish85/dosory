"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, RefreshCw } from "lucide-react";
import { AddSpamFilterDialog } from "@/components/dashboard/setup/support/add-spam-filter-dialog";

export default function SpamFiltersPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <AddSpamFilterDialog />
            </div>

            <Tabs defaultValue="senders" className="flex flex-col">
                <div className="bg-gray-100 p-1 rounded-md mb-6 w-full inline-flex">
                    <TabsList className="bg-transparent h-auto p-0 space-x-1 w-full justify-start">
                        <TabTrigger value="senders">Blocked Senders</TabTrigger>
                        <TabTrigger value="subjects">Blocked Subjects</TabTrigger>
                        <TabTrigger value="phrases">Blocked Phrases</TabTrigger>
                    </TabsList>
                </div>

                <TabsContent value="senders" className="m-0">
                    <SpamFilterTable />
                </TabsContent>
                <TabsContent value="subjects" className="m-0">
                    <SpamFilterTable />
                </TabsContent>
                <TabsContent value="phrases" className="m-0">
                    <SpamFilterTable />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function TabTrigger({ value, children }: { value: string; children: React.ReactNode }) {
    return (
        <TabsTrigger
            value={value}
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-sm font-medium text-gray-600 data-[state=active]:text-gray-900 rounded-md transition-all"
        >
            {children}
        </TabsTrigger>
    );
}

function SpamFilterTable() {
    return (
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
                    <Button variant="outline">Export</Button>
                    <Button variant="outline" size="icon">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
                <div className="relative w-64">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input placeholder="Search..." className="pl-9" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-md border shadow-sm">
                <div className="px-6 py-3 border-b bg-gray-50 flex justify-between items-center">
                    <div className="font-bold text-gray-900 text-sm">Content</div>
                    <div className="font-bold text-gray-900 text-sm">Options</div>
                </div>
                <div className="p-8 text-center text-gray-500">No entries found</div>
            </div>
        </div>
    );
}

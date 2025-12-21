"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Pen, Trash2, Loader2 } from "lucide-react";
import { AddRoleDialog } from "@/components/dashboard/setup/roles/add-role-dialog";
import { useRoles, useStaff } from "@/lib/hooks";

export default function RolesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const { roles, loading, deleteRole } = useRoles();
    const { staff } = useStaff();

    const filteredRoles = roles.filter(role =>
        role.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getUserCount = (roleId: string) => {
        return staff.filter(s => s.roleId === roleId).length;
    };

    const handleDelete = async (roleId: string) => {
        if (confirm("Are you sure you want to delete this role?")) {
            await deleteRole(roleId);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <AddRoleDialog />
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
                        <Button variant="outline">Export</Button>
                        <Button variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-md border shadow-sm">
                    <div className="px-6 py-3 border-b bg-gray-50 flex justify-between items-center">
                        <div className="font-bold text-gray-900 text-sm">Role Name</div>
                        <div className="font-bold text-gray-900 text-sm">Options</div>
                    </div>
                    <div className="divide-y">
                        {filteredRoles.length === 0 ? (
                            <div className="px-6 py-10 text-center text-muted-foreground">
                                {searchQuery ? "No roles match your search." : "No roles found."}
                            </div>
                        ) : (
                            filteredRoles.map((role) => (
                                <div key={role.id} className="px-6 py-4 flex justify-between items-start">
                                    <div>
                                        <div className="font-medium text-gray-900 mb-1">{role.name}</div>
                                        <div className="text-xs text-gray-500">Total Users: {getUserCount(role.id)}</div>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Pen className="h-4 w-4 cursor-pointer hover:text-blue-600" />
                                        <Trash2
                                            className="h-4 w-4 cursor-pointer hover:text-red-600"
                                            onClick={() => handleDelete(role.id)}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="px-6 py-4 border-t bg-gray-50 rounded-b-md">
                        <div className="text-xs text-gray-500 flex justify-end items-center gap-4">
                            <span>Showing 1 to {filteredRoles.length} of {filteredRoles.length} entries</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

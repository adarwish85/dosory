"use client";

import { useState, useEffect } from "react";
import { useTenants, Tenant } from "@/lib/hooks/use-admin";
import { useImpersonation } from "@/lib/hooks/use-impersonation";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { logAdminAction } from "@/lib/admin-logger";
import { useAuth } from "@/components/auth-provider";

// ... existing code ...

// ... rest of the file ...

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
    Building2, Search, Plus, MoreHorizontal, Users, Calendar,
    CheckCircle, Clock, XCircle, Eye, LogIn, UserCheck, Edit, Trash2,
    Loader2, Ban, Play, Mail, Phone, Globe, ChevronDown, ArrowDown, LogOut
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Checkbox } from "@/components/ui/checkbox";

interface TenantFormData {
    name: string;
    email: string;
    phone: string;
    website: string;
    plan: "free" | "starter" | "professional" | "enterprise";
    status: "active" | "trial" | "suspended" | "cancelled";
    notes: string;
    subscriptionExpiry: string;
    password: string;
    sendPasswordReset: boolean;
}

const defaultFormData: TenantFormData = {
    name: "",
    email: "",
    phone: "",
    website: "",
    plan: "free",
    status: "trial",
    notes: "",
    subscriptionExpiry: "",
    password: "",
    sendPasswordReset: true,
};

export default function TenantsPage() {
    const { tenants, loading, refetch } = useTenants();
    const { profile } = useUserProfile();
    const { user } = useAuth(); // Added this
    const { startImpersonation } = useImpersonation();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [planFilter, setPlanFilter] = useState<string>("all");

    // Dialog states
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);

    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [formData, setFormData] = useState<TenantFormData>(defaultFormData);
    const [saving, setSaving] = useState(false);
    const [tenantUserCount, setTenantUserCount] = useState(0);

    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [bulkSuspendDialogOpen, setBulkSuspendDialogOpen] = useState(false);
    const [bulkAction, setBulkAction] = useState<"suspend" | "activate">("suspend");

    // Apply filters
    const filteredTenants = tenants.filter(tenant => {
        const matchesSearch =
            tenant.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tenant.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || tenant.status === statusFilter;
        const matchesPlan = planFilter === "all" || tenant.plan === planFilter;
        return matchesSearch && matchesStatus && matchesPlan;
    });

    const handleSignInAsTenant = async (tenantId: string, tenantName: string) => {
        if (profile?.role) {
            await logAdminAction(user, "impersonate_tenant", { id: tenantId, name: tenantName }, {
                reason: "Admin dashboard access"
            });
            startImpersonation(tenantId, tenantName, profile.role);
            router.push("/dashboard");
        }
    };

    const handleForceLogout = async (tenant: Tenant) => {
        if (!confirm(`Are you sure you want to force logout ALL users in ${tenant.name}? They will be required to sign in again.`)) return;

        setSaving(true);
        try {
            const response = await fetch("/api/admin/logout-tenant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tenantId: tenant.id }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            await logAdminAction(user, "force_logout_tenant", { id: tenant.id, name: tenant.name }, { count: data.count });

            alert(`Successfully logged out ${data.count} users.`);
        } catch (error: any) {
            console.error("Error forcing logout:", error);
            alert("Failed to force logout.");
        } finally {
            setSaving(false);
        }
    };

    // Open Create Dialog
    const openCreateDialog = () => {
        setFormData(defaultFormData);
        setCreateDialogOpen(true);
    };

    // Open Edit Dialog
    const openEditDialog = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setFormData({
            name: tenant.name || "",
            email: tenant.email || "",
            phone: (tenant as any).phone || "",
            website: (tenant as any).website || "",
            plan: tenant.plan || "free",
            status: tenant.status || "active",
            notes: (tenant as any).notes || "",
            subscriptionExpiry: (tenant as any).subscriptionEndsAt
                ? new Date((tenant as any).subscriptionEndsAt).toISOString().split('T')[0]
                : "",
            password: "",
            sendPasswordReset: false,
        });
        setEditDialogOpen(true);
    };

    // Open View Dialog
    const openViewDialog = async (tenant: Tenant) => {
        setSelectedTenant(tenant);
        // Fetch user count for this tenant
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("orgId", "==", tenant.id));
            const snapshot = await getDocs(q);
            setTenantUserCount(snapshot.size);
        } catch (error) {
            console.error("Error fetching user count:", error);
            setTenantUserCount(tenant.userCount || 0);
        }
        setViewDialogOpen(true);
    };

    // Open Delete Dialog
    const openDeleteDialog = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setDeleteDialogOpen(true);
    };

    // Open Suspend Dialog
    const openSuspendDialog = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setSuspendDialogOpen(true);
    };

    // Create Tenant
    const handleCreateTenant = async () => {
        if (!formData.name || !formData.email) return;

        // Validate password if not sending reset email
        if (!formData.sendPasswordReset && formData.password.length < 8) {
            alert("Password must be at least 8 characters");
            return;
        }

        setSaving(true);
        try {
            const response = await fetch("/api/admin/create-tenant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    organizationName: formData.name,
                    sendPasswordReset: formData.sendPasswordReset,
                    plan: formData.plan,
                    status: formData.status,
                    phone: formData.phone,
                    website: formData.website,
                    notes: formData.notes,
                    subscriptionExpiry: formData.subscriptionExpiry,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create tenant");
            }

            setCreateDialogOpen(false);
            setFormData(defaultFormData);
            refetch(); // Refresh tenant list

            if (formData.sendPasswordReset) {
                alert("Tenant created! A password reset email will be sent.");
            } else {
                alert("Tenant created successfully!");
            }

            // Log action
            await logAdminAction(user, "create_tenant", { name: formData.name }, {
                email: formData.email,
                plan: formData.plan
            });

        } catch (error: any) {
            console.error("Error creating tenant:", error);
            alert(error.message || "Failed to create tenant");
        } finally {
            setSaving(false);
        }
    };

    // Update Tenant
    const handleUpdateTenant = async () => {
        if (!selectedTenant || !formData.name) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, "organizations", selectedTenant.id), {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                website: formData.website,
                plan: formData.plan,
                status: formData.status,
                notes: formData.notes,
                subscriptionEndsAt: formData.subscriptionExpiry
                    ? new Date(formData.subscriptionExpiry).toISOString()
                    : null,
                updatedAt: serverTimestamp(),
            });

            await logAdminAction(user, "update_tenant", { id: selectedTenant.id, name: formData.name }, {
                changes: {
                    plan: formData.plan !== selectedTenant.plan ? `${selectedTenant.plan} -> ${formData.plan}` : undefined,
                    status: formData.status !== selectedTenant.status ? `${selectedTenant.status} -> ${formData.status}` : undefined,
                }
            });

            setEditDialogOpen(false);
            refetch();
        } catch (error) {
            console.error("Error updating tenant:", error);
            alert("Failed to update tenant");
        } finally {
            setSaving(false);
        }
    };

    // Delete Tenant
    const handleDeleteTenant = async () => {
        if (!selectedTenant) return;
        setSaving(true);
        try {
            await deleteDoc(doc(db, "organizations", selectedTenant.id));

            await logAdminAction(user, "delete_tenant", { id: selectedTenant.id, name: selectedTenant.name }, {
                reason: "Admin manual deletion"
            });

            setDeleteDialogOpen(false);
            refetch();
        } catch (error) {
            console.error("Error deleting tenant:", error);
            alert("Failed to delete tenant");
        } finally {
            setSaving(false);
        }
    };

    // Suspend/Activate Tenant
    const handleToggleSuspend = async () => {
        if (!selectedTenant) return;
        setSaving(true);
        try {
            const newStatus = selectedTenant.status === "suspended" ? "active" : "suspended";
            await updateDoc(doc(db, "organizations", selectedTenant.id), {
                status: newStatus,
                updatedAt: serverTimestamp(),
            });

            const action = newStatus === "suspended" ? "suspend_tenant" : "activate_tenant";
            await logAdminAction(user, action, { id: selectedTenant.id, name: selectedTenant.name }, {
                previousStatus: selectedTenant.status
            });

            setSuspendDialogOpen(false);
            refetch();
        } catch (error) {
            console.error("Error updating tenant status:", error);
            alert("Failed to update tenant status");
        } finally {
            setSaving(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "active": return <CheckCircle className="h-4 w-4 text-green-400" />;
            case "trial": return <Clock className="h-4 w-4 text-yellow-400" />;
            case "suspended": return <Ban className="h-4 w-4 text-red-400" />;
            case "cancelled": return <XCircle className="h-4 w-4 text-[#7e808c]" />;
            default: return <Clock className="h-4 w-4 text-[#7e808c]" />;
        }
    };

    const getPlanBadge = (plan: string) => {
        const colors: Record<string, string> = {
            free: "bg-gray-600 text-[#352b38]",
            starter: "bg-blue-600 text-blue-100",
            professional: "bg-purple-600 text-purple-100",
            enterprise: "bg-yellow-600 text-yellow-100",
        };
        return colors[plan] || colors.free;
    };

    // Bulk selection helpers
    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const selectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(filteredTenants.map(t => t.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const isAllSelected = filteredTenants.length > 0 && selectedIds.size === filteredTenants.length;

    // Bulk delete handler
    const handleBulkDelete = async () => {
        setSaving(true);
        try {
            const batch = writeBatch(db);
            selectedIds.forEach(id => {
                batch.delete(doc(db, "organizations", id));
            });
            await batch.commit();
            setSelectedIds(new Set());
            setBulkDeleteDialogOpen(false);
            refetch();
        } catch (error) {
            console.error("Error deleting tenants:", error);
            alert("Failed to delete tenants");
        } finally {
            setSaving(false);
        }
    };

    // Bulk status change handler
    const handleBulkStatusChange = async (newStatus: "active" | "suspended") => {
        setSaving(true);
        try {
            const batch = writeBatch(db);
            selectedIds.forEach(id => {
                batch.update(doc(db, "organizations", id), {
                    status: newStatus,
                    updatedAt: serverTimestamp(),
                });
            });
            await batch.commit();
            setSelectedIds(new Set());
            setBulkSuspendDialogOpen(false);
            refetch();
        } catch (error) {
            console.error("Error updating tenants:", error);
            alert("Failed to update tenants");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" >
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
                    <p className="text-gray-500">Manage, monitor, and support all organizations on the platform.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="bg-white">
                        <ArrowDown className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Tenant
                    </Button>
                </div>
            </div>

            {/* Tenant Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" >
                <Card className="border border-green-100 bg-green-50/50 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-800">Active Tenants</p>
                            <p className="text-2xl font-bold text-green-700 mt-1">{tenants.filter(t => t.status === 'active').length}</p>
                        </div>
                        <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border border-orange-100 bg-orange-50/50 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-orange-800">On Trial</p>
                            <p className="text-2xl font-bold text-orange-700 mt-1">{tenants.filter(t => t.status === 'trial').length}</p>
                        </div>
                        <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Clock className="h-5 w-5 text-orange-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border border-red-100 bg-red-50/50 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-red-800">Suspended</p>
                            <p className="text-2xl font-bold text-red-700 mt-1">{tenants.filter(t => t.status === 'suspended').length}</p>
                        </div>
                        <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <Ban className="h-5 w-5 text-red-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="border border-gray-100 shadow-sm bg-white" >
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by name, email, or domain..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-white border-gray-200 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[180px] bg-white border-gray-200 text-gray-700">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="trial">Trial</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={planFilter} onValueChange={setPlanFilter}>
                            <SelectTrigger className="w-full sm:w-[180px] bg-white border-gray-200 text-gray-700">
                                <SelectValue placeholder="Plan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Plans</SelectItem>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="starter">Starter</SelectItem>
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card >

            {/* Bulk Actions Bar */}
            {
                selectedIds.size > 0 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{selectedIds.size}</span>
                            <span className="text-sm font-medium text-blue-900">Selected</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                className="bg-white text-green-600 border border-green-200 hover:bg-green-50 shadow-sm"
                                onClick={() => { setBulkAction("activate"); setBulkSuspendDialogOpen(true); }}
                            >
                                <Play className="h-3 w-3 mr-1.5" />
                                Activate
                            </Button>
                            <Button
                                size="sm"
                                className="bg-white text-orange-600 border border-orange-200 hover:bg-orange-50 shadow-sm"
                                onClick={() => { setBulkAction("suspend"); setBulkSuspendDialogOpen(true); }}
                            >
                                <Ban className="h-3 w-3 mr-1.5" />
                                Suspend
                            </Button>
                            <Button
                                size="sm"
                                className="bg-white text-red-600 border border-red-200 hover:bg-red-50 shadow-sm"
                                onClick={() => setBulkDeleteDialogOpen(true)}
                            >
                                <Trash2 className="h-3 w-3 mr-1.5" />
                                Delete
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 hover:text-gray-700"
                                onClick={() => setSelectedIds(new Set())}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )
            }

            {/* Tenants Table */}
            <Card className="border border-gray-100 shadow-sm bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="w-12 py-3 px-4">
                                    <Checkbox
                                        checked={isAllSelected}
                                        onCheckedChange={(checked) => selectAll(!!checked)}
                                        className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    />
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tenant</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Users</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-gray-500">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                                        Loading tenants...
                                    </td>
                                </tr>
                            ) : filteredTenants.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-gray-500">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Search className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <p className="font-medium text-gray-900">No tenants found</p>
                                        <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredTenants.map((tenant) => (
                                    <tr key={tenant.id} className={`group hover:bg-gray-50/80 transition-colors ${selectedIds.has(tenant.id) ? 'bg-blue-50/30' : ''}`}>
                                        <td className="py-4 px-4">
                                            <Checkbox
                                                checked={selectedIds.has(tenant.id)}
                                                onCheckedChange={() => toggleSelection(tenant.id)}
                                                className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                            />
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg shadow-sm">
                                                    {(tenant.name?.[0] || "T").toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 max-w-[200px] truncate" title={tenant.name}>{tenant.name || "Unnamed"}</p>
                                                    <p className="text-xs text-gray-500 max-w-[200px] truncate" title={tenant.email}>{tenant.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border",
                                                tenant.plan === 'enterprise' ? "bg-purple-50 text-purple-700 border-purple-100" :
                                                    tenant.plan === 'professional' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                        tenant.plan === 'starter' ? "bg-gray-100 text-gray-700 border-gray-200" :
                                                            "bg-gray-50 text-gray-600 border-gray-100"
                                            )}>
                                                {tenant.plan ? tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1) : "Free"}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                {tenant.status === 'active' && <CheckCircle className="h-4 w-4 text-green-500" />}
                                                {tenant.status === 'trial' && <Clock className="h-4 w-4 text-orange-500" />}
                                                {tenant.status === 'suspended' && <Ban className="h-4 w-4 text-red-500" />}
                                                {(tenant.status !== 'active' && tenant.status !== 'trial' && tenant.status !== 'suspended') && <div className="h-2 w-2 rounded-full bg-gray-300" />}
                                                <span className="text-sm text-gray-700 capitalize">{tenant.status || "Unknown"}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <Users className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm font-medium">{tenant.userCount || 0}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="text-sm text-gray-500">
                                                {new Date(tenant.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                    title="Sign In As"
                                                    onClick={() => handleSignInAsTenant(tenant.id, tenant.name || "Tenant")}
                                                >
                                                    <LogIn className="h-4 w-4" />
                                                </Button>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-900">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuItem onClick={() => openViewDialog(tenant)}>
                                                            <Eye className="mr-2 h-4 w-4" /> View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openEditDialog(tenant)}>
                                                            <Edit className="mr-2 h-4 w-4" /> Edit Tenant
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-500" onClick={() => handleForceLogout(tenant)}>
                                                            <LogOut className="mr-2 h-4 w-4" /> Force Logout Users
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-red-600" onClick={() => openDeleteDialog(tenant)}>
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Access
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Create Tenant Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="border-0 shadow-sm rounded-2xl bg-white text-[#352b38] max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create New Tenant</DialogTitle>
                        <DialogDescription className="text-[#7e808c]">
                            Add a new organization to the platform
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label className="text-[#352b38]">Organization Name *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Acme Inc."
                                    className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-[#352b38]">Email *</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="admin@acme.com"
                                    className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                />
                            </div>
                            <div>
                                <Label className="text-[#352b38]">Phone</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="+1 234 567 890"
                                    className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                />
                            </div>
                            <div>
                                <Label className="text-[#352b38]">Website</Label>
                                <Input
                                    value={formData.website}
                                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                                    placeholder="https://acme.com"
                                    className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                />
                            </div>
                            <div>
                                <Label className="text-[#352b38]">Plan</Label>
                                <Select
                                    value={formData.plan}
                                    onValueChange={(v) => setFormData(prev => ({ ...prev, plan: v as any }))}
                                >
                                    <SelectTrigger className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-0 shadow-sm rounded-2xl bg-white">
                                        <SelectItem value="free">Free</SelectItem>
                                        <SelectItem value="starter">Starter</SelectItem>
                                        <SelectItem value="professional">Professional</SelectItem>
                                        <SelectItem value="enterprise">Enterprise</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-[#352b38]">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as any }))}
                                >
                                    <SelectTrigger className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-0 shadow-sm rounded-2xl bg-white">
                                        <SelectItem value="trial">Trial</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="suspended">Suspended</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Password Section */}
                            <div className="col-span-2 p-4 rounded-xl" style={{ backgroundColor: "#f4f3f8" }}>
                                <div className="flex items-center justify-between mb-3">
                                    <Label className="text-[#352b38] font-medium">Account Password</Label>
                                    <div className="flex items-center gap-2">
                                        <Label className="text-sm text-[#7e808c]">Send password reset email</Label>
                                        <Switch
                                            checked={formData.sendPasswordReset}
                                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendPasswordReset: checked, password: "" }))}
                                        />
                                    </div>
                                </div>
                                {!formData.sendPasswordReset ? (
                                    <div>
                                        <Input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                            placeholder="Enter password for tenant admin"
                                            className="bg-white border-[#dad8f9] text-[#352b38]"
                                        />
                                        <p className="text-xs text-[#7e808c] mt-1">Minimum 8 characters</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-[#7e808c]">
                                        A password reset link will be sent to the tenant email after creation.
                                    </p>
                                )}
                            </div>

                            {/* Subscription Expiry Section */}
                            <div className="col-span-2 p-4 rounded-xl" style={{ backgroundColor: "#f4f3f8" }}>
                                <div className="flex items-center justify-between mb-3">
                                    <Label className="text-[#352b38] font-medium">Subscription Expiry</Label>
                                    <div className="flex items-center gap-2">
                                        <Label className="text-sm text-[#7e808c]">Never expires (infinite)</Label>
                                        <Switch
                                            checked={!formData.subscriptionExpiry}
                                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, subscriptionExpiry: checked ? "" : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }))}
                                        />
                                    </div>
                                </div>
                                {formData.subscriptionExpiry && (
                                    <div>
                                        <Input
                                            type="date"
                                            value={formData.subscriptionExpiry}
                                            onChange={(e) => setFormData(prev => ({ ...prev, subscriptionExpiry: e.target.value }))}
                                            className="bg-white border-[#dad8f9] text-[#352b38]"
                                        />
                                        <p className="text-xs text-[#7e808c] mt-1">Subscription will expire on this date</p>
                                    </div>
                                )}
                                {!formData.subscriptionExpiry && (
                                    <p className="text-sm text-[#7e808c]">
                                        This tenant will have unlimited subscription access.
                                    </p>
                                )}
                            </div>

                            <div className="col-span-2">
                                <Label className="text-[#352b38]">Notes</Label>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Internal notes about this tenant..."
                                    className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-[#dad8f9]">
                            Cancel
                        </Button>
                        <Button onClick={handleCreateTenant} disabled={saving || !formData.name || !formData.email} className="bg-purple-600 hover:bg-purple-700">
                            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Tenant"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Tenant Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="border-0 shadow-sm rounded-2xl bg-white text-[#352b38] max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Tenant</DialogTitle>
                        <DialogDescription className="text-[#7e808c]">
                            Update organization details
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label className="text-[#352b38]">Organization Name *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-[#352b38]">Email *</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                />
                            </div>
                            <div>
                                <Label className="text-[#352b38]">Phone</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                />
                            </div>
                            <div>
                                <Label className="text-[#352b38]">Website</Label>
                                <Input
                                    value={formData.website}
                                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                                    className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                />
                            </div>
                            <div>
                                <Label className="text-[#352b38]">Plan</Label>
                                <Select
                                    value={formData.plan}
                                    onValueChange={(v) => setFormData(prev => ({ ...prev, plan: v as any }))}
                                >
                                    <SelectTrigger className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-0 shadow-sm rounded-2xl bg-white">
                                        <SelectItem value="free">Free</SelectItem>
                                        <SelectItem value="starter">Starter</SelectItem>
                                        <SelectItem value="professional">Professional</SelectItem>
                                        <SelectItem value="enterprise">Enterprise</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-[#352b38]">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as any }))}
                                >
                                    <SelectTrigger className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-0 shadow-sm rounded-2xl bg-white">
                                        <SelectItem value="trial">Trial</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="suspended">Suspended</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2">
                                <Label className="text-[#352b38]">Subscription Expiry Date</Label>
                                <Input
                                    type="date"
                                    value={formData.subscriptionExpiry}
                                    onChange={(e) => setFormData(prev => ({ ...prev, subscriptionExpiry: e.target.value }))}
                                    className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                />
                                <p className="text-gray-500 text-xs mt-1">Leave empty for no expiry</p>
                            </div>
                            <div className="col-span-2">
                                <Label className="text-[#352b38]">Notes</Label>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="border-[#dad8f9]">
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateTenant} disabled={saving || !formData.name} className="bg-purple-600 hover:bg-purple-700">
                            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Tenant Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="border-0 shadow-sm rounded-2xl bg-white text-[#352b38] max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-[#352b38]" />
                            </div>
                            {selectedTenant?.name || "Tenant Details"}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedTenant && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-[#f4f3f8] rounded-lg">
                                    <p className="text-gray-500 text-xs uppercase mb-1">Status</p>
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(selectedTenant.status)}
                                        <span className="text-[#352b38] capitalize">{selectedTenant.status}</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-[#f4f3f8] rounded-lg">
                                    <p className="text-gray-500 text-xs uppercase mb-1">Plan</p>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanBadge(selectedTenant.plan)}`}>
                                        {selectedTenant.plan?.charAt(0).toUpperCase() + selectedTenant.plan?.slice(1)}
                                    </span>
                                </div>
                                <div className="p-3 bg-[#f4f3f8] rounded-lg">
                                    <p className="text-gray-500 text-xs uppercase mb-1">Users</p>
                                    <p className="text-[#352b38] flex items-center gap-2">
                                        <Users className="h-4 w-4 text-[#7e808c]" />
                                        {tenantUserCount}
                                    </p>
                                </div>
                                <div className="p-3 bg-[#f4f3f8] rounded-lg">
                                    <p className="text-gray-500 text-xs uppercase mb-1">Created</p>
                                    <p className="text-[#352b38] flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-[#7e808c]" />
                                        {new Date(selectedTenant.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-[#f4f3f8] rounded-lg">
                                    <Mail className="h-4 w-4 text-[#7e808c]" />
                                    <div>
                                        <p className="text-gray-500 text-xs">Email</p>
                                        <p className="text-[#352b38]">{selectedTenant.email}</p>
                                    </div>
                                </div>
                                {(selectedTenant as any).phone && (
                                    <div className="flex items-center gap-3 p-3 bg-[#f4f3f8] rounded-lg">
                                        <Phone className="h-4 w-4 text-[#7e808c]" />
                                        <div>
                                            <p className="text-gray-500 text-xs">Phone</p>
                                            <p className="text-[#352b38]">{(selectedTenant as any).phone}</p>
                                        </div>
                                    </div>
                                )}
                                {(selectedTenant as any).website && (
                                    <div className="flex items-center gap-3 p-3 bg-[#f4f3f8] rounded-lg">
                                        <Globe className="h-4 w-4 text-[#7e808c]" />
                                        <div>
                                            <p className="text-gray-500 text-xs">Website</p>
                                            <p className="text-[#352b38]">{(selectedTenant as any).website}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => selectedTenant && openEditDialog(selectedTenant)}
                            className="border-[#dad8f9]"
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </Button>
                        <Button
                            onClick={() => {
                                if (selectedTenant) {
                                    handleSignInAsTenant(selectedTenant.id, selectedTenant.name || "Tenant");
                                }
                            }}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <LogIn className="mr-2 h-4 w-4" />
                            Sign In As Tenant
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="border-0 shadow-sm rounded-2xl bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-[#352b38]">Delete Tenant</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#7e808c]">
                            Are you sure you want to delete <strong className="text-[#352b38]">{selectedTenant?.name}</strong>?
                            This action cannot be undone and will remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-[#f4f3f8] border-[#dad8f9] text-[#352b38] hover:bg-[#dad8f9]">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteTenant}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Suspend/Activate Confirmation Dialog */}
            <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
                <AlertDialogContent className="border-0 shadow-sm rounded-2xl bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-[#352b38]">
                            {selectedTenant?.status === "suspended" ? "Activate Tenant" : "Suspend Tenant"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[#7e808c]">
                            {selectedTenant?.status === "suspended"
                                ? `Are you sure you want to activate ${selectedTenant?.name}? They will regain access to the platform.`
                                : `Are you sure you want to suspend ${selectedTenant?.name}? They will lose access to the platform until reactivated.`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-[#f4f3f8] border-[#dad8f9] text-[#352b38] hover:bg-[#dad8f9]">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleToggleSuspend}
                            className={selectedTenant?.status === "suspended" ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"}
                            disabled={saving}
                        >
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {selectedTenant?.status === "suspended" ? "Activate" : "Suspend"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Confirmation Dialog */}
            <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
                <AlertDialogContent className="border-0 shadow-sm rounded-2xl bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-[#352b38]">Delete {selectedIds.size} Tenant(s)</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#7e808c]">
                            Are you sure you want to delete {selectedIds.size} tenant(s)? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-[#f4f3f8] border-[#dad8f9] text-[#352b38] hover:bg-[#dad8f9]">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} disabled={saving} className="bg-red-600 hover:bg-red-700">
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Suspend/Activate Confirmation Dialog */}
            <AlertDialog open={bulkSuspendDialogOpen} onOpenChange={setBulkSuspendDialogOpen}>
                <AlertDialogContent className="border-0 shadow-sm rounded-2xl bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-[#352b38]">
                            {bulkAction === "suspend" ? "Suspend" : "Activate"} {selectedIds.size} Tenant(s)
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[#7e808c]">
                            {bulkAction === "suspend"
                                ? `Are you sure you want to suspend ${selectedIds.size} tenant(s)? They will lose access to the platform.`
                                : `Are you sure you want to activate ${selectedIds.size} tenant(s)? They will regain access to the platform.`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-[#f4f3f8] border-[#dad8f9] text-[#352b38] hover:bg-[#dad8f9]">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => handleBulkStatusChange(bulkAction === "suspend" ? "suspended" : "active")}
                            disabled={saving}
                            className={bulkAction === "suspend" ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"}
                        >
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {bulkAction === "suspend" ? "Suspend All" : "Activate All"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}

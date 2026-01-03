"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GlobalUser } from "@/lib/types/super-admin";
import { Users, Search, Ban, CheckCircle, MoreHorizontal, Trash2, Edit, Shield, ShieldOff, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<GlobalUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Dialog states
    const [viewUser, setViewUser] = useState<GlobalUser | null>(null);
    const [editUser, setEditUser] = useState<GlobalUser | null>(null);
    const [deleteUser, setDeleteUser] = useState<GlobalUser | null>(null);
    const [bulkAction, setBulkAction] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ displayName: "", email: "", role: "" });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/sa/users");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setUsers(data.users || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (userId: string, newStatus: "active" | "blocked") => {
        if (!currentUser) return;
        try {
            const res = await fetch(`/api/sa/users/${userId}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, actorId: currentUser.uid })
            });
            if (!res.ok) throw new Error("Failed to update");
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
            toast.success(`User ${newStatus === "blocked" ? "blocked" : "activated"}`);
        } catch {
            toast.error("Failed to update user");
        }
    };

    const handleToggleSuperAdmin = async (userId: string, isSuperAdmin: boolean) => {
        if (!currentUser) return;
        try {
            const res = await fetch(`/api/sa/users/${userId}/super-admin`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isSuperAdmin, actorId: currentUser.uid })
            });
            if (!res.ok) throw new Error("Failed to update");
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isSuperAdmin } : u));
            toast.success(isSuperAdmin ? "User granted super admin" : "Super admin revoked");
        } catch {
            toast.error("Failed to update super admin status");
        }
    };

    const handleEditUser = async () => {
        if (!currentUser || !editUser) return;
        try {
            const res = await fetch(`/api/sa/users/${editUser.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...editForm, actorId: currentUser.uid })
            });
            if (!res.ok) throw new Error("Failed to update");
            setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...editForm } : u));
            toast.success("User updated");
            setEditUser(null);
        } catch {
            toast.error("Failed to update user");
        }
    };

    const handleDeleteUser = async () => {
        if (!currentUser || !deleteUser) return;
        try {
            const res = await fetch(`/api/sa/users/${deleteUser.id}?actorId=${currentUser.uid}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete");
            setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
            toast.success("User deleted");
            setDeleteUser(null);
        } catch {
            toast.error("Failed to delete user");
        }
    };

    const handleBulkAction = async () => {
        if (!currentUser || !bulkAction || selectedIds.size === 0) return;
        try {
            const res = await fetch("/api/sa/users/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ids: Array.from(selectedIds),
                    action: bulkAction,
                    actorId: currentUser.uid
                })
            });
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();

            // Update local state based on action
            if (bulkAction === "delete") {
                setUsers(prev => prev.filter(u => !selectedIds.has(u.id)));
            } else if (bulkAction === "block") {
                setUsers(prev => prev.map(u => selectedIds.has(u.id) ? { ...u, status: "blocked" as const } : u));
            } else if (bulkAction === "activate") {
                setUsers(prev => prev.map(u => selectedIds.has(u.id) ? { ...u, status: "active" as const } : u));
            } else if (bulkAction === "grant_super_admin") {
                setUsers(prev => prev.map(u => selectedIds.has(u.id) ? { ...u, isSuperAdmin: true } : u));
            } else if (bulkAction === "revoke_super_admin") {
                setUsers(prev => prev.map(u => selectedIds.has(u.id) ? { ...u, isSuperAdmin: false } : u));
            }

            toast.success(`Bulk action completed: ${data.processed} users affected`);
            setSelectedIds(new Set());
            setBulkAction(null);
        } catch {
            toast.error("Bulk action failed");
        }
    };

    const openEdit = (user: GlobalUser) => {
        setEditForm({
            displayName: user.displayName || "",
            email: user.email || "",
            role: user.role || ""
        });
        setEditUser(user);
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredUsers.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredUsers.map(u => u.id)));
        }
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.displayName?.toLowerCase().includes(search.toLowerCase())
    );

    const bulkActionLabels: Record<string, string> = {
        delete: "Delete Selected",
        block: "Block Selected",
        activate: "Activate Selected",
        grant_super_admin: "Grant Super Admin",
        revoke_super_admin: "Revoke Super Admin"
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                <p className="text-muted-foreground">Manage all platform users across tenants</p>
            </div>

            {/* Search & Bulk Actions */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {selectedIds.size > 0 && (
                    <div className="flex gap-2 items-center bg-muted px-4 py-2 rounded-lg">
                        <span className="text-sm font-medium">{selectedIds.size} selected</span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">Bulk Actions</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setBulkAction("activate")}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Activate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setBulkAction("block")}>
                                    <Ban className="mr-2 h-4 w-4" /> Block
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setBulkAction("grant_super_admin")}>
                                    <Shield className="mr-2 h-4 w-4" /> Grant Super Admin
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setBulkAction("revoke_super_admin")}>
                                    <ShieldOff className="mr-2 h-4 w-4" /> Revoke Super Admin
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setBulkAction("delete")} className="text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                            Clear
                        </Button>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <Card className="border-red-500">
                    <CardContent className="pt-6 text-red-600">{error}</CardContent>
                </Card>
            )}

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selectedIds.size === filteredUsers.length && filteredUsers.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Super Admin</TableHead>
                                <TableHead>Tenants</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Users className="h-8 w-8 opacity-50" />
                                            <p>No users found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map(u => (
                                    <TableRow key={u.id} className={selectedIds.has(u.id) ? "bg-muted/50" : ""}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.has(u.id)}
                                                onCheckedChange={() => toggleSelection(u.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{u.displayName || "—"}</TableCell>
                                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={u.status === "active" ? "default" : "destructive"}>
                                                {u.status || "active"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {u.isSuperAdmin ? (
                                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                                                    <Shield className="h-3 w-3 mr-1" /> Yes
                                                </Badge>
                                            ) : "—"}
                                        </TableCell>
                                        <TableCell>{u.tenantMemberships?.length || 0}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setViewUser(u)}>
                                                        <Eye className="mr-2 h-4 w-4" /> View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openEdit(u)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit User
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {u.status === "blocked" ? (
                                                        <DropdownMenuItem onClick={() => handleStatusChange(u.id, "active")}>
                                                            <CheckCircle className="mr-2 h-4 w-4" /> Activate
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onClick={() => handleStatusChange(u.id, "blocked")}>
                                                            <Ban className="mr-2 h-4 w-4" /> Block User
                                                        </DropdownMenuItem>
                                                    )}
                                                    {u.isSuperAdmin ? (
                                                        <DropdownMenuItem onClick={() => handleToggleSuperAdmin(u.id, false)}>
                                                            <ShieldOff className="mr-2 h-4 w-4" /> Revoke Super Admin
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onClick={() => handleToggleSuperAdmin(u.id, true)}>
                                                            <Shield className="mr-2 h-4 w-4" /> Grant Super Admin
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => setDeleteUser(u)}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* View User Dialog */}
            <Dialog open={!!viewUser} onOpenChange={() => setViewUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>User Details</DialogTitle>
                    </DialogHeader>
                    {viewUser && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><strong>ID:</strong></div>
                                <div className="font-mono text-xs">{viewUser.id}</div>
                                <div><strong>Display Name:</strong></div>
                                <div>{viewUser.displayName || "—"}</div>
                                <div><strong>Email:</strong></div>
                                <div>{viewUser.email}</div>
                                <div><strong>Role:</strong></div>
                                <div>{viewUser.role || "—"}</div>
                                <div><strong>Status:</strong></div>
                                <div><Badge variant={viewUser.status === "active" ? "default" : "destructive"}>{viewUser.status || "active"}</Badge></div>
                                <div><strong>Super Admin:</strong></div>
                                <div>{viewUser.isSuperAdmin ? "Yes" : "No"}</div>
                                <div><strong>Organization:</strong></div>
                                <div className="font-mono text-xs">{viewUser.orgId || "—"}</div>
                                <div><strong>Created:</strong></div>
                                <div>{viewUser.createdAt ? new Date(viewUser.createdAt as any).toLocaleDateString() : "—"}</div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewUser(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>Update user information</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Display Name</Label>
                            <Input
                                value={editForm.displayName}
                                onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Input
                                value={editForm.role}
                                onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                                placeholder="admin, member, etc."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
                        <Button onClick={handleEditUser}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{deleteUser?.email}</strong>? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Action Confirmation Dialog */}
            <AlertDialog open={!!bulkAction} onOpenChange={() => setBulkAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to <strong>{bulkActionLabels[bulkAction || ""]?.toLowerCase()}</strong> for {selectedIds.size} users?
                            {bulkAction === "delete" && " This action cannot be undone."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkAction}
                            className={bulkAction === "delete" ? "bg-red-600 hover:bg-red-700" : ""}
                        >
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

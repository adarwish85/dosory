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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tenant } from "@/lib/types/super-admin";
import { Building2, Search, Eye, MoreHorizontal, Trash2, Edit, CheckCircle, Ban, XCircle, Pause } from "lucide-react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { saFetch, saPatch, saDelete, saPost } from "@/lib/api/saFetch";
import { useTranslation } from "@/lib/i18n";

const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    trial: "bg-blue-100 text-blue-800",
    suspended: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
};

export default function TenantsPage() {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Dialog states
    const [viewTenant, setViewTenant] = useState<Tenant | null>(null);
    const [editTenant, setEditTenant] = useState<Tenant | null>(null);
    const [deleteTenant, setDeleteTenant] = useState<Tenant | null>(null);
    const [bulkAction, setBulkAction] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: "", subdomain: "", status: "", planId: "" });

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            const data = await saFetch<{ tenants: Tenant[] }>("/api/sa/tenants");
            setTenants(data.tenants || []);
        } catch (e: unknown) {
            setError((e as Error).message || String(e));
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (tenantId: string, newStatus: Tenant["status"]) => {
        if (!currentUser) return;
        try {
            await saPatch(`/api/sa/tenants/${tenantId}`, { status: newStatus, actorId: currentUser.uid });
            setTenants((prev) => prev.map((t) => (t.id === tenantId ? { ...t, status: newStatus } : t)));
            toast.success(t("sa.tenants.statusChanged", { status: newStatus }));
        } catch {
            toast.error(t("sa.tenants.statusUpdateFailed"));
        }
    };

    const handleEditTenant = async () => {
        if (!currentUser || !editTenant) return;
        try {
            await saPatch(`/api/sa/tenants/${editTenant.id}`, { ...editForm, actorId: currentUser.uid });
            setTenants((prev) =>
                prev.map((t) =>
                    t.id === editTenant.id
                        ? {
                              ...t,
                              name: editForm.name,
                              subdomain: editForm.subdomain,
                              status: editForm.status as Tenant["status"],
                              planId: editForm.planId,
                          }
                        : t
                )
            );
            toast.success(t("sa.tenants.tenantUpdated"));
            setEditTenant(null);
        } catch {
            toast.error(t("sa.tenants.tenantUpdateFailed"));
        }
    };

    const handleDeleteTenant = async () => {
        if (!currentUser || !deleteTenant) return;
        try {
            await saDelete(`/api/sa/tenants/${deleteTenant.id}?actorId=${currentUser.uid}`);
            setTenants((prev) => prev.filter((t) => t.id !== deleteTenant.id));
            toast.success(t("sa.tenants.tenantDeleted"));
            setDeleteTenant(null);
        } catch {
            toast.error(t("sa.tenants.tenantDeleteFailed"));
        }
    };

    const handleBulkAction = async () => {
        if (!currentUser || !bulkAction || selectedIds.size === 0) return;
        try {
            const data = await saPost<{ processed: number }>("/api/sa/tenants/bulk", {
                ids: Array.from(selectedIds),
                action: bulkAction,
                actorId: currentUser.uid,
            });

            // Update local state based on action
            if (bulkAction === "delete") {
                setTenants((prev) => prev.filter((t) => !selectedIds.has(t.id)));
            } else if (bulkAction === "activate") {
                setTenants((prev) =>
                    prev.map((t) => (selectedIds.has(t.id) ? { ...t, status: "active" as const } : t))
                );
            } else if (bulkAction === "suspend") {
                setTenants((prev) =>
                    prev.map((t) => (selectedIds.has(t.id) ? { ...t, status: "suspended" as const } : t))
                );
            } else if (bulkAction === "trial") {
                setTenants((prev) => prev.map((t) => (selectedIds.has(t.id) ? { ...t, status: "trial" as const } : t)));
            } else if (bulkAction === "cancel") {
                setTenants((prev) =>
                    prev.map((t) => (selectedIds.has(t.id) ? { ...t, status: "cancelled" as const } : t))
                );
            }

            toast.success(t("sa.tenants.bulkCompleted", { count: data.processed }));
            setSelectedIds(new Set());
            setBulkAction(null);
        } catch {
            toast.error(t("sa.tenants.bulkFailed"));
        }
    };

    const openEdit = (tenant: Tenant) => {
        setEditForm({
            name: tenant.name || "",
            subdomain: tenant.subdomain || "",
            status: tenant.status || "active",
            planId: tenant.planId || "",
        });
        setEditTenant(tenant);
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
        if (selectedIds.size === filteredTenants.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredTenants.map((t) => t.id)));
        }
    };

    const filteredTenants = tenants.filter(
        (t) =>
            t.name?.toLowerCase().includes(search.toLowerCase()) ||
            t.subdomain?.toLowerCase().includes(search.toLowerCase())
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatDate = (dateValue: any) => {
        if (!dateValue) return "—";
        if (dateValue._seconds) return new Date(dateValue._seconds * 1000).toLocaleDateString();
        if (dateValue.toDate) return dateValue.toDate().toLocaleDateString();
        return new Date(dateValue).toLocaleDateString();
    };

    const bulkActionLabels: Record<string, string> = {
        delete: t("sa.tenants.bulkDeleteSelected"),
        activate: t("sa.tenants.bulkActivateSelected"),
        suspend: t("sa.tenants.bulkSuspendSelected"),
        trial: t("sa.tenants.bulkSetToTrial"),
        cancel: t("sa.tenants.bulkCancelSelected"),
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("sa.tenants.title")}</h1>
                    <p className="text-muted-foreground">{t("sa.tenants.subtitle")}</p>
                </div>
            </div>

            {/* Search & Bulk Actions */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("sa.tenants.searchPlaceholder")}
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {selectedIds.size > 0 && (
                    <div className="flex gap-2 items-center bg-muted px-4 py-2 rounded-lg">
                        <span className="text-sm font-medium">{t("common.selectedCount", { count: selectedIds.size })}</span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    {t("common.bulkActions")}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setBulkAction("activate")}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> {t("sa.tenants.activate")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setBulkAction("trial")}>
                                    <Pause className="mr-2 h-4 w-4" /> {t("sa.tenants.setToTrial")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setBulkAction("suspend")}>
                                    <Ban className="mr-2 h-4 w-4" /> {t("sa.tenants.suspend")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setBulkAction("cancel")}>
                                    <XCircle className="mr-2 h-4 w-4" /> {t("common.cancel")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setBulkAction("delete")} className="text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" /> {t("common.delete")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                            {t("common.clear")}
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
                                        checked={
                                            selectedIds.size === filteredTenants.length && filteredTenants.length > 0
                                        }
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead>{t("sa.tenants.colTenant")}</TableHead>
                                <TableHead>{t("sa.tenants.colSubdomain")}</TableHead>
                                <TableHead>{t("sa.tenants.colStatus")}</TableHead>
                                <TableHead>{t("sa.tenants.colPlan")}</TableHead>
                                <TableHead>{t("sa.tenants.colCreated")}</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            <Skeleton className="h-4 w-4" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-32" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-24" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-20" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-20" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-24" />
                                        </TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredTenants.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Building2 className="h-8 w-8 opacity-50" />
                                            <p>{t("sa.tenants.noTenants")}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTenants.map((tenant) => (
                                    <TableRow
                                        key={tenant.id}
                                        className={selectedIds.has(tenant.id) ? "bg-muted/50" : ""}
                                    >
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.has(tenant.id)}
                                                onCheckedChange={() => toggleSelection(tenant.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{tenant.name}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {tenant.subdomain || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={statusColors[tenant.status] || ""}>{tenant.status}</Badge>
                                        </TableCell>
                                        <TableCell>{tenant.planId || "—"}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {formatDate(tenant.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setViewTenant(tenant)}>
                                                        <Eye className="mr-2 h-4 w-4" /> {t("sa.tenants.viewDetails")}
                                                    </DropdownMenuItem>
                                                    <Link href={`/sa/tenants/${tenant.id}`}>
                                                        <DropdownMenuItem>
                                                            <Building2 className="mr-2 h-4 w-4" /> {t("sa.tenants.fullDetailsPage")}
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <DropdownMenuItem onClick={() => openEdit(tenant)}>
                                                        <Edit className="mr-2 h-4 w-4" /> {t("sa.tenants.editTenant")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {tenant.status !== "active" && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleStatusChange(tenant.id, "active")}
                                                        >
                                                            <CheckCircle className="mr-2 h-4 w-4" /> {t("sa.tenants.activate")}
                                                        </DropdownMenuItem>
                                                    )}
                                                    {tenant.status !== "trial" && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleStatusChange(tenant.id, "trial")}
                                                        >
                                                            <Pause className="mr-2 h-4 w-4" /> {t("sa.tenants.setToTrial")}
                                                        </DropdownMenuItem>
                                                    )}
                                                    {tenant.status !== "suspended" && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleStatusChange(tenant.id, "suspended")}
                                                        >
                                                            <Ban className="mr-2 h-4 w-4" /> {t("sa.tenants.suspend")}
                                                        </DropdownMenuItem>
                                                    )}
                                                    {tenant.status !== "cancelled" && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleStatusChange(tenant.id, "cancelled")}
                                                        >
                                                            <XCircle className="mr-2 h-4 w-4" /> {t("common.cancel")}
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => setDeleteTenant(tenant)}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> {t("sa.tenants.deleteTenant")}
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

            {/* View Tenant Dialog */}
            <Dialog open={!!viewTenant} onOpenChange={() => setViewTenant(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("sa.tenants.tenantDetails")}</DialogTitle>
                    </DialogHeader>
                    {viewTenant && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <strong>{t("sa.tenants.fieldId")}</strong>
                                </div>
                                <div className="font-mono text-xs">{viewTenant.id}</div>
                                <div>
                                    <strong>{t("sa.tenants.fieldName")}</strong>
                                </div>
                                <div>{viewTenant.name}</div>
                                <div>
                                    <strong>{t("sa.tenants.fieldSubdomain")}</strong>
                                </div>
                                <div>{viewTenant.subdomain || "—"}</div>
                                <div>
                                    <strong>{t("sa.tenants.fieldStatus")}</strong>
                                </div>
                                <div>
                                    <Badge className={statusColors[viewTenant.status]}>{viewTenant.status}</Badge>
                                </div>
                                <div>
                                    <strong>{t("sa.tenants.fieldPlan")}</strong>
                                </div>
                                <div>{viewTenant.planId || "—"}</div>
                                <div>
                                    <strong>{t("sa.tenants.fieldOwner")}</strong>
                                </div>
                                <div className="font-mono text-xs">{viewTenant.ownerUserId || "—"}</div>
                                <div>
                                    <strong>{t("sa.tenants.fieldCreated")}</strong>
                                </div>
                                <div>{formatDate(viewTenant.createdAt)}</div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewTenant(null)}>
                            {t("common.close")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Tenant Dialog */}
            <Dialog open={!!editTenant} onOpenChange={() => setEditTenant(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("sa.tenants.editTenant")}</DialogTitle>
                        <DialogDescription>{t("sa.tenants.editTenantDesc")}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("sa.tenants.labelTenantName")}</Label>
                            <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("sa.tenants.labelSubdomain")}</Label>
                            <Input
                                value={editForm.subdomain}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, subdomain: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("sa.tenants.labelStatus")}</Label>
                            <Select
                                value={editForm.status}
                                onValueChange={(val) => setEditForm((prev) => ({ ...prev, status: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">{t("sa.tenants.statusActive")}</SelectItem>
                                    <SelectItem value="trial">{t("sa.tenants.statusTrial")}</SelectItem>
                                    <SelectItem value="suspended">{t("sa.tenants.statusSuspended")}</SelectItem>
                                    <SelectItem value="cancelled">{t("sa.tenants.statusCancelled")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t("sa.tenants.labelPlanId")}</Label>
                            <Input
                                value={editForm.planId}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, planId: e.target.value }))}
                                placeholder={t("sa.tenants.planIdPlaceholder")}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTenant(null)}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleEditTenant}>{t("common.saveChanges")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteTenant} onOpenChange={() => setDeleteTenant(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("sa.tenants.deleteTenant")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("sa.tenants.deleteConfirmPrefix")} <strong>{deleteTenant?.name}</strong>{t("sa.tenants.deleteConfirmSuffix")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTenant} className="bg-red-600 hover:bg-red-700">
                            {t("common.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Action Confirmation Dialog */}
            <AlertDialog open={!!bulkAction} onOpenChange={() => setBulkAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("common.confirmBulkAction")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("sa.tenants.bulkConfirmPrefix")}{" "}
                            <strong>{bulkActionLabels[bulkAction || ""]?.toLowerCase()}</strong>{" "}
                            {t("sa.tenants.bulkConfirmSuffix", { count: selectedIds.size })}
                            {bulkAction === "delete" && ` ${t("common.actionCannotBeUndone")}`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkAction}
                            className={bulkAction === "delete" ? "bg-red-600 hover:bg-red-700" : ""}
                        >
                            {t("common.confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

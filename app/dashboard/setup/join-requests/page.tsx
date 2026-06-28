"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, Check, X, Clock, Mail } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";

interface JoinRequest {
    id: string;
    userId: string;
    userEmail: string;
    orgId: string;
    orgName?: string;
    status: "pending" | "approved" | "rejected";
    message?: string;
    createdAt: { toDate: () => Date };
    reviewedAt?: { toDate: () => Date };
    reviewedBy?: string;
}

const AVAILABLE_PERMISSIONS = [
    { id: "customers-view", labelKey: "setup.joinRequests.permCustomersView" },
    { id: "customers-create", labelKey: "setup.joinRequests.permCustomersCreate" },
    { id: "customers-edit", labelKey: "setup.joinRequests.permCustomersEdit" },
    { id: "customers-delete", labelKey: "setup.joinRequests.permCustomersDelete" },
    { id: "invoices-view", labelKey: "setup.joinRequests.permInvoicesView" },
    { id: "invoices-create", labelKey: "setup.joinRequests.permInvoicesCreate" },
    { id: "invoices-edit", labelKey: "setup.joinRequests.permInvoicesEdit" },
    { id: "invoices-delete", labelKey: "setup.joinRequests.permInvoicesDelete" },
    { id: "projects-view", labelKey: "setup.joinRequests.permProjectsView" },
    { id: "projects-create", labelKey: "setup.joinRequests.permProjectsCreate" },
    { id: "projects-edit", labelKey: "setup.joinRequests.permProjectsEdit" },
    { id: "projects-delete", labelKey: "setup.joinRequests.permProjectsDelete" },
    { id: "expenses-view", labelKey: "setup.joinRequests.permExpensesView" },
    { id: "expenses-create", labelKey: "setup.joinRequests.permExpensesCreate" },
    { id: "reports-view", labelKey: "setup.joinRequests.permReportsView" },
    { id: "settings-view", labelKey: "setup.joinRequests.permSettingsView" },
];

export default function JoinRequestsPage() {
    const { t } = useTranslation();
    const { profile } = useUserProfile();
    const [requests, setRequests] = useState<JoinRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Approval form state
    const [selectedRole, setSelectedRole] = useState("employee");
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (!profile?.orgId) return;

        const q = query(collection(db, "join_requests"), where("orgId", "==", profile.orgId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as JoinRequest[];

            // Sort by status (pending first) then by date
            data.sort((a, b) => {
                if (a.status === "pending" && b.status !== "pending") return -1;
                if (a.status !== "pending" && b.status === "pending") return 1;
                return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
            });

            setRequests(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId]);

    const openApproveDialog = (request: JoinRequest) => {
        setSelectedRequest(request);
        setSelectedRole("employee");
        setSelectedPermissions([]);
        setIsAdmin(false);
        setApproveDialogOpen(true);
    };

    const handleApprove = async () => {
        if (!selectedRequest || !profile) return;

        setProcessing(true);
        try {
            const response = await fetch("/api/admin/join-requests/approve", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
                },
                body: JSON.stringify({
                    requestId: selectedRequest.id,
                    roleId: selectedRole,
                    isAdmin: isAdmin,
                    permissions: selectedPermissions,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || t("setup.joinRequests.approveFailed"));
            }

            const data = await response.json();
            toast.success(
                t("setup.joinRequests.approveSuccess", {
                    email: selectedRequest.userEmail,
                    emailStatus: data.emailSent
                        ? t("setup.joinRequests.emailSent")
                        : t("setup.joinRequests.emailFailed"),
                })
            );
            setApproveDialogOpen(false);

            // Note: Snapshot listener will automatically update the list
        } catch (error) {
            console.error("Error approving request:", error);
            toast.error((error as Error).message || t("setup.joinRequests.approveFailed"));
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (request: JoinRequest) => {
        if (!profile) return;

        setProcessing(true);
        try {
            const response = await fetch("/api/admin/join-requests/reject", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
                },
                body: JSON.stringify({
                    requestId: request.id,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || t("setup.joinRequests.rejectFailed"));
            }

            const data = await response.json();
            toast.success(
                t("setup.joinRequests.rejectSuccess", {
                    email: request.userEmail,
                    emailStatus: data.emailSent
                        ? t("setup.joinRequests.emailSent")
                        : t("setup.joinRequests.emailFailed"),
                })
            );
        } catch (error) {
            console.error("Error rejecting request:", error);
            toast.error((error as Error).message || t("setup.joinRequests.rejectFailed"));
        } finally {
            setProcessing(false);
        }
    };

    const togglePermission = (permId: string) => {
        setSelectedPermissions((prev) =>
            prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
        );
    };

    const selectAllPermissions = () => {
        setSelectedPermissions(AVAILABLE_PERMISSIONS.map((p) => p.id));
    };

    const clearAllPermissions = () => {
        setSelectedPermissions([]);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    const pendingCount = requests.filter((r) => r.status === "pending").length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t("setup.joinRequests.title")}</h1>
                    <p className="text-gray-500">{t("setup.joinRequests.description")}</p>
                </div>
                {pendingCount > 0 && (
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                        {t("setup.joinRequests.pendingCount", { count: pendingCount })}
                    </Badge>
                )}
            </div>

            {requests.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <UserPlus className="h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-600">{t("setup.joinRequests.empty")}</h3>
                        <p className="text-sm text-gray-400">
                            {t("setup.joinRequests.emptyDescription")}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {requests.map((request) => (
                        <Card
                            key={request.id}
                            className={request.status === "pending" ? "border-orange-200 bg-orange-50/30" : ""}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-gray-100 rounded-full">
                                            <Mail className="h-5 w-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{request.userEmail}</p>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Clock className="h-3 w-3" />
                                                {formatDistanceToNow(request.createdAt.toDate(), { addSuffix: true })}
                                                {request.message && (
                                                    <span className="ml-2 text-gray-600">
                                                        &quot;{request.message}&quot;
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {request.status === "pending" ? (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleReject(request)}
                                                    disabled={processing}
                                                    className="text-red-600 hover:bg-red-50"
                                                >
                                                    <X className="h-4 w-4 mr-1" />
                                                    {t("setup.joinRequests.reject")}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => openApproveDialog(request)}
                                                    disabled={processing}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    <Check className="h-4 w-4 mr-1" />
                                                    {t("setup.joinRequests.approve")}
                                                </Button>
                                            </>
                                        ) : request.status === "approved" ? (
                                            <Badge className="bg-green-100 text-green-700">{t("setup.joinRequests.approved")}</Badge>
                                        ) : (
                                            <Badge className="bg-red-100 text-red-700">{t("setup.joinRequests.rejected")}</Badge>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Approve Dialog */}
            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t("setup.joinRequests.approveDialogTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("setup.joinRequests.approveDialogDescription", {
                                email: selectedRequest?.userEmail ?? "",
                            })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t("setup.joinRequests.role")}</Label>
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="employee">{t("setup.joinRequests.roleEmployee")}</SelectItem>
                                    <SelectItem value="pm">{t("setup.joinRequests.roleProjectManager")}</SelectItem>
                                    <SelectItem value="admin">{t("setup.joinRequests.roleAdministrator")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="isAdmin"
                                checked={isAdmin}
                                onCheckedChange={(checked) => setIsAdmin(!!checked)}
                            />
                            <Label htmlFor="isAdmin" className="text-sm">
                                {t("setup.joinRequests.grantAdmin")}
                            </Label>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>{t("setup.joinRequests.permissions")}</Label>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={selectAllPermissions}>
                                        {t("setup.joinRequests.selectAll")}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={clearAllPermissions}>
                                        {t("setup.joinRequests.clear")}
                                    </Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                                {AVAILABLE_PERMISSIONS.map((perm) => (
                                    <div key={perm.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={perm.id}
                                            checked={selectedPermissions.includes(perm.id)}
                                            onCheckedChange={() => togglePermission(perm.id)}
                                        />
                                        <Label htmlFor={perm.id} className="text-xs cursor-pointer">
                                            {t(perm.labelKey)}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            onClick={handleApprove}
                            disabled={processing}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("setup.joinRequests.approveAndAdd")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

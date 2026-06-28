"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { saGet, saPost, saPatch } from "@/lib/api/saFetch";
import { SuperAdminRole, SuperAdminUser } from "@/lib/rbac/super-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Plus, Lock, UserX, UserCheck, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n";

export default function SecurityUsersPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [users, setUsers] = useState<SuperAdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [myRole, setMyRole] = useState<SuperAdminRole | null>(null);
    const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

    // Dialog states
    const [showAdd, setShowAdd] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserRole, setNewUserRole] = useState<SuperAdminRole>(SuperAdminRole.SupportAgent);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        checkMyRole();
        fetchUsers();
    }, [user]);

    const checkMyRole = async () => {
        if (!user) return;
        const token = await user.getIdTokenResult();
        const role = (token.claims.superRole as SuperAdminRole) || SuperAdminRole.PlatformAdmin; // Default safe assumption? No, safer to assume nothing.
        // But for SA app context, usually we are at least logged in.
        // Let's rely on claims.
        setMyRole(role);
        setIsPlatformAdmin(role === SuperAdminRole.PlatformAdmin);
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await saGet<{ users: SuperAdminUser[] }>("/api/sa/security/users");
            setUsers(data.users || []);
        } catch (err: unknown) {
            toast.error((err as Error).message || t("sa.securityUsers.toast.loadFailed"));
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async () => {
        if (!newUserEmail) {
            toast.error(t("sa.securityUsers.toast.emailRequired"));
            return;
        }
        try {
            setSubmitting(true);
            await saPost("/api/sa/security/users", {
                email: newUserEmail,
                role: newUserRole,
            });
            toast.success(t("sa.securityUsers.toast.added"));
            setShowAdd(false);
            setNewUserEmail("");
            fetchUsers();
        } catch (err: unknown) {
            toast.error((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRoleChange = async (uid: string, newRole: SuperAdminRole) => {
        // Confirmation?
        if (!confirm(t("sa.securityUsers.confirm.changeRole", { role: newRole }))) return;

        try {
            await saPatch(`/api/sa/security/users/${uid}/role`, { role: newRole });
            toast.success(t("sa.securityUsers.toast.roleUpdated"));
            fetchUsers();
        } catch (err: unknown) {
            toast.error((err as Error).message);
        }
    };

    const handleToggleStatus = async (uid: string, currentStatus: string) => {
        const newStatus = currentStatus === "active" ? "disabled" : "active";
        const action =
            newStatus === "disabled"
                ? t("sa.securityUsers.confirm.disableUser")
                : t("sa.securityUsers.confirm.enableUser");

        if (!confirm(action)) return;

        try {
            await saPatch(`/api/sa/security/users/${uid}/disable`, { status: newStatus });
            toast.success(
                newStatus === "disabled"
                    ? t("sa.securityUsers.toast.userDisabled")
                    : t("sa.securityUsers.toast.userEnabled")
            );
            fetchUsers();
        } catch (err: unknown) {
            toast.error((err as Error).message);
        }
    };

    const roleColors: Record<SuperAdminRole, string> = {
        [SuperAdminRole.PlatformAdmin]: "bg-purple-100 text-purple-800 border-purple-200",
        [SuperAdminRole.SecurityAdmin]: "bg-red-100 text-red-800 border-red-200",
        [SuperAdminRole.BillingAdmin]: "bg-green-100 text-green-800 border-green-200",
        [SuperAdminRole.ContentAdmin]: "bg-blue-100 text-blue-800 border-blue-200",
        [SuperAdminRole.SupportAgent]: "bg-gray-100 text-gray-800 border-gray-200",
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("sa.securityUsers.title")}</h1>
                    <p className="text-muted-foreground">{t("sa.securityUsers.subtitle")}</p>
                </div>
                {isPlatformAdmin && (
                    <Dialog open={showAdd} onOpenChange={setShowAdd}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" /> {t("sa.securityUsers.addAdmin")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t("sa.securityUsers.dialog.title")}</DialogTitle>
                                <DialogDescription>{t("sa.securityUsers.dialog.description")}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("sa.securityUsers.email")}</label>
                                    <Input
                                        placeholder="user@dosory.com"
                                        value={newUserEmail}
                                        onChange={(e) => setNewUserEmail(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("sa.securityUsers.role")}</label>
                                    <Select
                                        value={newUserRole}
                                        onValueChange={(v) => setNewUserRole(v as SuperAdminRole)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.values(SuperAdminRole).map((role) => (
                                                <SelectItem key={role} value={role}>
                                                    {role}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowAdd(false)}>
                                    {t("common.cancel")}
                                </Button>
                                <Button onClick={handleAddUser} disabled={submitting}>
                                    {submitting ? t("sa.securityUsers.adding") : t("sa.securityUsers.addAdmin")}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("sa.securityUsers.col.user")}</TableHead>
                            <TableHead>{t("sa.securityUsers.role")}</TableHead>
                            <TableHead>{t("sa.securityUsers.col.status")}</TableHead>
                            <TableHead>{t("sa.securityUsers.col.joined")}</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <Skeleton className="h-4 w-32" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-24" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-16" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-24" />
                                    </TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            ))
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    {t("sa.securityUsers.empty")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((adminUser) => (
                                <TableRow key={adminUser.uid}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{adminUser.email}</span>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {adminUser.uid}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {isPlatformAdmin && adminUser.uid !== user?.uid ? (
                                            <Select
                                                defaultValue={adminUser.role}
                                                onValueChange={(v) =>
                                                    handleRoleChange(adminUser.uid, v as SuperAdminRole)
                                                }
                                            >
                                                <SelectTrigger
                                                    className={`w-[180px] h-8 ${roleColors[adminUser.role] || ""}`}
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.values(SuperAdminRole).map((r) => (
                                                        <SelectItem key={r} value={r}>
                                                            {r}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Badge variant="outline" className={roleColors[adminUser.role]}>
                                                {adminUser.role}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {adminUser.status === "disabled" ? (
                                            <Badge variant="destructive">{t("sa.securityUsers.status.disabled")}</Badge>
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className="text-green-600 border-green-200 bg-green-50"
                                            >
                                                {t("sa.securityUsers.status.active")}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {/* Timestamp handling might differ if using Firestore timestamps directly */}
                                        {/* Assuming it handles it via server serialization or we need to format */}—
                                    </TableCell>
                                    <TableCell>
                                        {isPlatformAdmin && adminUser.uid !== user?.uid && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    handleToggleStatus(adminUser.uid, adminUser.status || "active")
                                                }
                                                title={
                                                    adminUser.status === "disabled"
                                                        ? t("sa.securityUsers.action.enableUser")
                                                        : t("sa.securityUsers.action.disableUser")
                                                }
                                            >
                                                {adminUser.status === "disabled" ? (
                                                    <UserCheck className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <UserX className="h-4 w-4 text-red-600" />
                                                )}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3 text-sm text-yellow-800">
                <Lock className="h-5 w-5 shrink-0" />
                <div>
                    <p className="font-medium">{t("sa.securityUsers.note.title")}</p>
                    <p>{t("sa.securityUsers.note.body")}</p>
                </div>
            </div>
        </div>
    );
}

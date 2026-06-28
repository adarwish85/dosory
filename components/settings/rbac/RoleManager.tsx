"use client";

import { useEffect, useState } from "react";
import { Role } from "@/lib/rbac/types";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, deleteDoc, query, where } from "firebase/firestore";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Shield } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export function RoleManager() {
    const { profile } = useUserProfile();
    const { t } = useTranslation();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRoles = async () => {
        if (!profile?.orgId) return;

        try {
            // Fetch roles from subcollection
            const rolesRef = collection(db, "organizations", profile.orgId, "roles");
            const snapshot = await getDocs(rolesRef);

            const loadedRoles = snapshot.docs.map(
                (doc) =>
                    ({
                        id: doc.id,
                        ...doc.data(),
                    }) as Role
            );

            setRoles(loadedRoles);
        } catch (error) {
            console.error("Failed to load roles", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, [profile?.orgId]);

    const handleDelete = async (roleId: string) => {
        if (!confirm(t("settings.rbac.deleteConfirm"))) return;
        if (!profile?.orgId) return;

        try {
            await deleteDoc(doc(db, "organizations", profile.orgId, "roles", roleId));
            fetchRoles();
        } catch (err) {
            alert(t("settings.rbac.deleteFailed"));
        }
    };

    if (loading) return <div>{t("settings.rbac.loading")}</div>;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("settings.rbac.title")}</CardTitle>
                <Button>
                    <Plus className="w-4 h-4 mr-2" /> {t("settings.rbac.createRole")}
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("settings.rbac.col.name")}</TableHead>
                            <TableHead>{t("settings.rbac.col.description")}</TableHead>
                            <TableHead>{t("settings.rbac.col.type")}</TableHead>
                            <TableHead>{t("settings.rbac.col.permissions")}</TableHead>
                            <TableHead className="text-right">{t("settings.rbac.col.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {roles.map((role) => (
                            <TableRow key={role.id}>
                                <TableCell className="font-medium">{role.name}</TableCell>
                                <TableCell>{role.description}</TableCell>
                                <TableCell>
                                    {role.isSystemRole ? (
                                        <Badge variant="secondary">
                                            <Shield className="w-3 h-3 mr-1" /> {t("settings.rbac.systemRole")}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">{t("settings.rbac.customRole")}</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <span className="text-xs text-muted-foreground">
                                        {t("settings.rbac.capabilities", { count: role.permissions.length })}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    {!role.isSystemRole && (
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(role.id)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {roles.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    {t("settings.rbac.empty")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

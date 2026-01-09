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

export function RoleManager() {
    const { profile } = useUserProfile();
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
        if (!confirm("Are you sure? Users with this role may lose access.")) return;
        if (!profile?.orgId) return;

        try {
            await deleteDoc(doc(db, "organizations", profile.orgId, "roles", roleId));
            fetchRoles();
        } catch (err) {
            alert("Failed to delete role");
        }
    };

    if (loading) return <div>Loading access control...</div>;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Roles & Permissions</CardTitle>
                <Button>
                    <Plus className="w-4 h-4 mr-2" /> Create Role
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Role Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Permissions</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
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
                                            <Shield className="w-3 h-3 mr-1" /> System
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">Custom</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <span className="text-xs text-muted-foreground">
                                        {role.permissions.length} capabilities
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
                                    No roles defined correctly. Run seed script.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

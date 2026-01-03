"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tenant } from "@/lib/types/super-admin";
import { ArrowLeft, Building2, User, Calendar, Globe, Palette } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { saFetch, saPatch } from "@/lib/api/saFetch";

const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    trial: "bg-blue-100 text-blue-800",
    suspended: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
};

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user } = useAuth();
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const fetchTenant = async () => {
            try {
                const data = await saFetch<Tenant>(`/api/sa/tenants/${id}`);
                setTenant(data);
            } catch (e: unknown) {
                setError((e as Error).message || String(e));
            } finally {
                setLoading(false);
            }
        };
        fetchTenant();
    }, [id]);

    const handleStatusChange = async (newStatus: Tenant["status"]) => {
        if (!user) return;
        setUpdating(true);
        try {
            await saPatch(`/api/sa/tenants/${id}`, { status: newStatus, actorId: user.uid });
            setTenant((prev) => (prev ? { ...prev, status: newStatus } : null));
            toast.success(`Tenant status updated to ${newStatus}`);
        } catch {
            toast.error("Failed to update status");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <Card>
                    <CardContent className="pt-6 space-y-4">
                        <Skeleton className="h-6 w-64" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !tenant) {
        return (
            <div className="space-y-6">
                <Link href="/sa/tenants">
                    <Button variant="ghost">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tenants
                    </Button>
                </Link>
                <Card className="border-red-500">
                    <CardContent className="pt-6 text-center text-red-600">{error || "Tenant not found"}</CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <Link href="/sa/tenants">
                <Button variant="ghost" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tenants
                </Button>
            </Link>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{tenant.name}</h1>
                        <p className="text-muted-foreground">{tenant.subdomain}.dosory.com</p>
                    </div>
                </div>
                <Badge className={statusColors[tenant.status]}>{tenant.status}</Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tenant Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Subdomain:</span>
                            <span className="text-sm text-muted-foreground">{tenant.subdomain}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Owner ID:</span>
                            <span className="text-sm text-muted-foreground font-mono">{tenant.ownerUserId}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Created:</span>
                            <span className="text-sm text-muted-foreground">
                                {tenant.createdAt?.toDate?.()?.toLocaleDateString() || "—"}
                            </span>
                        </div>
                        {tenant.planId && (
                            <div className="flex items-center gap-3">
                                <Palette className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Plan:</span>
                                <span className="text-sm text-muted-foreground">{tenant.planId}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Actions Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                        <CardDescription>Manage tenant status and settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Change Status</p>
                            <div className="flex flex-wrap gap-2">
                                {(["active", "trial", "suspended", "cancelled"] as const).map((status) => (
                                    <Button
                                        key={status}
                                        variant={tenant.status === status ? "default" : "outline"}
                                        size="sm"
                                        disabled={tenant.status === status || updating}
                                        onClick={() => handleStatusChange(status)}
                                    >
                                        {status}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Impersonation</p>
                            <Button variant="secondary" disabled>
                                Login as Tenant Admin
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

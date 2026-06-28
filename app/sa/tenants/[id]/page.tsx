"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tenant } from "@/lib/types/super-admin";
import { ArrowLeft, Building2, User, Calendar, Globe, Palette, LockKeyhole, CreditCard } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { useImpersonation } from "@/lib/contexts/ImpersonationContext";
import { toast } from "sonner";
import { saFetch, saGet, saPatch } from "@/lib/api/saFetch";
import { useTranslation } from "@/lib/i18n";

const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    trial: "bg-blue-100 text-blue-800",
    trialing: "bg-blue-100 text-blue-800",
    past_due: "bg-amber-100 text-amber-800",
    suspended: "bg-red-100 text-red-800",
    canceled: "bg-gray-100 text-gray-800",
    cancelled: "bg-gray-100 text-gray-800",
};

interface BillingPlan {
    id: string;
    name: string;
}

interface BillingSubscription {
    status?: string;
    planId?: string;
}

type BillingStatus = "active" | "past_due" | "suspended" | "canceled";

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { t } = useTranslation();
    const { user } = useAuth();
    const { startImpersonation } = useImpersonation();
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);
    const [impersonating, setImpersonating] = useState(false);

    // Billing subscription (separate from the tenant doc's status above)
    const [plans, setPlans] = useState<BillingPlan[]>([]);
    const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
    const [selectedPlan, setSelectedPlan] = useState("");
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
    const [subBusy, setSubBusy] = useState(false);

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

    useEffect(() => {
        const fetchBilling = async () => {
            try {
                const [plansRes, subRes] = await Promise.all([
                    saGet<{ plans: BillingPlan[] }>(`/api/sa/billing/plans?status=published`),
                    saGet<{ subscription: BillingSubscription }>(`/api/sa/billing/subscriptions/${id}`).catch(() => ({
                        subscription: null as BillingSubscription | null,
                    })),
                ]);
                const published = plansRes.plans || [];
                setPlans(published);
                setSubscription(subRes.subscription);
                const current = subRes.subscription?.planId;
                setSelectedPlan(current && published.some((p) => p.id === current) ? current : published[0]?.id || "");
            } catch (e: unknown) {
                console.error("Failed to load billing:", (e as Error).message || e);
            }
        };
        fetchBilling();
    }, [id]);

    const handleStatusChange = async (newStatus: Tenant["status"]) => {
        if (!user) return;
        setUpdating(true);
        try {
            await saPatch(`/api/sa/tenants/${id}`, { status: newStatus, actorId: user.uid });
            setTenant((prev) => (prev ? { ...prev, status: newStatus } : null));
            toast.success(t("sa.tenantDetail.statusUpdated", { status: newStatus }));
        } catch {
            toast.error(t("sa.tenantDetail.statusUpdateFailed"));
        } finally {
            setUpdating(false);
        }
    };

    const handleSubscriptionUpdate = async (status: BillingStatus) => {
        if (!selectedPlan) {
            toast.error(t("sa.tenantDetail.selectPlanFirst"));
            return;
        }
        setSubBusy(true);
        try {
            // createOrUpdateSubscription requires a published planId; the trial sub's
            // computedEntitlements are preserved on update, so the tenant keeps access.
            const res = await saPatch<{ subscription: BillingSubscription }>(`/api/sa/billing/subscriptions/${id}`, {
                planId: selectedPlan,
                billingCycle,
                status,
            });
            setSubscription(res.subscription);
            toast.success(t("sa.tenantDetail.subscriptionSet", { status }));
        } catch (e: unknown) {
            toast.error(t("sa.tenantDetail.subscriptionUpdateFailed", { message: (e as Error).message || t("common.unknownError") }));
        } finally {
            setSubBusy(false);
        }
    };

    const handleImpersonate = async () => {
        if (!tenant) return;
        setImpersonating(true);
        try {
            // Start session via API
            const result = await saFetch<{ sessionId: string }>(`/api/sa/impersonation/start`, {
                method: "POST",
                body: JSON.stringify({
                    tenantId: id,
                    reason: "Support investigation from SA Console",
                    // userId: tenant.ownerUserId // Optional: impersonate specific owner?
                }),
            });

            toast.info(t("sa.tenantDetail.startingImpersonation"));

            // Switch context
            startImpersonation(result.sessionId, id);
        } catch (e: unknown) {
            toast.error(t("sa.tenantDetail.impersonationFailed", { message: (e as Error).message || t("common.unknownError") }));
            setImpersonating(false);
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
                        <ArrowLeft className="mr-2 h-4 w-4" /> {t("sa.tenantDetail.backToTenants")}
                    </Button>
                </Link>
                <Card className="border-red-500">
                    <CardContent className="pt-6 text-center text-red-600">{error || t("sa.tenantDetail.tenantNotFound")}</CardContent>
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
                        <CardTitle>{t("sa.tenantDetail.tenantDetails")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{t("sa.tenantDetail.subdomainLabel")}</span>
                            <span className="text-sm text-muted-foreground">{tenant.subdomain}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{t("sa.tenantDetail.ownerIdLabel")}</span>
                            <span className="text-sm text-muted-foreground font-mono">{tenant.ownerUserId}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{t("sa.tenantDetail.createdLabel")}</span>
                            <span className="text-sm text-muted-foreground">
                                {tenant.createdAt?.toDate?.()?.toLocaleDateString() || "—"}
                            </span>
                        </div>
                        {tenant.planId && (
                            <div className="flex items-center gap-3">
                                <Palette className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{t("sa.tenantDetail.planLabel")}</span>
                                <span className="text-sm text-muted-foreground">{tenant.planId}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Actions Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t("sa.tenantDetail.actions")}</CardTitle>
                        <CardDescription>{t("sa.tenantDetail.actionsDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-sm font-medium">{t("sa.tenantDetail.changeStatus")}</p>
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
                            <p className="text-sm font-medium">{t("sa.tenantDetail.impersonation")}</p>
                            <Button
                                variant="secondary"
                                disabled={impersonating || tenant.status === "cancelled"}
                                onClick={handleImpersonate}
                                className="w-full sm:w-auto"
                            >
                                <LockKeyhole className="mr-2 h-4 w-4" />
                                {impersonating ? t("sa.tenantDetail.startingSession") : t("sa.tenantDetail.impersonateAdmin")}
                            </Button>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t("sa.tenantDetail.impersonationCaution")}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Subscription (Billing) Card — drives subscriptions/{orgId}, what gates tenant writes */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" /> {t("sa.tenantDetail.subscriptionBilling")}
                        </CardTitle>
                        <CardDescription>{t("sa.tenantDetail.subscriptionDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{t("sa.tenantDetail.currentLabel")}</span>
                            <Badge className={statusColors[subscription?.status ?? ""] || "bg-gray-100 text-gray-800"}>
                                {subscription?.status ?? t("sa.tenantDetail.none")}
                            </Badge>
                            {subscription?.planId && (
                                <span className="text-muted-foreground font-mono text-xs">{subscription.planId}</span>
                            )}
                        </div>

                        {plans.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {t("sa.tenantDetail.noPublishedPlans")}
                            </p>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("sa.tenantDetail.planSelectLabel")}</label>
                                    <select
                                        className="w-full border rounded-md h-9 px-2 text-sm bg-background"
                                        value={selectedPlan}
                                        onChange={(e) => setSelectedPlan(e.target.value)}
                                    >
                                        {plans.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("sa.tenantDetail.billingCycle")}</label>
                                    <select
                                        className="w-full border rounded-md h-9 px-2 text-sm bg-background"
                                        value={billingCycle}
                                        onChange={(e) => setBillingCycle(e.target.value as "monthly" | "annual")}
                                    >
                                        <option value="monthly">{t("sa.tenantDetail.monthly")}</option>
                                        <option value="annual">{t("sa.tenantDetail.annual")}</option>
                                    </select>
                                </div>
                                <Button
                                    className="w-full"
                                    disabled={subBusy || !selectedPlan}
                                    onClick={() => handleSubscriptionUpdate("active")}
                                >
                                    {subBusy ? t("sa.tenantDetail.working") : t("sa.tenantDetail.activateMarkPaid")}
                                </Button>
                                <Separator />
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">{t("sa.tenantDetail.lifecycle")}</p>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={subBusy}
                                            onClick={() => handleSubscriptionUpdate("past_due")}
                                        >
                                            {t("sa.tenantDetail.pastDue")}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={subBusy}
                                            onClick={() => handleSubscriptionUpdate("suspended")}
                                        >
                                            {t("sa.tenantDetail.suspend")}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={subBusy}
                                            onClick={() => handleSubscriptionUpdate("canceled")}
                                        >
                                            {t("common.cancel")}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {t("sa.tenantDetail.lifecycleHint")}
                                    </p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

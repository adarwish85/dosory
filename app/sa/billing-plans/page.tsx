"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth-provider";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";
import { saGet, saPost, saPatch } from "@/lib/api/saFetch";
import { Plan, Addon, Subscription, UsageExceeded, PlanStatus } from "@/lib/types/billing";
import { MODULE_FEATURES_SCHEMA } from "@/lib/types/features-schema";
import {
    CreditCard,
    Package,
    Users,
    BarChart3,
    Settings,
    Plus,
    MoreHorizontal,
    Edit,
    Copy,
    Archive,
    Send,
    Eye,
    Trash2,
    CheckCircle,
    XCircle,
    AlertTriangle,
    DollarSign,
    Clock,
} from "lucide-react";

export default function BillingPlansPage() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("plans");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t("sa.billingPlans.title")}</h1>
                <p className="text-muted-foreground">{t("sa.billingPlans.subtitle")}</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                    <TabsTrigger value="plans" className="flex gap-2">
                        <CreditCard className="h-4 w-4" /> {t("sa.billingPlans.tabs.plans")}
                    </TabsTrigger>
                    <TabsTrigger value="addons" className="flex gap-2">
                        <Package className="h-4 w-4" /> {t("sa.billingPlans.tabs.addons")}
                    </TabsTrigger>
                    <TabsTrigger value="subscriptions" className="flex gap-2">
                        <Users className="h-4 w-4" /> {t("sa.billingPlans.tabs.subscriptions")}
                    </TabsTrigger>
                    <TabsTrigger value="usage" className="flex gap-2">
                        <BarChart3 className="h-4 w-4" /> {t("sa.billingPlans.tabs.usage")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="plans" className="mt-6">
                    <PlansTab />
                </TabsContent>
                <TabsContent value="addons" className="mt-6">
                    <AddonsTab />
                </TabsContent>
                <TabsContent value="subscriptions" className="mt-6">
                    <SubscriptionsTab />
                </TabsContent>
                <TabsContent value="usage" className="mt-6">
                    <UsageTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ============================================
// PLANS TAB
// ============================================
function PlansTab() {
    const { t } = useTranslation();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [editPlan, setEditPlan] = useState<Plan | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ plan: Plan; action: "publish" | "archive" } | null>(null);

    useEffect(() => {
        fetchPlans();
    }, [statusFilter]);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter !== "all") params.set("status", statusFilter);
            if (search) params.set("q", search);

            const data = await saGet<{ plans: Plan[] }>(`/api/sa/billing/plans?${params}`);
            setPlans(data.plans || []);
        } catch (err: unknown) {
            toast.error((err as Error).message || String(err));
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async (plan: Plan) => {
        try {
            await saPost(`/api/sa/billing/plans/${plan.id}/publish`, {});
            toast.success(t("sa.billingPlans.toast.planPublished"));
            fetchPlans();
            setConfirmAction(null);
        } catch (err: unknown) {
            toast.error((err as Error).message || String(err));
        }
    };

    const handleArchive = async (plan: Plan) => {
        try {
            await saPost(`/api/sa/billing/plans/${plan.id}/archive`, {});
            toast.success(t("sa.billingPlans.toast.planArchived"));
            fetchPlans();
            setConfirmAction(null);
        } catch (err: unknown) {
            toast.error((err as Error).message || String(err));
        }
    };

    const handleDuplicate = async (plan: Plan) => {
        try {
            await saPost(`/api/sa/billing/plans/${plan.id}/duplicate-version`, {});
            toast.success(t("sa.billingPlans.toast.planDuplicated"));
            fetchPlans();
        } catch (err: unknown) {
            toast.error((err as Error).message || String(err));
        }
    };

    const formatPrice = (cents: number) => {
        return `$${(cents / 100).toFixed(2)}`;
    };

    const statusBadge = (status: PlanStatus) => {
        const colors = {
            draft: "bg-yellow-100 text-yellow-800",
            published: "bg-green-100 text-green-800",
            archived: "bg-gray-100 text-gray-600",
        };
        return <Badge className={colors[status]}>{t(`sa.billingPlans.status.${status}`)}</Badge>;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex gap-4 items-center">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder={t("sa.billingPlans.filter.status")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("sa.billingPlans.filter.allStatus")}</SelectItem>
                            <SelectItem value="draft">{t("sa.billingPlans.status.draft")}</SelectItem>
                            <SelectItem value="published">{t("sa.billingPlans.status.published")}</SelectItem>
                            <SelectItem value="archived">{t("sa.billingPlans.status.archived")}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder={t("sa.billingPlans.searchPlaceholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-64"
                    />
                    <Button variant="outline" size="sm" onClick={fetchPlans}>
                        {t("common.search")}
                    </Button>
                </div>
                <Button onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4 mr-2" /> {t("sa.billingPlans.createPlan")}
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("sa.billingPlans.col.plan")}</TableHead>
                                <TableHead>{t("sa.billingPlans.col.status")}</TableHead>
                                <TableHead>{t("sa.billingPlans.col.monthly")}</TableHead>
                                <TableHead>{t("sa.billingPlans.col.annual")}</TableHead>
                                <TableHead>{t("sa.billingPlans.col.trial")}</TableHead>
                                <TableHead>{t("sa.billingPlans.col.limits")}</TableHead>
                                <TableHead>{t("sa.billingPlans.col.modules")}</TableHead>
                                <TableHead className="w-12"></TableHead>
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
                                            <Skeleton className="h-4 w-20" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-16" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-16" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-12" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-20" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-8" />
                                        </TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                ))
                            ) : plans.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <CreditCard className="h-8 w-8 opacity-50" />
                                            <p>{t("sa.billingPlans.empty.noPlans")}</p>
                                            <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
                                                {t("sa.billingPlans.empty.createFirst")}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                plans.map((plan) => (
                                    <TableRow key={plan.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium flex items-center gap-2">
                                                    {plan.name}
                                                    {plan.ui?.badge && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {plan.ui.badge}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">{plan.id}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{statusBadge(plan.status)}</TableCell>
                                        <TableCell>
                                            {plan.isFree ? (
                                                <span className="text-green-600 font-medium">
                                                    {t("sa.billingPlans.free")}
                                                </span>
                                            ) : (
                                                formatPrice(plan.billing?.monthlyPrice || 0)
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {plan.isFree ? "—" : formatPrice(plan.billing?.annualPrice || 0)}
                                        </TableCell>
                                        <TableCell>
                                            {plan.trial?.enabled ? (
                                                <span className="text-blue-600">
                                                    {t("sa.billingPlans.daysCount", { count: plan.trial.days })}
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <span>
                                                    {t("sa.billingPlans.usersCount", {
                                                        count: plan.limits?.maxUsers === -1 ? "∞" : plan.limits?.maxUsers,
                                                    })}
                                                </span>
                                                <span className="text-muted-foreground mx-1">•</span>
                                                <span>
                                                    {t("sa.billingPlans.storageGb", {
                                                        count:
                                                            plan.limits?.storageGB === -1 ? "∞" : plan.limits?.storageGB,
                                                    })}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{plan.entitlements?.modules?.length || 0}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setEditPlan(plan)}>
                                                        <Edit className="mr-2 h-4 w-4" /> {t("common.edit")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDuplicate(plan)}>
                                                        <Copy className="mr-2 h-4 w-4" />{" "}
                                                        {t("sa.billingPlans.action.duplicate")}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {plan.status === "draft" && (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                setConfirmAction({ plan, action: "publish" })
                                                            }
                                                        >
                                                            <Send className="mr-2 h-4 w-4" />{" "}
                                                            {t("sa.billingPlans.action.publish")}
                                                        </DropdownMenuItem>
                                                    )}
                                                    {plan.status !== "archived" && (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                setConfirmAction({ plan, action: "archive" })
                                                            }
                                                            className="text-red-600"
                                                        >
                                                            <Archive className="mr-2 h-4 w-4" />{" "}
                                                            {t("sa.billingPlans.action.archive")}
                                                        </DropdownMenuItem>
                                                    )}
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

            {/* Create/Edit Plan Dialog */}
            <PlanEditorDialog
                plan={editPlan}
                open={showCreate || !!editPlan}
                onClose={() => {
                    setShowCreate(false);
                    setEditPlan(null);
                }}
                onSave={fetchPlans}
            />

            {/* Confirm Action Dialog */}
            <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmAction?.action === "publish"
                                ? t("sa.billingPlans.confirm.publishTitle")
                                : t("sa.billingPlans.confirm.archiveTitle")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmAction?.action === "publish"
                                ? t("sa.billingPlans.confirm.publishDesc", { name: confirmAction?.plan.name ?? "" })
                                : t("sa.billingPlans.confirm.archiveDesc", { name: confirmAction?.plan.name ?? "" })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (confirmAction?.action === "publish") {
                                    handlePublish(confirmAction.plan);
                                } else if (confirmAction?.action === "archive") {
                                    handleArchive(confirmAction.plan);
                                }
                            }}
                            className={confirmAction?.action === "archive" ? "bg-red-600 hover:bg-red-700" : ""}
                        >
                            {confirmAction?.action === "publish"
                                ? t("sa.billingPlans.action.publish")
                                : t("sa.billingPlans.action.archive")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ============================================
// PLAN EDITOR DIALOG
// ============================================
function PlanEditorDialog({
    plan,
    open,
    onClose,
    onSave,
}: {
    plan: Plan | null;
    open: boolean;
    onClose: () => void;
    onSave: () => void;
}) {
    const { t } = useTranslation();
    const [form, setForm] = useState({
        name: "",
        description: "",
        isFree: false,
        currency: "USD",
        monthlyPrice: 0,
        annualPrice: 0,
        trialEnabled: false,
        trialDays: 14,
        trialEligibility: "new_customers_only" as "new_customers_only" | "all",
        maxUsers: 5,
        storageGB: 10,
        modules: [] as string[],
        badge: "",
        sortOrder: 0,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (plan) {
            setForm({
                name: plan.name,
                description: plan.description || "",
                isFree: plan.isFree,
                currency: plan.currency || "USD",
                monthlyPrice: plan.billing?.monthlyPrice || 0,
                annualPrice: plan.billing?.annualPrice || 0,
                trialEnabled: plan.trial?.enabled || false,
                trialDays: plan.trial?.days || 14,
                trialEligibility: plan.trial?.eligibility || "new_customers_only",
                maxUsers: plan.limits?.maxUsers || 5,
                storageGB: plan.limits?.storageGB || 10,
                modules: plan.entitlements?.modules || [],
                badge: plan.ui?.badge || "",
                sortOrder: plan.ui?.sortOrder || 0,
            });
        } else {
            setForm({
                name: "",
                description: "",
                isFree: false,
                currency: "USD",
                monthlyPrice: 0,
                annualPrice: 0,
                trialEnabled: false,
                trialDays: 14,
                trialEligibility: "new_customers_only",
                maxUsers: 5,
                storageGB: 10,
                modules: [],
                badge: "",
                sortOrder: 0,
            });
        }
    }, [plan]);

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error(t("sa.billingPlans.toast.nameRequired"));
            return;
        }

        try {
            setSaving(true);
            const payload = {
                name: form.name,
                description: form.description,
                isFree: form.isFree,
                currency: form.currency,
                billing: {
                    monthlyPrice: form.isFree ? 0 : form.monthlyPrice,
                    annualPrice: form.isFree ? 0 : form.annualPrice,
                },
                trial: {
                    enabled: form.trialEnabled,
                    days: form.trialDays,
                    eligibility: form.trialEligibility,
                },
                limits: {
                    maxUsers: form.maxUsers,
                    storageGB: form.storageGB,
                },
                entitlements: {
                    modules: form.modules,
                    featuresByModule: {},
                },
                ui: {
                    badge: form.badge || undefined,
                    sortOrder: form.sortOrder,
                },
            };

            if (plan) {
                await saPatch(`/api/sa/billing/plans/${plan.id}`, payload);
                toast.success(t("sa.billingPlans.toast.planUpdated"));
            } else {
                await saPost("/api/sa/billing/plans", payload);
                toast.success(t("sa.billingPlans.toast.planCreated"));
            }
            onSave();
            onClose();
        } catch (err: unknown) {
            toast.error((err as Error).message || String(err));
        } finally {
            setSaving(false);
        }
    };

    const toggleModule = (moduleKey: string) => {
        setForm((prev) => ({
            ...prev,
            modules: prev.modules.includes(moduleKey)
                ? prev.modules.filter((m) => m !== moduleKey)
                : [...prev.modules, moduleKey],
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {plan ? t("sa.billingPlans.editor.editTitle") : t("sa.billingPlans.editor.createTitle")}
                    </DialogTitle>
                    <DialogDescription>
                        {plan
                            ? t("sa.billingPlans.editor.editDesc")
                            : t("sa.billingPlans.editor.createDesc")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground">
                            {t("sa.billingPlans.editor.basicInfo")}
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("sa.billingPlans.editor.planName")}</Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                    placeholder={t("sa.billingPlans.editor.planNamePlaceholder")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("sa.billingPlans.editor.badge")}</Label>
                                <Input
                                    value={form.badge}
                                    onChange={(e) => setForm((p) => ({ ...p, badge: e.target.value }))}
                                    placeholder={t("sa.billingPlans.editor.badgePlaceholder")}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t("sa.billingPlans.editor.description")}</Label>
                            <Input
                                value={form.description}
                                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                placeholder={t("sa.billingPlans.editor.descriptionPlaceholder")}
                            />
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground">
                            {t("sa.billingPlans.editor.pricing")}
                        </h4>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={form.isFree}
                                onCheckedChange={(c) => setForm((p) => ({ ...p, isFree: c }))}
                            />
                            <Label>{t("sa.billingPlans.editor.freePlan")}</Label>
                        </div>
                        {!form.isFree && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("sa.billingPlans.editor.monthlyPrice")}</Label>
                                    <Input
                                        type="number"
                                        value={form.monthlyPrice}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, monthlyPrice: parseInt(e.target.value) || 0 }))
                                        }
                                        placeholder="4900 = $49.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("sa.billingPlans.editor.annualPrice")}</Label>
                                    <Input
                                        type="number"
                                        value={form.annualPrice}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, annualPrice: parseInt(e.target.value) || 0 }))
                                        }
                                        placeholder="49900 = $499.00"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Trial */}
                    <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground">
                            {t("sa.billingPlans.editor.trialSettings")}
                        </h4>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={form.trialEnabled}
                                onCheckedChange={(c) => setForm((p) => ({ ...p, trialEnabled: c }))}
                            />
                            <Label>{t("sa.billingPlans.editor.enableTrial")}</Label>
                        </div>
                        {form.trialEnabled && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("sa.billingPlans.editor.trialDays")}</Label>
                                    <Input
                                        type="number"
                                        value={form.trialDays}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, trialDays: parseInt(e.target.value) || 14 }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("sa.billingPlans.editor.eligibility")}</Label>
                                    <Select
                                        value={form.trialEligibility}
                                        onValueChange={(v) =>
                                            setForm((p) => ({
                                                ...p,
                                                trialEligibility: v as "new_customers_only" | "all",
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new_customers_only">
                                                {t("sa.billingPlans.editor.newCustomersOnly")}
                                            </SelectItem>
                                            <SelectItem value="all">
                                                {t("sa.billingPlans.editor.allCustomers")}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Limits */}
                    <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground">
                            {t("sa.billingPlans.editor.limits")}
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("sa.billingPlans.editor.maxUsers")}</Label>
                                <Input
                                    type="number"
                                    value={form.maxUsers}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, maxUsers: parseInt(e.target.value) || 0 }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("sa.billingPlans.editor.storageGb")}</Label>
                                <Input
                                    type="number"
                                    value={form.storageGB}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, storageGB: parseInt(e.target.value) || 0 }))
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* Modules */}
                    <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground">
                            {t("sa.billingPlans.editor.includedModules")}
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                            {MODULE_FEATURES_SCHEMA.map((mod) => (
                                <div
                                    key={mod.moduleKey}
                                    onClick={() => toggleModule(mod.moduleKey)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                        form.modules.includes(mod.moduleKey)
                                            ? "border-primary bg-primary/5"
                                            : "border-muted hover:border-muted-foreground/50"
                                    }`}
                                >
                                    <div className="font-medium text-sm">{mod.moduleName}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {t("sa.billingPlans.featuresCount", { count: mod.features.length })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving
                            ? t("common.saving")
                            : plan
                              ? t("common.saveChanges")
                              : t("sa.billingPlans.createPlan")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================
// ADDONS TAB
// ============================================
function AddonsTab() {
    const { t } = useTranslation();
    const [addons, setAddons] = useState<Addon[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editAddon, setEditAddon] = useState<Addon | null>(null);

    useEffect(() => {
        fetchAddons();
    }, []);

    const fetchAddons = async () => {
        try {
            setLoading(true);
            const data = await saGet<{ addons: Addon[] }>("/api/sa/billing/addons");
            setAddons(data.addons || []);
        } catch (err: unknown) {
            toast.error((err as Error).message || String(err));
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivate = async (addon: Addon) => {
        try {
            await saPost(`/api/sa/billing/addons/${addon.id}/deactivate`, {});
            toast.success(t("sa.billingPlans.toast.addonDeactivated"));
            fetchAddons();
        } catch (err: unknown) {
            toast.error((err as Error).message || String(err));
        }
    };

    const typeLabels: Record<string, string> = {
        extra_users: t("sa.billingPlans.addonType.extra_users"),
        extra_storage: t("sa.billingPlans.addonType.extra_storage"),
        feature_pack: t("sa.billingPlans.addonType.feature_pack"),
        module_pack: t("sa.billingPlans.addonType.module_pack"),
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">{t("sa.billingPlans.addons.intro")}</div>
                <Button onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4 mr-2" /> {t("sa.billingPlans.addons.create")}
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("sa.billingPlans.addons.col.addon")}</TableHead>
                                <TableHead>{t("sa.billingPlans.addons.col.type")}</TableHead>
                                <TableHead>{t("sa.billingPlans.col.status")}</TableHead>
                                <TableHead>{t("sa.billingPlans.col.monthly")}</TableHead>
                                <TableHead>{t("sa.billingPlans.addons.col.effect")}</TableHead>
                                <TableHead className="w-12"></TableHead>
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
                                            <Skeleton className="h-4 w-16" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-24" />
                                        </TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                ))
                            ) : addons.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Package className="h-8 w-8 opacity-50" />
                                            <p>{t("sa.billingPlans.addons.empty.none")}</p>
                                            <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
                                                {t("sa.billingPlans.addons.empty.createFirst")}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                addons.map((addon) => (
                                    <TableRow key={addon.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{addon.name}</div>
                                                <div className="text-xs text-muted-foreground">{addon.description}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{typeLabels[addon.type]}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={
                                                    addon.status === "active"
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-gray-100 text-gray-600"
                                                }
                                            >
                                                {t(`sa.billingPlans.addonStatus.${addon.status}`)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>${((addon.pricing?.monthlyPrice || 0) / 100).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {addon.effect?.addUsers && (
                                                    <div>
                                                        {t("sa.billingPlans.effect.addUsers", {
                                                            count: addon.effect.addUsers,
                                                        })}
                                                    </div>
                                                )}
                                                {addon.effect?.addStorageGB && (
                                                    <div>
                                                        {t("sa.billingPlans.effect.addStorage", {
                                                            count: addon.effect.addStorageGB,
                                                        })}
                                                    </div>
                                                )}
                                                {addon.effect?.enableModules?.length && (
                                                    <div>
                                                        {t("sa.billingPlans.effect.addModules", {
                                                            count: addon.effect.enableModules.length,
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setEditAddon(addon)}>
                                                        <Edit className="mr-2 h-4 w-4" /> {t("common.edit")}
                                                    </DropdownMenuItem>
                                                    {addon.status === "active" && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeactivate(addon)}
                                                            className="text-red-600"
                                                        >
                                                            <XCircle className="mr-2 h-4 w-4" />{" "}
                                                            {t("sa.billingPlans.action.deactivate")}
                                                        </DropdownMenuItem>
                                                    )}
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

            <AddonEditorDialog
                addon={editAddon}
                open={showCreate || !!editAddon}
                onClose={() => {
                    setShowCreate(false);
                    setEditAddon(null);
                }}
                onSave={fetchAddons}
            />
        </div>
    );
}

// ============================================
// ADDON EDITOR DIALOG
// ============================================
function AddonEditorDialog({
    addon,
    open,
    onClose,
    onSave,
}: {
    addon: Addon | null;
    open: boolean;
    onClose: () => void;
    onSave: () => void;
}) {
    const { t } = useTranslation();
    const [form, setForm] = useState({
        name: "",
        description: "",
        type: "extra_users" as Addon["type"],
        monthlyPrice: 0,
        annualPrice: 0,
        addUsers: 0,
        addStorageGB: 0,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (addon) {
            setForm({
                name: addon.name,
                description: addon.description || "",
                type: addon.type,
                monthlyPrice: addon.pricing?.monthlyPrice || 0,
                annualPrice: addon.pricing?.annualPrice || 0,
                addUsers: addon.effect?.addUsers || 0,
                addStorageGB: addon.effect?.addStorageGB || 0,
            });
        } else {
            setForm({
                name: "",
                description: "",
                type: "extra_users",
                monthlyPrice: 0,
                annualPrice: 0,
                addUsers: 0,
                addStorageGB: 0,
            });
        }
    }, [addon]);

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error(t("sa.billingPlans.toast.addonNameRequired"));
            return;
        }

        try {
            setSaving(true);
            const payload = {
                name: form.name,
                description: form.description,
                type: form.type,
                pricing: {
                    monthlyPrice: form.monthlyPrice,
                    annualPrice: form.annualPrice,
                    currency: "USD",
                },
                effect: {
                    addUsers: form.addUsers || undefined,
                    addStorageGB: form.addStorageGB || undefined,
                },
            };

            if (addon) {
                await saPatch(`/api/sa/billing/addons/${addon.id}`, payload);
                toast.success(t("sa.billingPlans.toast.addonUpdated"));
            } else {
                await saPost("/api/sa/billing/addons", payload);
                toast.success(t("sa.billingPlans.toast.addonCreated"));
            }
            onSave();
            onClose();
        } catch (err: unknown) {
            toast.error((err as Error).message || String(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {addon
                            ? t("sa.billingPlans.addonEditor.editTitle")
                            : t("sa.billingPlans.addonEditor.createTitle")}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>{t("sa.billingPlans.addonEditor.name")}</Label>
                        <Input
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                            placeholder={t("sa.billingPlans.addonEditor.namePlaceholder")}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t("sa.billingPlans.editor.description")}</Label>
                        <Input
                            value={form.description}
                            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t("sa.billingPlans.addonEditor.type")}</Label>
                        <Select
                            value={form.type}
                            onValueChange={(v) => setForm((p) => ({ ...p, type: v as Addon["type"] }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="extra_users">
                                    {t("sa.billingPlans.addonType.extra_users")}
                                </SelectItem>
                                <SelectItem value="extra_storage">
                                    {t("sa.billingPlans.addonType.extra_storage")}
                                </SelectItem>
                                <SelectItem value="feature_pack">
                                    {t("sa.billingPlans.addonType.feature_pack")}
                                </SelectItem>
                                <SelectItem value="module_pack">
                                    {t("sa.billingPlans.addonType.module_pack")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t("sa.billingPlans.editor.monthlyPrice")}</Label>
                            <Input
                                type="number"
                                value={form.monthlyPrice}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, monthlyPrice: parseInt(e.target.value) || 0 }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("sa.billingPlans.editor.annualPrice")}</Label>
                            <Input
                                type="number"
                                value={form.annualPrice}
                                onChange={(e) => setForm((p) => ({ ...p, annualPrice: parseInt(e.target.value) || 0 }))}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t("sa.billingPlans.addonEditor.addUsers")}</Label>
                            <Input
                                type="number"
                                value={form.addUsers}
                                onChange={(e) => setForm((p) => ({ ...p, addUsers: parseInt(e.target.value) || 0 }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("sa.billingPlans.addonEditor.addStorage")}</Label>
                            <Input
                                type="number"
                                value={form.addStorageGB}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, addStorageGB: parseInt(e.target.value) || 0 }))
                                }
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? t("common.saving") : addon ? t("common.save") : t("common.create")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================
// SUBSCRIPTIONS TAB
// ============================================
function SubscriptionsTab() {
    const { t } = useTranslation();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        fetchSubscriptions();
    }, [statusFilter]);

    const fetchSubscriptions = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter !== "all") params.set("status", statusFilter);

            const data = await saGet<{ subscriptions: Subscription[] }>(`/api/sa/billing/subscriptions?${params}`);
            setSubscriptions(data.subscriptions || []);
        } catch (err: unknown) {
            toast.error((err as Error).message || String(err));
        } finally {
            setLoading(false);
        }
    };

    const statusColors: Record<string, string> = {
        trialing: "bg-blue-100 text-blue-800",
        active: "bg-green-100 text-green-800",
        past_due: "bg-yellow-100 text-yellow-800",
        suspended: "bg-red-100 text-red-800",
        canceled: "bg-gray-100 text-gray-600",
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-4 items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder={t("sa.billingPlans.filter.status")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("sa.billingPlans.filter.allStatus")}</SelectItem>
                        <SelectItem value="trialing">{t("sa.billingPlans.subStatus.trialing")}</SelectItem>
                        <SelectItem value="active">{t("sa.billingPlans.subStatus.active")}</SelectItem>
                        <SelectItem value="past_due">{t("sa.billingPlans.subStatus.past_due")}</SelectItem>
                        <SelectItem value="suspended">{t("sa.billingPlans.subStatus.suspended")}</SelectItem>
                        <SelectItem value="canceled">{t("sa.billingPlans.subStatus.canceled")}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("sa.billingPlans.subs.col.tenant")}</TableHead>
                                <TableHead>{t("sa.billingPlans.col.plan")}</TableHead>
                                <TableHead>{t("sa.billingPlans.col.status")}</TableHead>
                                <TableHead>{t("sa.billingPlans.subs.col.cycle")}</TableHead>
                                <TableHead>{t("sa.billingPlans.tabs.addons")}</TableHead>
                                <TableHead>{t("sa.billingPlans.subs.col.periodEnd")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
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
                                            <Skeleton className="h-4 w-16" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-8" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-24" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : subscriptions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Users className="h-8 w-8 opacity-50" />
                                            <p>{t("sa.billingPlans.subs.empty")}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                subscriptions.map((sub) => (
                                    <TableRow key={sub.tenantId}>
                                        <TableCell className="font-mono text-sm">{sub.tenantId}</TableCell>
                                        <TableCell>{sub.planId}</TableCell>
                                        <TableCell>
                                            <Badge className={statusColors[sub.status]}>
                                                {t(`sa.billingPlans.subStatus.${sub.status}`)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{sub.billingCycle}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{sub.addons?.length || 0}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {sub.currentPeriodEnd
                                                ? new Date(
                                                      (sub.currentPeriodEnd as unknown as { _seconds: number })
                                                          ._seconds * 1000
                                                  ).toLocaleDateString()
                                                : "—"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================
// USAGE TAB
// ============================================
function UsageTab() {
    const { t } = useTranslation();
    const [exceeded, setExceeded] = useState<UsageExceeded[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExceeded();
    }, []);

    const fetchExceeded = async () => {
        try {
            setLoading(true);
            const data = await saGet<{ exceeded: UsageExceeded[] }>("/api/sa/billing/usage/exceeded");
            setExceeded(data.exceeded || []);
        } catch (err: unknown) {
            toast.error((err as Error).message || String(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="text-sm text-muted-foreground">{t("sa.billingPlans.usage.intro")}</div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("sa.billingPlans.subs.col.tenant")}</TableHead>
                                <TableHead>{t("sa.billingPlans.usage.col.severity")}</TableHead>
                                <TableHead>{t("sa.billingPlans.usage.col.users")}</TableHead>
                                <TableHead>{t("sa.billingPlans.usage.col.storage")}</TableHead>
                                <TableHead>{t("sa.billingPlans.usage.col.actions")}</TableHead>
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
                                            <Skeleton className="h-4 w-16" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-24" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-24" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-20" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : exceeded.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <CheckCircle className="h-8 w-8 text-green-500" />
                                            <p>{t("sa.billingPlans.usage.empty")}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                exceeded.map((item) => (
                                    <TableRow key={item.tenantId}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{item.tenantName}</div>
                                                <div className="text-xs text-muted-foreground font-mono">
                                                    {item.tenantId}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={
                                                    item.severity === "critical"
                                                        ? "bg-red-100 text-red-800"
                                                        : "bg-yellow-100 text-yellow-800"
                                                }
                                            >
                                                {item.severity === "critical" ? (
                                                    <>
                                                        <AlertTriangle className="h-3 w-3 mr-1" />{" "}
                                                        {t("sa.billingPlans.usage.critical")}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock className="h-3 w-3 mr-1" />{" "}
                                                        {t("sa.billingPlans.usage.warning")}
                                                    </>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {item.exceeded.users ? (
                                                <span className="text-red-600">
                                                    {item.exceeded.users.current}/{item.exceeded.users.limit}
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {item.exceeded.storage ? (
                                                <span className="text-red-600">
                                                    {t("sa.billingPlans.usage.gbValue", {
                                                        current: item.exceeded.storage.current.toFixed(1),
                                                        limit: item.exceeded.storage.limit,
                                                    })}
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm">
                                                <DollarSign className="h-3 w-3 mr-1" />{" "}
                                                {t("sa.billingPlans.usage.upsell")}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

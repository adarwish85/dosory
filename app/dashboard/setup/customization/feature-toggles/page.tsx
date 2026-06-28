"use client";

import { useState, useEffect } from "react";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RefreshCw, Boxes, LayoutDashboard, Users, FileText, DollarSign, Briefcase, Headphones, TrendingUp, Calendar, ClipboardList, Settings, Package, FileCheck, PieChart, MessageSquare, Bell, Megaphone, Receipt, Building2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface ModuleConfig {
    id: string;
    nameKey: string;
    descriptionKey: string;
    icon: React.ReactNode;
    category: "core" | "sales" | "finance" | "support" | "operations";
    isCore?: boolean; // Core modules cannot be disabled
}

const MODULES: ModuleConfig[] = [
    // Core Modules
    { id: "dashboard", nameKey: "setup.featureToggles.moduleDashboard", descriptionKey: "setup.featureToggles.moduleDashboardDesc", icon: <LayoutDashboard className="h-5 w-5" />, category: "core", isCore: true },
    { id: "customers", nameKey: "setup.featureToggles.moduleCustomers", descriptionKey: "setup.featureToggles.moduleCustomersDesc", icon: <Users className="h-5 w-5" />, category: "core", isCore: true },
    { id: "staff", nameKey: "setup.featureToggles.moduleStaff", descriptionKey: "setup.featureToggles.moduleStaffDesc", icon: <Building2 className="h-5 w-5" />, category: "core", isCore: true },

    // Sales Modules
    { id: "leads", nameKey: "setup.featureToggles.moduleLeads", descriptionKey: "setup.featureToggles.moduleLeadsDesc", icon: <TrendingUp className="h-5 w-5" />, category: "sales" },
    { id: "estimates", nameKey: "setup.featureToggles.moduleEstimates", descriptionKey: "setup.featureToggles.moduleEstimatesDesc", icon: <FileCheck className="h-5 w-5" />, category: "sales" },
    { id: "contracts", nameKey: "setup.featureToggles.moduleContracts", descriptionKey: "setup.featureToggles.moduleContractsDesc", icon: <ClipboardList className="h-5 w-5" />, category: "sales" },

    // Finance Modules
    { id: "invoices", nameKey: "setup.featureToggles.moduleInvoices", descriptionKey: "setup.featureToggles.moduleInvoicesDesc", icon: <Receipt className="h-5 w-5" />, category: "finance" },
    { id: "payments", nameKey: "setup.featureToggles.modulePayments", descriptionKey: "setup.featureToggles.modulePaymentsDesc", icon: <DollarSign className="h-5 w-5" />, category: "finance" },
    { id: "expenses", nameKey: "setup.featureToggles.moduleExpenses", descriptionKey: "setup.featureToggles.moduleExpensesDesc", icon: <PieChart className="h-5 w-5" />, category: "finance" },
    { id: "credit_notes", nameKey: "setup.featureToggles.moduleCreditNotes", descriptionKey: "setup.featureToggles.moduleCreditNotesDesc", icon: <FileText className="h-5 w-5" />, category: "finance" },

    // Operations Modules
    { id: "projects", nameKey: "setup.featureToggles.moduleProjects", descriptionKey: "setup.featureToggles.moduleProjectsDesc", icon: <Briefcase className="h-5 w-5" />, category: "operations" },
    { id: "tasks", nameKey: "setup.featureToggles.moduleTasks", descriptionKey: "setup.featureToggles.moduleTasksDesc", icon: <ClipboardList className="h-5 w-5" />, category: "operations" },
    { id: "calendar", nameKey: "setup.featureToggles.moduleCalendar", descriptionKey: "setup.featureToggles.moduleCalendarDesc", icon: <Calendar className="h-5 w-5" />, category: "operations" },

    // Support Modules
    { id: "support", nameKey: "setup.featureToggles.moduleSupport", descriptionKey: "setup.featureToggles.moduleSupportDesc", icon: <Headphones className="h-5 w-5" />, category: "support" },
    { id: "knowledge_base", nameKey: "setup.featureToggles.moduleKnowledgeBase", descriptionKey: "setup.featureToggles.moduleKnowledgeBaseDesc", icon: <MessageSquare className="h-5 w-5" />, category: "support" },
    { id: "announcements", nameKey: "setup.featureToggles.moduleAnnouncements", descriptionKey: "setup.featureToggles.moduleAnnouncementsDesc", icon: <Megaphone className="h-5 w-5" />, category: "support" },
    { id: "notifications", nameKey: "setup.featureToggles.moduleNotifications", descriptionKey: "setup.featureToggles.moduleNotificationsDesc", icon: <Bell className="h-5 w-5" />, category: "support" },
];

const CATEGORY_LABELS: Record<string, { labelKey: string; color: string }> = {
    core: { labelKey: "setup.featureToggles.categoryCore", color: "bg-blue-100 text-blue-700" },
    sales: { labelKey: "setup.featureToggles.categorySales", color: "bg-green-100 text-green-700" },
    finance: { labelKey: "setup.featureToggles.categoryFinance", color: "bg-yellow-100 text-yellow-700" },
    operations: { labelKey: "setup.featureToggles.categoryOperations", color: "bg-purple-100 text-purple-700" },
    support: { labelKey: "setup.featureToggles.categorySupport", color: "bg-orange-100 text-orange-700" },
};

export default function ModulesPage() {
    const { t } = useTranslation();
    const { profile } = useUserProfile();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({});
    const [hasChanges, setHasChanges] = useState(false);

    // Load module config from Firestore
    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const loadModuleConfig = async () => {
            try {
                const docRef = doc(db, "organizations", profile.orgId, "settings", "modules");
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setEnabledModules(docSnap.data().enabled || {});
                } else {
                    // Default: all modules enabled
                    const defaultEnabled: Record<string, boolean> = {};
                    MODULES.forEach(m => {
                        defaultEnabled[m.id] = true;
                    });
                    setEnabledModules(defaultEnabled);
                }
            } catch (error) {
                console.error("Error loading module config:", error);
                toast.error(t("setup.featureToggles.loadError"));
            } finally {
                setLoading(false);
            }
        };

        loadModuleConfig();
    }, [profile?.orgId, t]);

    const handleToggle = (moduleId: string, enabled: boolean) => {
        setEnabledModules(prev => ({ ...prev, [moduleId]: enabled }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!profile?.orgId) return;

        setSaving(true);
        try {
            const docRef = doc(db, "organizations", profile.orgId, "settings", "modules");
            await setDoc(docRef, {
                enabled: enabledModules,
                updatedAt: serverTimestamp(),
                updatedBy: profile.uid,
            }, { merge: true });

            toast.success(t("setup.featureToggles.saveSuccess"));
            setHasChanges(false);
        } catch (error) {
            console.error("Error saving module config:", error);
            toast.error(t("setup.featureToggles.saveError"));
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        const defaultEnabled: Record<string, boolean> = {};
        MODULES.forEach(m => {
            defaultEnabled[m.id] = true;
        });
        setEnabledModules(defaultEnabled);
        setHasChanges(true);
    };

    const groupedModules = MODULES.reduce((acc, module) => {
        if (!acc[module.category]) acc[module.category] = [];
        acc[module.category].push(module);
        return acc;
    }, {} as Record<string, ModuleConfig[]>);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Boxes className="h-6 w-6 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">{t("setup.featureToggles.title")}</h1>
                        <p className="text-sm text-gray-500">{t("setup.featureToggles.subtitle")}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t("setup.featureToggles.resetToDefault")}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        {t("common.saveChanges")}
                    </Button>
                </div>
            </div>

            {/* Info Banner */}
            {hasChanges && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <p className="text-sm text-amber-800">
                        {t("setup.featureToggles.unsavedChanges")}
                    </p>
                </div>
            )}

            {/* Module Categories */}
            <div className="space-y-8">
                {Object.entries(groupedModules).map(([category, modules]) => (
                    <div key={category}>
                        <div className="flex items-center gap-2 mb-4">
                            <Badge className={cn("font-normal", CATEGORY_LABELS[category].color)}>
                                {t(CATEGORY_LABELS[category].labelKey)}
                            </Badge>
                            <span className="text-sm text-gray-500">
                                {t("setup.featureToggles.enabledCount", {
                                    count: modules.filter(m => enabledModules[m.id]).length,
                                    total: modules.length,
                                })}
                            </span>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {modules.map((module) => (
                                <Card
                                    key={module.id}
                                    className={cn(
                                        "transition-all",
                                        enabledModules[module.id] ? "bg-white" : "bg-gray-50 opacity-75"
                                    )}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-2 rounded-lg",
                                                    enabledModules[module.id] ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"
                                                )}>
                                                    {module.icon}
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base font-medium">
                                                        {t(module.nameKey)}
                                                    </CardTitle>
                                                    {module.isCore && (
                                                        <Badge variant="secondary" className="text-[10px] py-0 mt-1">
                                                            {t("setup.featureToggles.required")}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <Switch
                                                checked={enabledModules[module.id] ?? true}
                                                onCheckedChange={(checked) => handleToggle(module.id, checked)}
                                                disabled={module.isCore}
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription className="text-sm">
                                            {t(module.descriptionKey)}
                                        </CardDescription>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary Footer */}
            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                    {t("setup.featureToggles.modulesEnabledSummary", {
                        count: Object.values(enabledModules).filter(Boolean).length,
                        total: MODULES.length,
                    })}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                >
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t("setup.featureToggles.saveConfiguration")}
                </Button>
            </div>
        </div>
    );
}

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

interface ModuleConfig {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    category: "core" | "sales" | "finance" | "support" | "operations";
    isCore?: boolean; // Core modules cannot be disabled
}

const MODULES: ModuleConfig[] = [
    // Core Modules
    { id: "dashboard", name: "Dashboard", description: "Main dashboard with analytics and widgets", icon: <LayoutDashboard className="h-5 w-5" />, category: "core", isCore: true },
    { id: "customers", name: "Customers", description: "Customer management and contacts", icon: <Users className="h-5 w-5" />, category: "core", isCore: true },
    { id: "staff", name: "Staff", description: "Team member management and roles", icon: <Building2 className="h-5 w-5" />, category: "core", isCore: true },

    // Sales Modules
    { id: "leads", name: "Leads", description: "Lead tracking and conversion pipeline", icon: <TrendingUp className="h-5 w-5" />, category: "sales" },
    { id: "estimates", name: "Estimates", description: "Generate cost estimates for projects", icon: <FileCheck className="h-5 w-5" />, category: "sales" },
    { id: "contracts", name: "Contracts", description: "Contract management and e-signatures", icon: <ClipboardList className="h-5 w-5" />, category: "sales" },

    // Finance Modules
    { id: "invoices", name: "Invoices", description: "Invoice generation and payment tracking", icon: <Receipt className="h-5 w-5" />, category: "finance" },
    { id: "payments", name: "Payments", description: "Payment processing and records", icon: <DollarSign className="h-5 w-5" />, category: "finance" },
    { id: "expenses", name: "Expenses", description: "Track and manage business expenses", icon: <PieChart className="h-5 w-5" />, category: "finance" },
    { id: "credit_notes", name: "Credit Notes", description: "Issue and manage credit notes", icon: <FileText className="h-5 w-5" />, category: "finance" },

    // Operations Modules
    { id: "projects", name: "Projects", description: "Project management with tasks and milestones", icon: <Briefcase className="h-5 w-5" />, category: "operations" },
    { id: "tasks", name: "Tasks", description: "Task assignment and tracking", icon: <ClipboardList className="h-5 w-5" />, category: "operations" },
    { id: "calendar", name: "Calendar", description: "Appointments and event scheduling", icon: <Calendar className="h-5 w-5" />, category: "operations" },

    // Support Modules
    { id: "support", name: "Support Tickets", description: "Customer support ticketing system", icon: <Headphones className="h-5 w-5" />, category: "support" },
    { id: "knowledge_base", name: "Knowledge Base", description: "Self-service help articles", icon: <MessageSquare className="h-5 w-5" />, category: "support" },
    { id: "announcements", name: "Announcements", description: "Broadcast announcements to users", icon: <Megaphone className="h-5 w-5" />, category: "support" },
    { id: "notifications", name: "Notifications", description: "System notification preferences", icon: <Bell className="h-5 w-5" />, category: "support" },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
    core: { label: "Core", color: "bg-blue-100 text-blue-700" },
    sales: { label: "Sales & CRM", color: "bg-green-100 text-green-700" },
    finance: { label: "Finance", color: "bg-yellow-100 text-yellow-700" },
    operations: { label: "Operations", color: "bg-purple-100 text-purple-700" },
    support: { label: "Support", color: "bg-orange-100 text-orange-700" },
};

export default function ModulesPage() {
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
                toast.error("Failed to load module configuration");
            } finally {
                setLoading(false);
            }
        };

        loadModuleConfig();
    }, [profile?.orgId]);

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

            toast.success("Module configuration saved successfully");
            setHasChanges(false);
        } catch (error) {
            console.error("Error saving module config:", error);
            toast.error("Failed to save module configuration");
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
                        <h1 className="text-2xl font-semibold text-gray-900">Modules</h1>
                        <p className="text-sm text-gray-500">Enable or disable system modules for your organization</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset to Default
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
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Info Banner */}
            {hasChanges && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <p className="text-sm text-amber-800">
                        You have unsaved changes. Click &quot;Save Changes&quot; to apply your configuration.
                    </p>
                </div>
            )}

            {/* Module Categories */}
            <div className="space-y-8">
                {Object.entries(groupedModules).map(([category, modules]) => (
                    <div key={category}>
                        <div className="flex items-center gap-2 mb-4">
                            <Badge className={cn("font-normal", CATEGORY_LABELS[category].color)}>
                                {CATEGORY_LABELS[category].label}
                            </Badge>
                            <span className="text-sm text-gray-500">
                                {modules.filter(m => enabledModules[m.id]).length} of {modules.length} enabled
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
                                                        {module.name}
                                                    </CardTitle>
                                                    {module.isCore && (
                                                        <Badge variant="secondary" className="text-[10px] py-0 mt-1">
                                                            Required
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
                                            {module.description}
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
                    <span className="font-medium">{Object.values(enabledModules).filter(Boolean).length}</span> of{" "}
                    <span className="font-medium">{MODULES.length}</span> modules enabled
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                >
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Configuration
                </Button>
            </div>
        </div>
    );
}

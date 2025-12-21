"use client";

import { useState, useEffect } from "react";
import { usePlatformSubscriptions } from "@/lib/hooks/use-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
    CreditCard, Search, DollarSign, CheckCircle, Clock, XCircle, Calendar,
    Plus, Loader2, Trash2, Edit, Package, Users, Star, ArrowRight, ArrowLeft, Gift, Save
} from "lucide-react";
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Available modules for plans
const AVAILABLE_MODULES = [
    { id: "customers", name: "Customer Management", description: "Manage customers and contacts" },
    { id: "leads", name: "Lead Management", description: "Track and nurture leads" },
    { id: "invoices", name: "Invoicing", description: "Create and send invoices" },
    { id: "estimates", name: "Estimates", description: "Create project estimates" },
    { id: "proposals", name: "Proposals", description: "Send professional proposals" },
    { id: "projects", name: "Project Management", description: "Manage projects and milestones" },
    { id: "tasks", name: "Tasks", description: "Task management system" },
    { id: "support", name: "Support Tickets", description: "Customer support system" },
    { id: "contracts", name: "Contracts", description: "Contract management" },
    { id: "subscriptions", name: "Subscriptions", description: "Recurring billing" },
    { id: "reports", name: "Reports & Analytics", description: "Advanced reporting" },
];

export interface SubscriptionPlan {
    id: string;
    name: string;
    description: string;
    prices: {
        monthly: number;
        yearly: number;
    };
    quotas: {
        invoices: number;
        estimates: number;
        creditNotes: number;
        proposals: number;
        clients: number;
        contacts: number;
        staff: number;
        projects: number;
        tasks: number;
        tickets: number;
        leads: number;
    };
    capabilities: {
        customDomain: boolean;
        subdomain: boolean;
        autoApproveDomain: boolean;
        clientPortal: boolean; // New capability
    };
    features: string[]; // Display features list
    modules: string[];
    isPopular: boolean;
    isActive: boolean;
    sortOrder: number;
}

const defaultPlan: Omit<SubscriptionPlan, "id"> = {
    name: "",
    description: "",
    prices: {
        monthly: 0,
        yearly: 0,
    },
    quotas: {
        invoices: 50,
        estimates: -1,
        creditNotes: -1,
        proposals: -1,
        clients: 20,
        contacts: -1,
        staff: 2,
        projects: -1,
        tasks: -1,
        tickets: -1,
        leads: -1,
    },
    capabilities: {
        customDomain: false,
        subdomain: true,
        autoApproveDomain: false,
        clientPortal: false,
    },
    features: [],
    modules: [],
    isPopular: false,
    isActive: true,
    sortOrder: 0,
};

// Mapping Modules to Quota Keys
const MODULE_QUOTA_MAP: Record<string, keyof SubscriptionPlan['quotas']> = {
    'invoices': 'invoices',
    'estimates': 'estimates',
    'clients': 'clients',
    'projects': 'projects',
    'tasks': 'tasks',
    'leads': 'leads',
    // Add others if needed
};

interface TrialSettings {
    durationDays: number;
    modules: string[];
    maxUsers: number;
    features: string[];
    isEnabled: boolean;
}

const defaultTrialSettings: TrialSettings = {
    durationDays: 14,
    modules: AVAILABLE_MODULES.map(m => m.id),
    maxUsers: 3,
    features: ["Full access to all features", "No credit card required", "Cancel anytime"],
    isEnabled: true,
};

export default function SubscriptionsPage() {
    const { subscriptions, loading: subsLoading } = usePlatformSubscriptions();
    const [activeTab, setActiveTab] = useState("plans");

    // Plans state
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [plansLoading, setPlansLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
    const [wizardStep, setWizardStep] = useState(1);
    const [planData, setPlanData] = useState<Omit<SubscriptionPlan, "id">>(defaultPlan);
    const [saving, setSaving] = useState(false);
    const [featureInput, setFeatureInput] = useState("");

    // Trial settings state
    const [trialSettings, setTrialSettings] = useState<TrialSettings>(defaultTrialSettings);
    const [trialLoading, setTrialLoading] = useState(true);
    const [trialSaving, setTrialSaving] = useState(false);
    const [trialSaved, setTrialSaved] = useState(false);
    const [trialFeatureInput, setTrialFeatureInput] = useState("");

    // Load plans
    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            const plansRef = collection(db, "platform", "subscriptionPlans", "plans");
            const snapshot = await getDocs(plansRef);
            const loadedPlans = snapshot.docs.map(doc => {
                const data = doc.data();
                // Normalize old data to new structure
                return {
                    ...defaultPlan,
                    ...data,
                    id: doc.id,
                    prices: data.prices || {
                        monthly: data.price || 0,
                        yearly: (data.price || 0) * 10
                    },
                    quotas: data.quotas || defaultPlan.quotas,
                    capabilities: data.capabilities || defaultPlan.capabilities,
                } as SubscriptionPlan;
            });
            setPlans(loadedPlans.sort((a, b) => a.sortOrder - b.sortOrder));
        } catch (error) {
            console.error("Error loading plans:", error);
        } finally {
            setPlansLoading(false);
        }
    };

    // Load trial settings
    useEffect(() => {
        loadTrialSettings();
    }, []);

    const loadTrialSettings = async () => {
        try {
            const { getDoc } = await import("firebase/firestore");
            const docRef = doc(db, "platform", "trialSettings");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setTrialSettings({ ...defaultTrialSettings, ...docSnap.data() as TrialSettings });
            }
        } catch (error) {
            console.error("Error loading trial settings:", error);
        } finally {
            setTrialLoading(false);
        }
    };

    const saveTrialSettings = async () => {
        setTrialSaving(true);
        try {
            await setDoc(doc(db, "platform", "trialSettings"), {
                ...trialSettings,
                updatedAt: serverTimestamp(),
            });
            setTrialSaved(true);
            setTimeout(() => setTrialSaved(false), 3000);
        } catch (error) {
            console.error("Error saving trial settings:", error);
            alert("Failed to save trial settings");
        } finally {
            setTrialSaving(false);
        }
    };

    const toggleTrialModule = (moduleId: string) => {
        setTrialSettings(prev => ({
            ...prev,
            modules: prev.modules.includes(moduleId)
                ? prev.modules.filter(m => m !== moduleId)
                : [...prev.modules, moduleId],
        }));
    };

    const addTrialFeature = () => {
        if (trialFeatureInput.trim()) {
            setTrialSettings(prev => ({ ...prev, features: [...prev.features, trialFeatureInput.trim()] }));
            setTrialFeatureInput("");
        }
    };

    const removeTrialFeature = (index: number) => {
        setTrialSettings(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }));
    };

    const openCreateDialog = () => {
        setEditingPlan(null);
        setPlanData({ ...defaultPlan, sortOrder: plans.length });
        setWizardStep(1);
        setDialogOpen(true);
    };

    const openEditDialog = (plan: SubscriptionPlan) => {
        setEditingPlan(plan);
        setPlanData(plan);
        setWizardStep(1);
        setDialogOpen(true);
    };

    const handleSavePlan = async () => {
        if (!planData.name) return;
        setSaving(true);
        try {
            const planId = editingPlan?.id || `plan_${Date.now()}`;
            await setDoc(doc(db, "platform", "subscriptionPlans", "plans", planId), {
                ...planData,
                updatedAt: serverTimestamp(),
                ...(!editingPlan && { createdAt: serverTimestamp() }),
            });
            await loadPlans();
            setDialogOpen(false);
        } catch (error) {
            console.error("Error saving plan:", error);
            alert("Failed to save plan");
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePlan = async (planId: string) => {
        if (!confirm("Are you sure you want to delete this plan?")) return;
        try {
            await deleteDoc(doc(db, "platform", "subscriptionPlans", "plans", planId));
            await loadPlans();
        } catch (error) {
            console.error("Error deleting plan:", error);
        }
    };

    const addFeature = () => {
        if (featureInput.trim()) {
            setPlanData(prev => ({ ...prev, features: [...prev.features, featureInput.trim()] }));
            setFeatureInput("");
        }
    };

    const removeFeature = (index: number) => {
        setPlanData(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }));
    };

    const toggleModule = (moduleId: string) => {
        setPlanData(prev => ({
            ...prev,
            modules: prev.modules.includes(moduleId)
                ? prev.modules.filter(m => m !== moduleId)
                : [...prev.modules, moduleId],
        }));
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "active": return <CheckCircle className="h-4 w-4 text-green-400" />;
            case "trial": return <Clock className="h-4 w-4 text-yellow-400" />;
            case "expired":
            case "cancelled": return <XCircle className="h-4 w-4 text-red-400" />;
            default: return <Clock className="h-4 w-4 text-[#7e808c]" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#352b38]">Subscriptions</h1>
                    <p className="text-[#7e808c]">Manage subscription plans and tenant billing</p>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white border border-[#dad8f9]">
                    <TabsTrigger value="plans" className="data-[state=active]:bg-purple-600">
                        <Package className="mr-2 h-4 w-4" />
                        Subscription Plans
                    </TabsTrigger>
                    <TabsTrigger value="subscriptions" className="data-[state=active]:bg-purple-600">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Tenant Subscriptions
                    </TabsTrigger>
                    <TabsTrigger value="trial" className="data-[state=active]:bg-purple-600">
                        <Gift className="mr-2 h-4 w-4" />
                        Trial Settings
                    </TabsTrigger>
                </TabsList>

                {/* Plans Tab */}
                <TabsContent value="plans" className="space-y-6">
                    <div className="flex justify-end">
                        <Button onClick={openCreateDialog} className="bg-purple-600 hover:bg-purple-700">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Plan
                        </Button>
                    </div>

                    {plansLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                        </div>
                    ) : plans.length === 0 ? (
                        <Card className="border-0 shadow-sm rounded-2xl bg-white">
                            <CardContent className="py-12 text-center">
                                <Package className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                                <p className="text-[#7e808c] mb-4">No subscription plans created yet</p>
                                <Button onClick={openCreateDialog} className="bg-purple-600 hover:bg-purple-700">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create First Plan
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-6">
                            {plans.map((plan) => (
                                <Card key={plan.id} className={`border-0 shadow-sm rounded-2xl bg-white relative ${plan.isPopular ? 'ring-2 ring-purple-500' : ''}`}>
                                    {plan.isPopular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600 text-[#352b38] text-xs font-medium rounded-full flex items-center gap-1">
                                            <Star className="h-3 w-3" /> Popular
                                        </div>
                                    )}
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-[#352b38]">{plan.name}</h3>
                                                <p className="text-[#7e808c] text-sm mt-1">{plan.description}</p>
                                            </div>
                                            <div className={`px-2 py-1 rounded text-xs ${plan.isActive ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-[#7e808c]'}`}>
                                                {plan.isActive ? 'Active' : 'Inactive'}
                                            </div>
                                        </div>

                                        <div className="mb-6 flex flex-col gap-1">
                                            <div>
                                                <span className="text-3xl font-bold text-[#352b38]">${plan.prices.monthly}</span>
                                                <span className="text-[#7e808c]">/mo</span>
                                            </div>
                                            <div>
                                                <span className="text-lg font-medium text-gray-500">${plan.prices.yearly}</span>
                                                <span className="text-[#7e808c] text-sm">/yr</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-6">
                                            <div className="text-sm text-[#7e808c] flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                {plan.quotas.staff === -1 ? 'Unlimited staff' : `Up to ${plan.quotas.staff} staff`}
                                            </div>
                                            <div className="text-sm text-[#7e808c]">
                                                {plan.modules.length} modules included
                                            </div>
                                            <div className="text-sm text-[#7e808c]">
                                                {plan.features.length} features listed
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditDialog(plan)}
                                                className="flex-1 border-[#dad8f9] text-[#352b38]"
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDeletePlan(plan.id)}
                                                className="border-red-600/50 text-red-400 hover:bg-red-900/20"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Tenant Subscriptions Tab */}
                <TabsContent value="subscriptions" className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="border-0 shadow-sm rounded-2xl bg-white">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                                        <CheckCircle className="h-5 w-5 text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-[#7e808c] text-sm">Active</p>
                                        <p className="text-xl font-bold text-[#352b38]">
                                            {subscriptions.filter(s => s.status === "active").length}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm rounded-2xl bg-white">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
                                        <Clock className="h-5 w-5 text-yellow-400" />
                                    </div>
                                    <div>
                                        <p className="text-[#7e808c] text-sm">Trial</p>
                                        <p className="text-xl font-bold text-[#352b38]">
                                            {subscriptions.filter(s => s.status === "trial").length}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm rounded-2xl bg-white">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
                                        <XCircle className="h-5 w-5 text-red-400" />
                                    </div>
                                    <div>
                                        <p className="text-[#7e808c] text-sm">Expired</p>
                                        <p className="text-xl font-bold text-[#352b38]">
                                            {subscriptions.filter(s => s.status === "expired").length}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm rounded-2xl bg-white">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                                        <DollarSign className="h-5 w-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-[#7e808c] text-sm">MRR</p>
                                        <p className="text-xl font-bold text-[#352b38]">
                                            ${subscriptions.filter(s => s.status === "active").reduce((sum, s) => sum + s.amount, 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Search */}
                    <Card className="border-0 shadow-sm rounded-2xl bg-white">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7e808c]" />
                                    <Input
                                        placeholder="Search subscriptions..."
                                        className="pl-10 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                    />
                                </div>
                                <Button variant="outline" className="border-[#dad8f9] text-[#352b38]">
                                    All Status
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Subscriptions Table */}
                    <Card className="border-0 shadow-sm rounded-2xl bg-white">
                        <CardContent className="p-0">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[#dad8f9]">
                                        <th className="text-left p-4 text-[#7e808c] font-medium text-sm">Tenant</th>
                                        <th className="text-left p-4 text-[#7e808c] font-medium text-sm">Plan</th>
                                        <th className="text-left p-4 text-[#7e808c] font-medium text-sm">Amount</th>
                                        <th className="text-left p-4 text-[#7e808c] font-medium text-sm">Status</th>
                                        <th className="text-left p-4 text-[#7e808c] font-medium text-sm">Period</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subsLoading ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-[#7e808c]">
                                                Loading subscriptions...
                                            </td>
                                        </tr>
                                    ) : subscriptions.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-[#7e808c]">
                                                <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                                                <p>No subscriptions found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        subscriptions.map((sub) => (
                                            <tr key={sub.id} className="border-b border-[#dad8f9] hover:bg-[#f4f3f8]">
                                                <td className="p-4">
                                                    <p className="text-[#352b38] font-medium">{sub.tenantName}</p>
                                                    <p className="text-[#7e808c] text-sm">{sub.tenantId}</p>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-[#352b38] capitalize">{sub.plan}</span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-[#352b38] font-medium">
                                                        ${sub.amount}/{sub.currency === "usd" ? "mo" : sub.currency}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        {getStatusIcon(sub.status)}
                                                        <span className="text-[#352b38] capitalize">{sub.status}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-[#7e808c] text-sm flex items-center gap-2">
                                                        <Calendar className="h-4 w-4" />
                                                        {new Date(sub.startDate).toLocaleDateString()} - {new Date(sub.endDate).toLocaleDateString()}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Trial Settings Tab */}
                <TabsContent value="trial" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-[#352b38]">Free Trial Configuration</h2>
                            <p className="text-[#7e808c] text-sm">Configure the trial period for new tenant signups</p>
                        </div>
                        <Button
                            onClick={saveTrialSettings}
                            disabled={trialSaving}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {trialSaving ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                            ) : trialSaved ? (
                                <><CheckCircle className="mr-2 h-4 w-4" />Saved!</>
                            ) : (
                                <><Save className="mr-2 h-4 w-4" />Save Settings</>
                            )}
                        </Button>
                    </div>

                    {trialLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {/* Enable Trial Toggle */}
                            <Card className="border-0 shadow-sm rounded-2xl bg-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-[#352b38] text-lg">Enable Free Trial</Label>
                                            <p className="text-[#7e808c] text-sm mt-1">Allow new tenants to start with a free trial period</p>
                                        </div>
                                        <Switch
                                            checked={trialSettings.isEnabled}
                                            onCheckedChange={(checked) => setTrialSettings(prev => ({ ...prev, isEnabled: checked }))}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Duration & Limits */}
                            <Card className="border-0 shadow-sm rounded-2xl bg-white">
                                <CardContent className="p-6">
                                    <h3 className="text-[#352b38] font-medium mb-4">Duration & Limits</h3>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <Label className="text-[#352b38]">Trial Duration (Days)</Label>
                                            <Input
                                                type="number"
                                                value={trialSettings.durationDays}
                                                onChange={(e) => setTrialSettings(prev => ({ ...prev, durationDays: Number(e.target.value) }))}
                                                className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                                min={1}
                                                max={90}
                                            />
                                            <p className="text-gray-500 text-xs mt-1">Common values: 7, 14, 30 days</p>
                                        </div>
                                        <div>
                                            <Label className="text-[#352b38]">Max Users During Trial</Label>
                                            <Input
                                                type="number"
                                                value={trialSettings.maxUsers}
                                                onChange={(e) => setTrialSettings(prev => ({ ...prev, maxUsers: Number(e.target.value) }))}
                                                className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                                min={1}
                                            />
                                            <p className="text-gray-500 text-xs mt-1">Set to -1 for unlimited users</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Modules */}
                            <Card className="border-0 shadow-sm rounded-2xl bg-white">
                                <CardContent className="p-6">
                                    <h3 className="text-[#352b38] font-medium mb-4">Modules Available in Trial</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {AVAILABLE_MODULES.map((module) => (
                                            <label
                                                key={module.id}
                                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${trialSettings.modules.includes(module.id)
                                                    ? 'border-purple-500 bg-purple-600/10'
                                                    : 'border-[#dad8f9] hover:border-gray-500'
                                                    }`}
                                            >
                                                <Checkbox
                                                    checked={trialSettings.modules.includes(module.id)}
                                                    onCheckedChange={() => toggleTrialModule(module.id)}
                                                    className="mt-0.5"
                                                />
                                                <div>
                                                    <p className="font-medium text-sm text-[#352b38]">{module.name}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Features */}
                            <Card className="border-0 shadow-sm rounded-2xl bg-white">
                                <CardContent className="p-6">
                                    <h3 className="text-[#352b38] font-medium mb-4">Trial Features (shown on signup)</h3>
                                    <div className="flex gap-2 mb-4">
                                        <Input
                                            value={trialFeatureInput}
                                            onChange={(e) => setTrialFeatureInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTrialFeature())}
                                            placeholder="Add a feature highlight..."
                                            className="bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                        />
                                        <Button onClick={addTrialFeature} className="bg-purple-600 hover:bg-purple-700">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {trialSettings.features.map((feature, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-[#f4f3f8] rounded-lg">
                                                <span className="text-sm text-[#352b38] flex items-center gap-2">
                                                    <CheckCircle className="h-4 w-4 text-green-400" />
                                                    {feature}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeTrialFeature(i)}
                                                    className="text-red-400 hover:text-red-300 h-7 w-7 p-0"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Plan Wizard Sheet */}
            <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
                <SheetContent side="right" className="w-full sm:w-[600px] sm:max-w-none p-0 flex flex-col h-full bg-white z-[100]">
                    <div className="p-6 border-b">
                        <SheetTitle className="text-xl font-bold text-[#352b38]">{editingPlan ? 'Edit Plan' : 'Create Subscription Plan'}</SheetTitle>
                        <SheetDescription>Configure plan details, pricing, and limits.</SheetDescription>
                        {/* Progress Steps */}
                        <div className="flex items-center gap-2 mt-6">
                            {[1, 2, 3, 4, 5].map((step) => (
                                <div key={step} className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${wizardStep >= step ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                        {step}
                                    </div>
                                    {step < 5 && (
                                        <div className={`w-8 h-0.5 mx-1 ${wizardStep > step ? 'bg-purple-600' : 'bg-gray-100'}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="p-6 pb-20 space-y-6">
                            {/* Step 1: Basic Info */}
                            {wizardStep === 1 && (
                                <div className="space-y-4">
                                    <h3 className="font-medium text-lg text-[#352b38]">Basic Information</h3>
                                    <div>
                                        <Label className="text-[#352b38]">Plan Name</Label>
                                        <Input
                                            value={planData.name}
                                            onChange={(e) => setPlanData(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g. Starter, Pro, Enterprise"
                                            className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[#352b38]">Description</Label>
                                        <Textarea
                                            value={planData.description}
                                            onChange={(e) => setPlanData(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="What's this plan for?"
                                            className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-[#f4f3f8] rounded-lg">
                                        <div>
                                            <Label className="text-[#352b38]">Mark as Popular</Label>
                                            <p className="text-gray-500 text-xs">Highlight this plan with a badge</p>
                                        </div>
                                        <Switch
                                            checked={planData.isPopular}
                                            onCheckedChange={(checked) => setPlanData(prev => ({ ...prev, isPopular: checked }))}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-[#f4f3f8] rounded-lg">
                                        <div>
                                            <Label className="text-[#352b38]">Active</Label>
                                            <p className="text-gray-500 text-xs">Show in pricing page</p>
                                        </div>
                                        <Switch
                                            checked={planData.isActive}
                                            onCheckedChange={(checked) => setPlanData(prev => ({ ...prev, isActive: checked }))}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Pricing */}
                            {wizardStep === 2 && (
                                <div className="space-y-4">
                                    <h3 className="font-medium text-lg text-[#352b38]">Pricing</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-[#352b38]">Monthly Price (USD)</Label>
                                            <div className="relative mt-1.5">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7e808c]" />
                                                <Input
                                                    type="number"
                                                    value={planData.prices.monthly}
                                                    onChange={(e) => setPlanData(prev => ({ ...prev, prices: { ...prev.prices, monthly: Number(e.target.value) } }))}
                                                    className="pl-10 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-[#352b38]">Yearly Price (USD)</Label>
                                            <div className="relative mt-1.5">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7e808c]" />
                                                <Input
                                                    type="number"
                                                    value={planData.prices.yearly}
                                                    onChange={(e) => setPlanData(prev => ({ ...prev, prices: { ...prev.prices, yearly: Number(e.target.value) } }))}
                                                    className="pl-10 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="text-[#352b38]">Plan Feature Bullets</Label>
                                        <div className="flex gap-2 mt-1.5">
                                            <Input
                                                value={featureInput}
                                                onChange={(e) => setFeatureInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                                                placeholder="Add a feature bullet..."
                                                className="bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                            />
                                            <Button onClick={addFeature} type="button" className="bg-purple-600">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="mt-3 space-y-2 max-h-[150px] overflow-y-auto">
                                            {planData.features.map((feature, i) => (
                                                <div key={i} className="flex items-center justify-between p-2 bg-[#f4f3f8] rounded">
                                                    <span className="text-sm flex items-center gap-2">
                                                        <CheckCircle className="h-4 w-4 text-green-400" />
                                                        {feature}
                                                    </span>
                                                    <Button variant="ghost" size="sm" onClick={() => removeFeature(i)} className="text-red-400 h-7 w-7 p-0">
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Modules Selection */}
                            {wizardStep === 3 && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <h3 className="font-medium text-lg text-[#352b38]">Select Modules</h3>
                                        <p className="text-sm text-gray-500">Choose the features included in this plan.</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {AVAILABLE_MODULES.map((module) => {
                                            const isEnabled = planData.modules.includes(module.id);
                                            return (
                                                <div
                                                    key={module.id}
                                                    className={`
                                                        relative flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all
                                                        ${isEnabled ? 'bg-purple-50/50 border-purple-200 ring-1 ring-purple-100' : 'bg-white border-gray-200 hover:border-purple-200 hover:bg-gray-50'}
                                                    `}
                                                    onClick={() => toggleModule(module.id)}
                                                >
                                                    <Checkbox
                                                        checked={isEnabled}
                                                        onCheckedChange={() => toggleModule(module.id)}
                                                        className="mt-0.5"
                                                    />
                                                    <div>
                                                        <span className="font-medium text-sm text-[#352b38] block">{module.name}</span>
                                                        <span className="text-[11px] text-gray-500 leading-tight block mt-0.5">{module.description}</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Limits & Quotas */}
                            {wizardStep === 4 && (
                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <h3 className="font-medium text-lg text-[#352b38]">Resource Limits</h3>
                                        <p className="text-sm text-gray-500">Set usage quotas for enabled modules.</p>
                                    </div>

                                    {/* Core Limits */}
                                    <div className="p-4 bg-gray-50 rounded-lg border border-[#dad8f9]">
                                        <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-3">Platform Core Limits</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { key: 'staff', label: 'Max Staff' },
                                                { key: 'contacts', label: 'Max Contacts' }
                                            ].map(({ key, label }) => {
                                                const qKey = key as keyof typeof planData.quotas;
                                                const val = planData.quotas[qKey];
                                                return (
                                                    <div key={key}>
                                                        <Label className="text-xs font-medium text-gray-700 mb-1.5 block">{label}</Label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                type="number"
                                                                value={val === -1 ? '' : val}
                                                                disabled={val === -1}
                                                                onChange={(e) => setPlanData(prev => ({ ...prev, quotas: { ...prev.quotas, [qKey]: Number(e.target.value) } }))}
                                                                className="h-9 bg-white" placeholder="Limit"
                                                            />
                                                            <Button
                                                                variant={val === -1 ? 'default' : 'outline'}
                                                                className={`px-3 ${val === -1 ? 'bg-purple-600' : ''}`}
                                                                onClick={() => setPlanData(prev => ({ ...prev, quotas: { ...prev.quotas, [qKey]: val === -1 ? 10 : -1 } }))}
                                                                title="Toggle Unlimited"
                                                            >∞ </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Module Quotas */}
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500 pl-1">Module Limits</h4>
                                        {AVAILABLE_MODULES.filter(m => planData.modules.includes(m.id) && MODULE_QUOTA_MAP[m.id]).map(module => {
                                            const quotaKey = MODULE_QUOTA_MAP[module.id];
                                            const currentQuota = quotaKey ? planData.quotas[quotaKey] : null;

                                            return (
                                                <div key={module.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                                                            <Package className="h-4 w-4" />
                                                        </div>
                                                        <span className="text-sm font-medium text-[#352b38]">{module.name}</span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-400 mr-1 uppercase font-medium">Max {quotaKey?.replace('s', '')}s</span>
                                                        <Input
                                                            type="number"
                                                            value={currentQuota === -1 ? '' : (currentQuota ?? '')}
                                                            disabled={currentQuota === -1}
                                                            onChange={(e) => quotaKey && setPlanData(prev => ({ ...prev, quotas: { ...prev.quotas, [quotaKey]: Number(e.target.value) } }))}
                                                            className="h-8 w-24 text-right" placeholder="#"
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant={currentQuota === -1 ? 'default' : 'outline'}
                                                            className={`h-8 w-8 p-0 ${currentQuota === -1 ? 'bg-purple-600' : 'border-gray-200'}`}
                                                            onClick={() => quotaKey && setPlanData(prev => ({ ...prev, quotas: { ...prev.quotas, [quotaKey]: currentQuota === -1 ? 50 : -1 } }))}
                                                        >∞ </Button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {AVAILABLE_MODULES.filter(m => planData.modules.includes(m.id) && MODULE_QUOTA_MAP[m.id]).length === 0 && (
                                            <p className="text-sm text-gray-400 italic pl-1">No limits to configure for selected modules.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 5: Capabilities */}
                            {wizardStep === 5 && (
                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <h3 className="font-medium text-lg text-[#352b38]">Capabilities & Review</h3>
                                        <p className="text-sm text-gray-500">Configure advanced features.</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="flex items-center justify-between p-4 bg-white border border-[#dad8f9] rounded-xl hover:border-purple-300 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                    <Users className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <Label className="text-[#352b38] font-medium block">Client Portal</Label>
                                                    <p className="text-gray-500 text-xs mt-0.5">Allow tenants to invite customers to a portal</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={planData.capabilities.clientPortal}
                                                onCheckedChange={(checked) => setPlanData(prev => ({ ...prev, capabilities: { ...prev.capabilities, clientPortal: checked } }))}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-white border border-[#dad8f9] rounded-xl">
                                            <div>
                                                <Label className="text-[#352b38]">Custom Domain</Label>
                                                <p className="text-gray-500 text-xs">Allow connecting own domain</p>
                                            </div>
                                            <Switch
                                                checked={planData.capabilities.customDomain}
                                                onCheckedChange={(checked) => setPlanData(prev => ({ ...prev, capabilities: { ...prev.capabilities, customDomain: checked } }))}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-white border border-[#dad8f9] rounded-xl">
                                            <div>
                                                <Label className="text-[#352b38]">Subdomain</Label>
                                                <p className="text-gray-500 text-xs">Allow custom subdomain</p>
                                            </div>
                                            <Switch
                                                checked={planData.capabilities.subdomain}
                                                onCheckedChange={(checked) => setPlanData(prev => ({ ...prev, capabilities: { ...prev.capabilities, subdomain: checked } }))}
                                            />
                                        </div>
                                    </div>

                                    {/* Summary */}
                                    <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                        <h4 className="font-semibold text-sm uppercase text-gray-500 mb-3 tracking-wider">Plan Summary</h4>
                                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                                            <span className="text-gray-500">Name</span>
                                            <span className="font-medium text-right">{planData.name || '-'}</span>

                                            <span className="text-gray-500">Price</span>
                                            <span className="font-medium text-right">${planData.prices.monthly}/mo • ${planData.prices.yearly}/yr</span>

                                            <span className="text-gray-500">Modules</span>
                                            <span className="font-medium text-right">{planData.modules.length} Enabled</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 border-t bg-gray-50 flex justify-between">
                        <div>
                            {wizardStep > 1 && (
                                <Button variant="outline" onClick={() => setWizardStep(s => s - 1)} className="border-[#dad8f9] text-[#352b38]">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#dad8f9] text-[#352b38]">
                                Cancel
                            </Button>
                            {wizardStep < 5 ? (
                                <Button onClick={() => setWizardStep(s => s + 1)} className="bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200">
                                    Next
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button onClick={handleSavePlan} disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 min-w-[120px]">
                                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Plan'}
                                </Button>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}

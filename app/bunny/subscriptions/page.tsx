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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
                    <p className="text-gray-500">Manage subscription plans, billing cycles, and trial settings.</p>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-white border border-gray-200 p-1 h-auto rounded-lg shadow-sm">
                    <TabsTrigger
                        value="plans"
                        className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-100 border border-transparent py-2 px-4 rounded-md transition-all"
                    >
                        <Package className="mr-2 h-4 w-4" />
                        Subscription Plans
                    </TabsTrigger>
                    <TabsTrigger
                        value="subscriptions"
                        className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-100 border border-transparent py-2 px-4 rounded-md transition-all"
                    >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Tenant Subscriptions
                    </TabsTrigger>
                    <TabsTrigger
                        value="trial"
                        className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-100 border border-transparent py-2 px-4 rounded-md transition-all"
                    >
                        <Gift className="mr-2 h-4 w-4" />
                        Trial Settings
                    </TabsTrigger>
                </TabsList>

                {/* Plans Tab */}
                <TabsContent value="plans" className="space-y-6">
                    <div className="flex justify-end">
                        <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Plan
                        </Button>
                    </div>

                    {plansLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                    ) : plans.length === 0 ? (
                        <Card className="border border-gray-100 shadow-sm bg-white">
                            <CardContent className="py-12 text-center">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Package className="h-6 w-6 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No plans created</h3>
                                <p className="text-gray-500 mb-6 max-w-sm mx-auto">Get started by creating subscription plans for your tenants.</p>
                                <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create First Plan
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-6">
                            {plans.map((plan) => (
                                <Card key={plan.id} className={`border shadow-sm rounded-xl bg-white relative transition-all hover:shadow-md ${plan.isPopular ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-200'}`}>
                                    {plan.isPopular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-sm">
                                            <Star className="h-3 w-3 fill-current" /> POPULAR
                                        </div>
                                    )}
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                                                <p className="text-gray-500 text-sm mt-1 line-clamp-2 min-h-[40px]">{plan.description}</p>
                                            </div>
                                            <div className={`px-2 py-0.5 rounded-full text-xs font-semibold ${plan.isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                                {plan.isActive ? 'Active' : 'Inactive'}
                                            </div>
                                        </div>

                                        <div className="mb-6 pb-6 border-b border-gray-100">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-bold text-gray-900">${plan.prices.monthly}</span>
                                                <span className="text-gray-500 font-medium">/mo</span>
                                            </div>
                                            <div className="mt-1 flex items-baseline gap-1.5">
                                                <span className="text-sm font-medium text-gray-600">${plan.prices.yearly}</span>
                                                <span className="text-xs text-gray-400">billed yearly</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-6">
                                            <div className="text-sm text-gray-600 flex items-center gap-2.5">
                                                <Users className="h-4 w-4 text-blue-500" />
                                                <span className="font-medium">{plan.quotas.staff === -1 ? 'Unlimited staff' : `Up to ${plan.quotas.staff} staff`}</span>
                                            </div>
                                            <div className="text-sm text-gray-600 flex items-center gap-2.5">
                                                <Package className="h-4 w-4 text-purple-500" />
                                                <span>{plan.modules.length} modules included</span>
                                            </div>
                                            <div className="text-sm text-gray-600 flex items-center gap-2.5">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                <span>{plan.features.length} features listed</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditDialog(plan)}
                                                className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDeletePlan(plan.id)}
                                                className="border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3"
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
                        <Card className="border border-green-100 bg-green-50/50 shadow-sm">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-green-800">Active</p>
                                    <p className="text-2xl font-bold text-green-700 mt-1">{subscriptions.filter(s => s.status === "active").length}</p>
                                </div>
                                <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border border-orange-100 bg-orange-50/50 shadow-sm">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-orange-800">Trial</p>
                                    <p className="text-2xl font-bold text-orange-700 mt-1">{subscriptions.filter(s => s.status === "trial").length}</p>
                                </div>
                                <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <Clock className="h-5 w-5 text-orange-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border border-red-100 bg-red-50/50 shadow-sm">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-red-800">Expired</p>
                                    <p className="text-2xl font-bold text-red-700 mt-1">{subscriptions.filter(s => s.status === "expired" || s.status === "cancelled").length}</p>
                                </div>
                                <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                                    <XCircle className="h-5 w-5 text-red-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border border-blue-100 bg-blue-50/50 shadow-sm">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-800">MRR</p>
                                    <p className="text-2xl font-bold text-blue-700 mt-1">
                                        ${subscriptions.filter(s => s.status === "active").reduce((sum, s) => sum + s.amount, 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <DollarSign className="h-5 w-5 text-blue-600" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Search */}
                    <Card className="border border-gray-100 shadow-sm bg-white">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search subscriptions by tenant or status..."
                                        className="pl-10 bg-white border-gray-200 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50">
                                    Export
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Subscriptions Table */}
                    <Card className="border border-gray-100 shadow-sm bg-white overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tenant</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {subsLoading ? (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-gray-500">
                                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                                                Loading subscriptions...
                                            </td>
                                        </tr>
                                    ) : subscriptions.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-gray-500">
                                                <CreditCard className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                                <p>No subscriptions found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        subscriptions.map((sub) => (
                                            <tr key={sub.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="py-4 px-4">
                                                    <p className="text-gray-900 font-semibold text-sm">{sub.tenantName}</p>
                                                    <p className="text-gray-500 text-xs">{sub.tenantId}</p>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded text-xs font-medium capitalize">
                                                        {sub.plan}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="text-gray-900 font-medium text-sm">
                                                        ${sub.amount}
                                                        <span className="text-gray-500 font-normal text-xs uppercase ml-0.5">{sub.currency === "usd" ? "mo" : sub.currency}</span>
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-2">
                                                        {getStatusIcon(sub.status)}
                                                        <span className="text-sm text-gray-700 capitalize">{sub.status}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="text-gray-500 text-sm flex items-center gap-1.5">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        <span className="text-xs">
                                                            {new Date(sub.startDate).toLocaleDateString()} - {new Date(sub.endDate).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>

                {/* Trial Settings Tab */}
                <TabsContent value="trial" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Free Trial Configuration</h2>
                            <p className="text-gray-500 text-sm">Configure the trial period for new tenant signups</p>
                        </div>
                        <Button
                            onClick={saveTrialSettings}
                            disabled={trialSaving}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
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
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {/* Enable Trial Toggle */}
                            <Card className="border border-gray-100 shadow-sm bg-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-gray-900 text-base font-semibold">Enable Free Trial</Label>
                                            <p className="text-gray-500 text-sm mt-1">Allow new tenants to start with a free trial period</p>
                                        </div>
                                        <Switch
                                            checked={trialSettings.isEnabled}
                                            onCheckedChange={(checked) => setTrialSettings(prev => ({ ...prev, isEnabled: checked }))}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Duration & Limits */}
                            <Card className="border border-gray-100 shadow-sm bg-white">
                                <CardContent className="p-6">
                                    <h3 className="text-gray-900 font-semibold mb-6 flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-blue-500" />
                                        Duration & Limits
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div>
                                            <Label className="text-gray-700 font-medium">Trial Duration (Days)</Label>
                                            <div className="mt-2 relative">
                                                <Input
                                                    type="number"
                                                    value={trialSettings.durationDays}
                                                    onChange={(e) => setTrialSettings(prev => ({ ...prev, durationDays: Number(e.target.value) }))}
                                                    className="bg-white border-gray-200 text-gray-900 focus:ring-blue-500 focus:border-blue-500 pr-12"
                                                    min={1}
                                                    max={90}
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">days</div>
                                            </div>
                                            <p className="text-gray-400 text-xs mt-2">Common values: 7, 14, 30 days</p>
                                        </div>
                                        <div>
                                            <Label className="text-gray-700 font-medium">Max Users During Trial</Label>
                                            <div className="mt-2">
                                                <Input
                                                    type="number"
                                                    value={trialSettings.maxUsers}
                                                    onChange={(e) => setTrialSettings(prev => ({ ...prev, maxUsers: Number(e.target.value) }))}
                                                    className="bg-white border-gray-200 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                                    min={1}
                                                />
                                            </div>
                                            <p className="text-gray-400 text-xs mt-2">Set to -1 for unlimited users</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Modules */}
                            <Card className="border border-gray-100 shadow-sm bg-white">
                                <CardContent className="p-6">
                                    <h3 className="text-gray-900 font-semibold mb-6 flex items-center gap-2">
                                        <Package className="h-4 w-4 text-purple-500" />
                                        Modules Available in Trial
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {AVAILABLE_MODULES.map((module) => (
                                            <label
                                                key={module.id}
                                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${trialSettings.modules.includes(module.id)
                                                    ? 'border-blue-500 bg-blue-50/50'
                                                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <Checkbox
                                                    checked={trialSettings.modules.includes(module.id)}
                                                    onCheckedChange={() => toggleTrialModule(module.id)}
                                                    className="mt-0.5 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                />
                                                <div>
                                                    <p className={`font-medium text-sm ${trialSettings.modules.includes(module.id) ? 'text-blue-900' : 'text-gray-700'}`}>{module.name}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{module.description}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Features */}
                            <Card className="border border-gray-100 shadow-sm bg-white">
                                <CardContent className="p-6">
                                    <h3 className="text-gray-900 font-semibold mb-6 flex items-center gap-2">
                                        <Star className="h-4 w-4 text-orange-500" />
                                        Trial Features Highlight
                                    </h3>
                                    <div className="flex gap-2 mb-6">
                                        <Input
                                            value={trialFeatureInput}
                                            onChange={(e) => setTrialFeatureInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTrialFeature())}
                                            placeholder="Add a feature highlight (e.g. 'No credit card required')"
                                            className="bg-white border-gray-200 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <Button onClick={addTrialFeature} className="bg-gray-900 hover:bg-black text-white">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {trialSettings.features.map((feature, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg group hover:border-gray-200 transition-colors">
                                                <span className="text-sm text-gray-700 flex items-center gap-2">
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                    {feature}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeTrialFeature(i)}
                                                    className="text-gray-400 hover:text-red-500 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {trialSettings.features.length === 0 && (
                                            <p className="text-sm text-gray-400 italic text-center py-4">No features added yet.</p>
                                        )}
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
                    <div className="p-6 border-b border-gray-100">
                        <SheetTitle className="text-xl font-bold text-gray-900">{editingPlan ? 'Edit Plan' : 'Create Subscription Plan'}</SheetTitle>
                        <SheetDescription>Configure plan details, pricing, and limits.</SheetDescription>
                        {/* Progress Steps */}
                        <div className="flex items-center gap-2 mt-6">
                            {[1, 2, 3, 4, 5].map((step) => (
                                <div key={step} className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${wizardStep >= step ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                        {step}
                                    </div>
                                    {step < 5 && (
                                        <div className={`w-8 h-0.5 mx-1 ${wizardStep > step ? 'bg-blue-600' : 'bg-gray-100'}`} />
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
                                    <h3 className="font-semibold text-lg text-gray-900">Basic Information</h3>
                                    <div>
                                        <Label className="text-gray-700 font-medium">Plan Name</Label>
                                        <Input
                                            value={planData.name}
                                            onChange={(e) => setPlanData(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g. Starter, Pro, Enterprise"
                                            className="mt-1.5 bg-white border-gray-200 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-gray-700 font-medium">Description</Label>
                                        <Textarea
                                            value={planData.description}
                                            onChange={(e) => setPlanData(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="What's this plan for?"
                                            className="mt-1.5 bg-white border-gray-200 text-gray-900 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-lg">
                                        <div>
                                            <Label className="text-gray-900 font-medium">Mark as Popular</Label>
                                            <p className="text-gray-500 text-xs">Highlight this plan with a badge</p>
                                        </div>
                                        <Switch
                                            checked={planData.isPopular}
                                            onCheckedChange={(checked) => setPlanData(prev => ({ ...prev, isPopular: checked }))}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-lg">
                                        <div>
                                            <Label className="text-gray-900 font-medium">Active</Label>
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
                                    <h3 className="font-semibold text-lg text-gray-900">Pricing</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-gray-700 font-medium">Monthly Price (USD)</Label>
                                            <div className="relative mt-1.5">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    type="number"
                                                    value={planData.prices.monthly}
                                                    onChange={(e) => setPlanData(prev => ({ ...prev, prices: { ...prev.prices, monthly: Number(e.target.value) } }))}
                                                    className="pl-10 bg-white border-gray-200 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-gray-700 font-medium">Yearly Price (USD)</Label>
                                            <div className="relative mt-1.5">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    type="number"
                                                    value={planData.prices.yearly}
                                                    onChange={(e) => setPlanData(prev => ({ ...prev, prices: { ...prev.prices, yearly: Number(e.target.value) } }))}
                                                    className="pl-10 bg-white border-gray-200 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <Label className="text-gray-700 font-medium">Plan Feature Bullets</Label>
                                        <div className="flex gap-2 mt-1.5">
                                            <Input
                                                value={featureInput}
                                                onChange={(e) => setFeatureInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                                                placeholder="Add a feature bullet..."
                                                className="bg-white border-gray-200 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <Button onClick={addFeature} type="button" className="bg-blue-600 hover:bg-blue-700 text-white">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
                                            {planData.features.map((feature, i) => (
                                                <div key={i} className="flex items-center justify-between p-2 pl-3 bg-gray-50 border border-gray-100 rounded-md group hover:border-gray-200 transition-colors">
                                                    <span className="text-sm flex items-center gap-2 text-gray-700">
                                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                                        {feature}
                                                    </span>
                                                    <Button variant="ghost" size="sm" onClick={() => removeFeature(i)} className="text-gray-400 hover:text-red-500 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {planData.features.length === 0 && (
                                                <p className="text-sm text-gray-400 italic">No features added.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Modules Selection */}
                            {wizardStep === 3 && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-lg text-gray-900">Select Modules</h3>
                                        <p className="text-sm text-gray-500">Choose the features included in this plan.</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {AVAILABLE_MODULES.map((module) => {
                                            const isEnabled = planData.modules.includes(module.id);
                                            return (
                                                <div
                                                    key={module.id}
                                                    className={`
                                                        relative flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm
                                                        ${isEnabled ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-gray-50'}
                                                    `}
                                                    onClick={() => toggleModule(module.id)}
                                                >
                                                    <Checkbox
                                                        checked={isEnabled}
                                                        onCheckedChange={() => toggleModule(module.id)}
                                                        className="mt-0.5 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                    />
                                                    <div>
                                                        <span className={`font-medium text-sm block ${isEnabled ? 'text-blue-900' : 'text-gray-900'}`}>{module.name}</span>
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
                                        <h3 className="font-semibold text-lg text-gray-900">Resource Limits</h3>
                                        <p className="text-sm text-gray-500">Set usage quotas for enabled modules.</p>
                                    </div>

                                    {/* Core Limits */}
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                                            <Users className="h-3 w-3" /> Platform Core Limits
                                        </h4>
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
                                                                className="h-9 bg-white border-gray-200 focus:ring-blue-500" placeholder="Limit"
                                                            />
                                                            <Button
                                                                variant={val === -1 ? 'default' : 'outline'}
                                                                className={`px-3 h-9 ${val === -1 ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-200 text-gray-700'}`}
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
                                        <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500 pl-1 mt-4">Module Limits</h4>
                                        {AVAILABLE_MODULES.filter(m => planData.modules.includes(m.id) && MODULE_QUOTA_MAP[m.id]).map(module => {
                                            const quotaKey = MODULE_QUOTA_MAP[module.id];
                                            const currentQuota = quotaKey ? planData.quotas[quotaKey] : null;

                                            return (
                                                <div key={module.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-200 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                            <Package className="h-4 w-4" />
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900">{module.name}</span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-400 mr-1 uppercase font-medium">Max {quotaKey?.replace('s', '')}s</span>
                                                        <Input
                                                            type="number"
                                                            value={currentQuota === -1 ? '' : (currentQuota ?? '')}
                                                            disabled={currentQuota === -1}
                                                            onChange={(e) => quotaKey && setPlanData(prev => ({ ...prev, quotas: { ...prev.quotas, [quotaKey]: Number(e.target.value) } }))}
                                                            className="h-8 w-24 text-right bg-white border-gray-200" placeholder="#"
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant={currentQuota === -1 ? 'default' : 'outline'}
                                                            className={`h-8 w-8 p-0 ${currentQuota === -1 ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-200 text-gray-500'}`}
                                                            onClick={() => quotaKey && setPlanData(prev => ({ ...prev, quotas: { ...prev.quotas, [quotaKey]: currentQuota === -1 ? 50 : -1 } }))}
                                                        >∞ </Button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {AVAILABLE_MODULES.filter(m => planData.modules.includes(m.id) && MODULE_QUOTA_MAP[m.id]).length === 0 && (
                                            <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                <p className="text-sm text-gray-400 italic">No limits to configure for selected modules.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 5: Capabilities */}
                            {wizardStep === 5 && (
                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-lg text-gray-900">Capabilities & Review</h3>
                                        <p className="text-sm text-gray-500">Configure advanced features.</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 transition-colors shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                    <Users className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <Label className="text-gray-900 font-medium block">Client Portal</Label>
                                                    <p className="text-gray-500 text-xs mt-0.5">Allow tenants to invite customers to a portal</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={planData.capabilities.clientPortal}
                                                onCheckedChange={(checked) => setPlanData(prev => ({ ...prev, capabilities: { ...prev.capabilities, clientPortal: checked } }))}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                                            <div>
                                                <Label className="text-gray-900 font-medium">Custom Domain</Label>
                                                <p className="text-gray-500 text-xs">Allow connecting own domain</p>
                                            </div>
                                            <Switch
                                                checked={planData.capabilities.customDomain}
                                                onCheckedChange={(checked) => setPlanData(prev => ({ ...prev, capabilities: { ...prev.capabilities, customDomain: checked } }))}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                                            <div>
                                                <Label className="text-gray-900 font-medium">Subdomain</Label>
                                                <p className="text-gray-500 text-xs">Allow custom subdomain</p>
                                            </div>
                                            <Switch
                                                checked={planData.capabilities.subdomain}
                                                onCheckedChange={(checked) => setPlanData(prev => ({ ...prev, capabilities: { ...prev.capabilities, subdomain: checked } }))}
                                            />
                                        </div>
                                    </div>

                                    {/* Summary */}
                                    <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                                        <h4 className="font-bold text-xs uppercase text-gray-400 mb-4 tracking-wider">Plan Summary</h4>
                                        <div className="grid grid-cols-2 gap-y-3 text-sm">
                                            <span className="text-gray-500">Name</span>
                                            <span className="font-medium text-right text-gray-900">{planData.name || '-'}</span>

                                            <span className="text-gray-500">Price</span>
                                            <span className="font-medium text-right text-gray-900">${planData.prices.monthly}/mo • ${planData.prices.yearly}/yr</span>

                                            <span className="text-gray-500">Modules</span>
                                            <span className="font-medium text-right text-gray-900">{planData.modules.length} Enabled</span>

                                            <span className="text-gray-500">Features</span>
                                            <span className="font-medium text-right text-gray-900">{planData.features.length} Listed</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between rounded-bl-xl rounded-br-xl">
                        <div>
                            {wizardStep > 1 && (
                                <Button variant="outline" onClick={() => setWizardStep(s => s - 1)} className="border-gray-200 text-gray-700 bg-white hover:bg-gray-100">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-gray-200 text-gray-700 bg-white hover:bg-gray-100">
                                Cancel
                            </Button>
                            {wizardStep < 5 ? (
                                <Button onClick={() => setWizardStep(s => s + 1)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                                    Next Step
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button onClick={handleSavePlan} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white shadow-sm min-w-[120px]">
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

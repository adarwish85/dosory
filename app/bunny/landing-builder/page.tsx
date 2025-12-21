"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Save, Loader2, Plus, Trash2, GripVertical, Eye, Palette, Type,
    Users, FileText, BarChart3, Zap, Target, TrendingUp,
    FolderKanban, Headphones, CreditCard, ChevronDown, Star
} from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Icon mapping for the icon picker
const iconOptions = [
    { name: "Users", icon: Users },
    { name: "FileText", icon: FileText },
    { name: "BarChart3", icon: BarChart3 },
    { name: "FolderKanban", icon: FolderKanban },
    { name: "Headphones", icon: Headphones },
    { name: "CreditCard", icon: CreditCard },
    { name: "Zap", icon: Zap },
    { name: "Target", icon: Target },
    { name: "TrendingUp", icon: TrendingUp },
];

interface LandingConfig {
    hero: {
        badge: string;
        headline: string;
        headlineHighlight: string;
        subheadline: string;
        ctaPrimary: string;
        ctaSecondary: string;
    };
    features: Array<{
        icon: string;
        title: string;
        description: string;
    }>;
    stats: Array<{
        value: string;
        label: string;
        icon: string;
    }>;
    testimonial: {
        quote: string;
        author: string;
        role: string;
    };
    faqs: Array<{
        question: string;
        answer: string;
    }>;
    design: {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
    };
}

const defaultConfig: LandingConfig = {
    hero: {
        badge: "#1 Rated CRM for Growing Businesses",
        headline: "Smarter CRM for Stronger",
        headlineHighlight: "Sustainable Sales",
        subheadline: "The all-in-one CRM and ERP platform that helps you manage customers, projects, invoices, and more. Scale your business without the complexity.",
        ctaPrimary: "Start Free Trial",
        ctaSecondary: "Watch Demo",
    },
    features: [
        { icon: "Users", title: "Customer Management", description: "Track leads, contacts, and accounts in one place" },
        { icon: "FileText", title: "Smart Invoicing", description: "Create and send professional invoices in seconds" },
        { icon: "FolderKanban", title: "Project Management", description: "Manage projects, tasks, and deadlines efficiently" },
        { icon: "BarChart3", title: "Analytics & Reports", description: "Real-time insights to grow your business" },
        { icon: "Headphones", title: "Support Tickets", description: "Keep your customers happy with great support" },
        { icon: "CreditCard", title: "Payment Processing", description: "Accept payments and manage subscriptions" },
    ],
    stats: [
        { value: "$2.5M+", label: "Revenue Tracked", icon: "TrendingUp" },
        { value: "45%", label: "Productivity Boost", icon: "Zap" },
        { value: "10K+", label: "Active Users", icon: "Users" },
        { value: "99.9%", label: "Uptime", icon: "Target" },
    ],
    testimonial: {
        quote: "Using Dosory CRM is one of the best decisions we've made. Our sales team's productivity has increased by 45%, and we've streamlined our entire customer management process. Highly recommended!",
        author: "John Davidson",
        role: "CEO, TechStart Inc.",
    },
    faqs: [
        { question: "How do I integrate Dosory CRM with other tools?", answer: "Dosory integrates seamlessly with popular tools like Zapier, Slack, and Google Workspace. Our REST API also allows custom integrations with any platform." },
        { question: "Is there a free trial available?", answer: "Yes! We offer a 14-day free trial with full access to all features. No credit card required to get started." },
        { question: "Is Dosory suitable for small businesses?", answer: "Absolutely! Dosory is designed to scale with your business. Start small and grow without limits - from solo entrepreneurs to enterprise teams." },
        { question: "What kind of support do you offer?", answer: "We provide 24/7 email support, live chat during business hours, and comprehensive documentation. Enterprise plans include dedicated account managers." },
    ],
    design: {
        primaryColor: "#0A66C2",
        secondaryColor: "#004182",
        accentColor: "#E7F3FF",
    },
};

export default function LandingBuilderPage() {
    const [config, setConfig] = useState<LandingConfig>(defaultConfig);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState("hero");

    // Load config from Firestore
    useEffect(() => {
        async function loadConfig() {
            try {
                const docRef = doc(db, "platform", "landing");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setConfig({ ...defaultConfig, ...docSnap.data() as LandingConfig });
                }
            } catch (error) {
                console.error("Error loading landing config:", error);
            } finally {
                setLoading(false);
            }
        }
        loadConfig();
    }, []);

    // Save config to Firestore
    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, "platform", "landing"), {
                ...config,
                updatedAt: serverTimestamp(),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error("Error saving landing config:", error);
            alert("Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // Update nested config
    const updateHero = (field: keyof LandingConfig["hero"], value: string) => {
        setConfig(prev => ({ ...prev, hero: { ...prev.hero, [field]: value } }));
    };

    const updateFeature = (index: number, field: string, value: string) => {
        setConfig(prev => ({
            ...prev,
            features: prev.features.map((f, i) => i === index ? { ...f, [field]: value } : f),
        }));
    };

    const updateStat = (index: number, field: string, value: string) => {
        setConfig(prev => ({
            ...prev,
            stats: prev.stats.map((s, i) => i === index ? { ...s, [field]: value } : s),
        }));
    };

    const updateTestimonial = (field: keyof LandingConfig["testimonial"], value: string) => {
        setConfig(prev => ({ ...prev, testimonial: { ...prev.testimonial, [field]: value } }));
    };

    const updateFaq = (index: number, field: string, value: string) => {
        setConfig(prev => ({
            ...prev,
            faqs: prev.faqs.map((f, i) => i === index ? { ...f, [field]: value } : f),
        }));
    };

    const addFaq = () => {
        setConfig(prev => ({
            ...prev,
            faqs: [...prev.faqs, { question: "", answer: "" }],
        }));
    };

    const removeFaq = (index: number) => {
        setConfig(prev => ({
            ...prev,
            faqs: prev.faqs.filter((_, i) => i !== index),
        }));
    };

    const updateDesign = (field: keyof LandingConfig["design"], value: string) => {
        setConfig(prev => ({ ...prev, design: { ...prev.design, [field]: value } }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#352b38]">Landing Page Builder</h1>
                    <p className="text-[#7e808c] mt-1">Customize your landing page content and design</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => window.open("/", "_blank")}
                        className="border-[#dad8f9] text-[#352b38] hover:bg-[#f4f3f8]"
                    >
                        <Eye className="mr-2 h-4 w-4" />
                        Preview Live
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {saving ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                        ) : saved ? (
                            <><Star className="mr-2 h-4 w-4" />Saved!</>
                        ) : (
                            <><Save className="mr-2 h-4 w-4" />Save Changes</>
                        )}
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-white border border-[#dad8f9]">
                    <TabsTrigger value="hero" className="data-[state=active]:bg-purple-600">Hero</TabsTrigger>
                    <TabsTrigger value="features" className="data-[state=active]:bg-purple-600">Features</TabsTrigger>
                    <TabsTrigger value="stats" className="data-[state=active]:bg-purple-600">Stats</TabsTrigger>
                    <TabsTrigger value="testimonial" className="data-[state=active]:bg-purple-600">Testimonial</TabsTrigger>
                    <TabsTrigger value="faq" className="data-[state=active]:bg-purple-600">FAQ</TabsTrigger>
                    <TabsTrigger value="design" className="data-[state=active]:bg-purple-600">Design</TabsTrigger>
                </TabsList>

                {/* Hero Section */}
                <TabsContent value="hero" className="space-y-6">
                    <div className="bg-white rounded-xl p-6 border border-[#dad8f9]">
                        <h2 className="text-lg font-semibold text-[#352b38] mb-4">Hero Section</h2>
                        <div className="grid gap-4">
                            <div>
                                <Label className="text-[#352b38]">Badge Text</Label>
                                <Input
                                    value={config.hero.badge}
                                    onChange={(e) => updateHero("badge", e.target.value)}
                                    className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                    placeholder="#1 Rated CRM..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-[#352b38]">Headline</Label>
                                    <Input
                                        value={config.hero.headline}
                                        onChange={(e) => updateHero("headline", e.target.value)}
                                        className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[#352b38]">Headline Highlight (colored text)</Label>
                                    <Input
                                        value={config.hero.headlineHighlight}
                                        onChange={(e) => updateHero("headlineHighlight", e.target.value)}
                                        className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-[#352b38]">Subheadline</Label>
                                <Textarea
                                    value={config.hero.subheadline}
                                    onChange={(e) => updateHero("subheadline", e.target.value)}
                                    className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-[#352b38]">Primary CTA Button</Label>
                                    <Input
                                        value={config.hero.ctaPrimary}
                                        onChange={(e) => updateHero("ctaPrimary", e.target.value)}
                                        className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[#352b38]">Secondary CTA Button</Label>
                                    <Input
                                        value={config.hero.ctaSecondary}
                                        onChange={(e) => updateHero("ctaSecondary", e.target.value)}
                                        className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Features Section */}
                <TabsContent value="features" className="space-y-4">
                    <div className="bg-white rounded-xl p-6 border border-[#dad8f9]">
                        <h2 className="text-lg font-semibold text-[#352b38] mb-4">Feature Cards</h2>
                        <div className="grid gap-4">
                            {config.features.map((feature, index) => (
                                <div key={index} className="bg-[#f4f3f8] rounded-lg p-4 border border-[#dad8f9]">
                                    <div className="flex items-center gap-2 mb-3 text-[#7e808c] text-sm">
                                        <GripVertical className="h-4 w-4" />
                                        Feature {index + 1}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label className="text-[#352b38]">Icon</Label>
                                            <select
                                                value={feature.icon}
                                                onChange={(e) => updateFeature(index, "icon", e.target.value)}
                                                className="w-full mt-1.5 bg-[#f4f3f8] border border-[#dad8f9] text-[#352b38] rounded-md px-3 py-2"
                                            >
                                                {iconOptions.map((opt) => (
                                                    <option key={opt.name} value={opt.name}>{opt.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Label className="text-[#352b38]">Title</Label>
                                            <Input
                                                value={feature.title}
                                                onChange={(e) => updateFeature(index, "title", e.target.value)}
                                                className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[#352b38]">Description</Label>
                                            <Input
                                                value={feature.description}
                                                onChange={(e) => updateFeature(index, "description", e.target.value)}
                                                className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                {/* Stats Section */}
                <TabsContent value="stats" className="space-y-4">
                    <div className="bg-white rounded-xl p-6 border border-[#dad8f9]">
                        <h2 className="text-lg font-semibold text-[#352b38] mb-4">Statistics</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {config.stats.map((stat, index) => (
                                <div key={index} className="bg-[#f4f3f8] rounded-lg p-4 border border-[#dad8f9]">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <Label className="text-[#352b38]">Value</Label>
                                            <Input
                                                value={stat.value}
                                                onChange={(e) => updateStat(index, "value", e.target.value)}
                                                className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                                placeholder="$2.5M+"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[#352b38]">Label</Label>
                                            <Input
                                                value={stat.label}
                                                onChange={(e) => updateStat(index, "label", e.target.value)}
                                                className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                                placeholder="Revenue Tracked"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[#352b38]">Icon</Label>
                                            <select
                                                value={stat.icon}
                                                onChange={(e) => updateStat(index, "icon", e.target.value)}
                                                className="w-full mt-1.5 bg-[#f4f3f8] border border-[#dad8f9] text-[#352b38] rounded-md px-3 py-2"
                                            >
                                                {iconOptions.map((opt) => (
                                                    <option key={opt.name} value={opt.name}>{opt.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                {/* Testimonial Section */}
                <TabsContent value="testimonial" className="space-y-4">
                    <div className="bg-white rounded-xl p-6 border border-[#dad8f9]">
                        <h2 className="text-lg font-semibold text-[#352b38] mb-4">Featured Testimonial</h2>
                        <div className="grid gap-4">
                            <div>
                                <Label className="text-[#352b38]">Quote</Label>
                                <Textarea
                                    value={config.testimonial.quote}
                                    onChange={(e) => updateTestimonial("quote", e.target.value)}
                                    className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                    rows={4}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-[#352b38]">Author Name</Label>
                                    <Input
                                        value={config.testimonial.author}
                                        onChange={(e) => updateTestimonial("author", e.target.value)}
                                        className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[#352b38]">Author Role</Label>
                                    <Input
                                        value={config.testimonial.role}
                                        onChange={(e) => updateTestimonial("role", e.target.value)}
                                        className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* FAQ Section */}
                <TabsContent value="faq" className="space-y-4">
                    <div className="bg-white rounded-xl p-6 border border-[#dad8f9]">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-[#352b38]">FAQ Items</h2>
                            <Button onClick={addFaq} size="sm" className="bg-purple-600 hover:bg-purple-700">
                                <Plus className="mr-2 h-4 w-4" />
                                Add FAQ
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {config.faqs.map((faq, index) => (
                                <div key={index} className="bg-[#f4f3f8] rounded-lg p-4 border border-[#dad8f9]">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[#7e808c] text-sm flex items-center gap-2">
                                            <GripVertical className="h-4 w-4" />
                                            FAQ {index + 1}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFaq(index)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <Label className="text-[#352b38]">Question</Label>
                                            <Input
                                                value={faq.question}
                                                onChange={(e) => updateFaq(index, "question", e.target.value)}
                                                className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[#352b38]">Answer</Label>
                                            <Textarea
                                                value={faq.answer}
                                                onChange={(e) => updateFaq(index, "answer", e.target.value)}
                                                className="mt-1.5 bg-[#f4f3f8] border-[#dad8f9] text-[#352b38]"
                                                rows={3}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                {/* Design Section */}
                <TabsContent value="design" className="space-y-4">
                    <div className="bg-white rounded-xl p-6 border border-[#dad8f9]">
                        <h2 className="text-lg font-semibold text-[#352b38] mb-4">Color Palette</h2>
                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <Label className="text-[#352b38]">Primary Color</Label>
                                <div className="flex items-center gap-3 mt-2">
                                    <input
                                        type="color"
                                        value={config.design.primaryColor}
                                        onChange={(e) => updateDesign("primaryColor", e.target.value)}
                                        className="w-12 h-12 rounded-lg cursor-pointer border-0"
                                    />
                                    <Input
                                        value={config.design.primaryColor}
                                        onChange={(e) => updateDesign("primaryColor", e.target.value)}
                                        className="bg-[#f4f3f8] border-[#dad8f9] text-[#352b38] uppercase"
                                        placeholder="#0A66C2"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Used for buttons, links, and accents</p>
                            </div>
                            <div>
                                <Label className="text-[#352b38]">Secondary Color</Label>
                                <div className="flex items-center gap-3 mt-2">
                                    <input
                                        type="color"
                                        value={config.design.secondaryColor}
                                        onChange={(e) => updateDesign("secondaryColor", e.target.value)}
                                        className="w-12 h-12 rounded-lg cursor-pointer border-0"
                                    />
                                    <Input
                                        value={config.design.secondaryColor}
                                        onChange={(e) => updateDesign("secondaryColor", e.target.value)}
                                        className="bg-[#f4f3f8] border-[#dad8f9] text-[#352b38] uppercase"
                                        placeholder="#004182"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Used for gradients and darker elements</p>
                            </div>
                            <div>
                                <Label className="text-[#352b38]">Accent Color</Label>
                                <div className="flex items-center gap-3 mt-2">
                                    <input
                                        type="color"
                                        value={config.design.accentColor}
                                        onChange={(e) => updateDesign("accentColor", e.target.value)}
                                        className="w-12 h-12 rounded-lg cursor-pointer border-0"
                                    />
                                    <Input
                                        value={config.design.accentColor}
                                        onChange={(e) => updateDesign("accentColor", e.target.value)}
                                        className="bg-[#f4f3f8] border-[#dad8f9] text-[#352b38] uppercase"
                                        placeholder="#E7F3FF"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Used for light backgrounds and badges</p>
                            </div>
                        </div>

                        {/* Color Preview */}
                        <div className="mt-8 p-6 bg-[#f4f3f8] rounded-lg border border-[#dad8f9]">
                            <h3 className="text-[#352b38] font-medium mb-4">Preview</h3>
                            <div className="flex items-center gap-4">
                                <button
                                    style={{ backgroundColor: config.design.primaryColor }}
                                    className="px-6 py-2 rounded-lg text-[#352b38] font-medium"
                                >
                                    Primary Button
                                </button>
                                <button
                                    style={{
                                        background: `linear-gradient(to right, ${config.design.primaryColor}, ${config.design.secondaryColor})`
                                    }}
                                    className="px-6 py-2 rounded-lg text-[#352b38] font-medium"
                                >
                                    Gradient Button
                                </button>
                                <div
                                    style={{ backgroundColor: config.design.accentColor }}
                                    className="px-4 py-2 rounded-full text-sm"
                                >
                                    <span style={{ color: config.design.primaryColor }}>Badge Text</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

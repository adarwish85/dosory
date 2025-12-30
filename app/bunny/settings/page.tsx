"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Settings,
    Globe,
    Mail,
    Bell,
    Shield,
    Database,
    Save,
    Loader2,
    Check,
    Palette,
    CreditCard,
    Upload,
    X,
    Image as ImageIcon,
} from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

interface PlatformSettings {
    platformName: string;
    supportEmail: string;
    websiteUrl: string;
    maintenanceMode: boolean;
    allowSignups: boolean;
    requireEmailVerification: boolean;
    defaultTrialDays: number;
    maxUsersPerTenant: number;
    emailNotifications: boolean;
    slackNotifications: boolean;
    customBranding: boolean;
    primaryColor: string;
    logoUrl: string;
    logoLightUrl: string;
    faviconUrl: string;
    smtpSettings: {
        host: string;
        port: number;
        encryption: "ssl" | "tls" | "none";
        username: string;
        password: string;
        fromName: string;
        fromEmail: string;
    };
}

const defaultSettings: PlatformSettings = {
    platformName: "Dosory",
    supportEmail: "support@dosory.com",
    websiteUrl: "https://dosory.com",
    maintenanceMode: false,
    allowSignups: true,
    requireEmailVerification: true,
    defaultTrialDays: 14,
    maxUsersPerTenant: 50,
    emailNotifications: true,
    slackNotifications: false,
    customBranding: true,
    primaryColor: "#9b8cff",
    logoUrl: "",
    logoLightUrl: "",
    faviconUrl: "",
    smtpSettings: {
        host: "",
        port: 587,
        encryption: "tls",
        username: "",
        password: "",
        fromName: "Platform Support",
        fromEmail: "noreply@platform.com",
    },
};

export default function SettingsPage() {
    const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Upload states
    const [uploading, setUploading] = useState<Record<string, boolean>>({});

    const logoInputRef = useRef<HTMLInputElement>(null);
    const lightLogoInputRef = useRef<HTMLInputElement>(null);
    const faviconInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const docRef = doc(db, "platform", "settings");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setSettings({ ...defaultSettings, ...(docSnap.data() as PlatformSettings) });
            }
        } catch (error) {
            console.error("Error loading settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, "platform", "settings"), {
                ...settings,
                updatedAt: serverTimestamp(),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        field: "logoUrl" | "logoLightUrl" | "faviconUrl"
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes =
            field === "faviconUrl"
                ? ["image/x-icon", "image/png", "image/vnd.microsoft.icon", "image/jpeg"]
                : ["image/"];

        if (field !== "faviconUrl" && !file.type.startsWith("image/")) {
            alert("Please select an image file");
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert("File size must be less than 2MB");
            return;
        }

        setUploading((prev) => ({ ...prev, [field]: true }));
        try {
            // Create storage reference
            const ext = file.name.split(".").pop();
            const storageRef = ref(storage, `platform/${field}-${Date.now()}.${ext}`);

            // Upload file
            await uploadBytes(storageRef, file);

            // Get download URL
            const downloadUrl = await getDownloadURL(storageRef);

            // Update settings with new URL
            const newSettings = { ...settings, [field]: downloadUrl };
            setSettings(newSettings);

            // Save immediately
            await setDoc(doc(db, "platform", "settings"), {
                ...newSettings,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error(`Error uploading ${field}:`, error);
            alert(`Failed to upload ${field === "faviconUrl" ? "favicon" : "logo"}`);
        } finally {
            setUploading((prev) => ({ ...prev, [field]: false }));
            // Clear input
            if (field === "logoUrl" && logoInputRef.current) logoInputRef.current.value = "";
            if (field === "logoLightUrl" && lightLogoInputRef.current) lightLogoInputRef.current.value = "";
            if (field === "faviconUrl" && faviconInputRef.current) faviconInputRef.current.value = "";
        }
    };

    const handleRemoveImage = async (field: "logoUrl" | "logoLightUrl" | "faviconUrl") => {
        const url = settings[field];
        if (!url) return;

        try {
            // Try to delete from storage if it's a Firebase URL
            if (url.includes("firebase")) {
                try {
                    const storageRef = ref(storage, url);
                    await deleteObject(storageRef);
                } catch (e) {
                    // Ignore if file doesn't exist
                }
            }

            // Clear URL
            const newSettings = { ...settings, [field]: "" };
            setSettings(newSettings);

            // Save immediately
            await setDoc(doc(db, "platform", "settings"), {
                ...newSettings,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error(`Error removing ${field}:`, error);
        }
    };

    const settingSections = [
        {
            title: "General",
            icon: Globe,
            description: "Basic platform configuration",
            fields: (
                <div className="space-y-4">
                    <div>
                        <Label className="text-gray-700 font-medium">Platform Name</Label>
                        <Input
                            value={settings.platformName}
                            onChange={(e) => setSettings((s) => ({ ...s, platformName: e.target.value }))}
                            className="mt-1.5 bg-white border-gray-200 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <Label className="text-gray-700 font-medium">Website URL</Label>
                        <Input
                            value={settings.websiteUrl}
                            onChange={(e) => setSettings((s) => ({ ...s, websiteUrl: e.target.value }))}
                            className="mt-1.5 bg-white border-gray-200 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <Label className="text-gray-700 font-medium">Support Email</Label>
                        <Input
                            type="email"
                            value={settings.supportEmail}
                            onChange={(e) => setSettings((s) => ({ ...s, supportEmail: e.target.value }))}
                            className="mt-1.5 bg-white border-gray-200 focus:ring-blue-500"
                        />
                    </div>
                </div>
            ),
        },
        {
            title: "Access Control",
            icon: Shield,
            description: "Signup and security settings",
            fields: (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                        <div>
                            <Label className="text-gray-900 font-medium">Maintenance Mode</Label>
                            <p className="text-sm text-gray-500">Disable public access temporarily</p>
                        </div>
                        <Switch
                            checked={settings.maintenanceMode}
                            onCheckedChange={(checked) => setSettings((s) => ({ ...s, maintenanceMode: checked }))}
                        />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                        <div>
                            <Label className="text-gray-900 font-medium">Allow New Signups</Label>
                            <p className="text-sm text-gray-500">Enable tenant self-registration</p>
                        </div>
                        <Switch
                            checked={settings.allowSignups}
                            onCheckedChange={(checked) => setSettings((s) => ({ ...s, allowSignups: checked }))}
                        />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                        <div>
                            <Label className="text-gray-900 font-medium">Require Email Verification</Label>
                            <p className="text-sm text-gray-500">Verify email before account activation</p>
                        </div>
                        <Switch
                            checked={settings.requireEmailVerification}
                            onCheckedChange={(checked) =>
                                setSettings((s) => ({ ...s, requireEmailVerification: checked }))
                            }
                        />
                    </div>
                </div>
            ),
        },
        {
            title: "Tenant Defaults",
            icon: CreditCard,
            description: "Default settings for new tenants",
            fields: (
                <div className="space-y-4">
                    <div>
                        <Label className="text-gray-700 font-medium">Default Trial Days</Label>
                        <Input
                            type="number"
                            value={settings.defaultTrialDays}
                            onChange={(e) =>
                                setSettings((s) => ({ ...s, defaultTrialDays: parseInt(e.target.value) || 14 }))
                            }
                            className="mt-1.5 bg-white border-gray-200 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <Label className="text-gray-700 font-medium">Max Users per Tenant</Label>
                        <Input
                            type="number"
                            value={settings.maxUsersPerTenant}
                            onChange={(e) =>
                                setSettings((s) => ({ ...s, maxUsersPerTenant: parseInt(e.target.value) || 50 }))
                            }
                            className="mt-1.5 bg-white border-gray-200 focus:ring-blue-500"
                        />
                    </div>
                </div>
            ),
        },
        {
            title: "Email Configuration",
            icon: Mail,
            description: "SMTP settings for system emails",
            fields: (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-gray-700 font-medium">SMTP Host</Label>
                            <Input
                                value={settings.smtpSettings.host}
                                onChange={(e) =>
                                    setSettings((s) => ({
                                        ...s,
                                        smtpSettings: { ...s.smtpSettings, host: e.target.value },
                                    }))
                                }
                                className="mt-1.5 bg-white border-gray-200 focus:ring-blue-500"
                                placeholder="smtp.example.com"
                            />
                        </div>
                        <div>
                            <Label className="text-gray-700 font-medium">Port</Label>
                            <Input
                                type="number"
                                value={settings.smtpSettings.port}
                                onChange={(e) =>
                                    setSettings((s) => ({
                                        ...s,
                                        smtpSettings: { ...s.smtpSettings, port: parseInt(e.target.value) || 587 },
                                    }))
                                }
                                className="mt-1.5 bg-white border-gray-200 focus:ring-blue-500"
                                placeholder="587"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-gray-700 font-medium">Username</Label>
                            <Input
                                value={settings.smtpSettings.username}
                                onChange={(e) =>
                                    setSettings((s) => ({
                                        ...s,
                                        smtpSettings: { ...s.smtpSettings, username: e.target.value },
                                    }))
                                }
                                className="mt-1.5 bg-white border-gray-200 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <Label className="text-gray-700 font-medium">Password</Label>
                            <Input
                                type="password"
                                value={settings.smtpSettings.password}
                                onChange={(e) =>
                                    setSettings((s) => ({
                                        ...s,
                                        smtpSettings: { ...s.smtpSettings, password: e.target.value },
                                    }))
                                }
                                className="mt-1.5 bg-white border-gray-200 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div>
                        <Label className="text-gray-700 font-medium">Encryption</Label>
                        <Input
                            value={settings.smtpSettings.encryption}
                            onChange={(e) =>
                                setSettings((s) => ({
                                    ...s,
                                    smtpSettings: { ...s.smtpSettings, encryption: e.target.value as any },
                                }))
                            }
                            className="mt-1.5 bg-white border-gray-200 focus:ring-blue-500"
                            placeholder="ssl, tls, or none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-gray-700 font-medium">From Name</Label>
                            <Input
                                value={settings.smtpSettings.fromName}
                                onChange={(e) =>
                                    setSettings((s) => ({
                                        ...s,
                                        smtpSettings: { ...s.smtpSettings, fromName: e.target.value },
                                    }))
                                }
                                className="mt-1.5 bg-white border-gray-200 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <Label className="text-gray-700 font-medium">From Email</Label>
                            <Input
                                value={settings.smtpSettings.fromEmail}
                                onChange={(e) =>
                                    setSettings((s) => ({
                                        ...s,
                                        smtpSettings: { ...s.smtpSettings, fromEmail: e.target.value },
                                    }))
                                }
                                className="mt-1.5 bg-white border-gray-200 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: "Notifications",
            icon: Bell,
            description: "Alert and notification preferences",
            fields: (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                        <div>
                            <Label className="text-gray-900 font-medium">Email Notifications</Label>
                            <p className="text-sm text-gray-500">Receive alerts via email</p>
                        </div>
                        <Switch
                            checked={settings.emailNotifications}
                            onCheckedChange={(checked) => setSettings((s) => ({ ...s, emailNotifications: checked }))}
                        />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                        <div>
                            <Label className="text-gray-900 font-medium">Slack Notifications</Label>
                            <p className="text-sm text-gray-500">Send alerts to Slack channel</p>
                        </div>
                        <Switch
                            checked={settings.slackNotifications}
                            onCheckedChange={(checked) => setSettings((s) => ({ ...s, slackNotifications: checked }))}
                        />
                    </div>
                </div>
            ),
        },
        {
            title: "Branding",
            icon: Palette,
            description: "Customize platform appearance",
            fields: (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                        <div>
                            <Label className="text-gray-900 font-medium">Custom Branding</Label>
                            <p className="text-sm text-gray-500">Enable white-label features</p>
                        </div>
                        <Switch
                            checked={settings.customBranding}
                            onCheckedChange={(checked) => setSettings((s) => ({ ...s, customBranding: checked }))}
                        />
                    </div>

                    {/* Default Logo Upload Section */}
                    <div>
                        <Label className="text-gray-700 font-medium">Platform Logo (Dark)</Label>
                        <div className="mt-2 p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                            {settings.logoUrl ? (
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-white flex items-center justify-center border border-gray-200 p-2">
                                        <img
                                            src={settings.logoUrl}
                                            alt="Platform Logo"
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">Logo uploaded</p>
                                        <p className="text-xs text-gray-500">Click remove to change</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRemoveImage("logoUrl")}
                                        className="rounded-lg border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
                                    >
                                        <X className="h-4 w-4 mr-1" /> Remove
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <input
                                        ref={logoInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, "logoUrl")}
                                        className="hidden"
                                        id="logo-upload"
                                    />
                                    <label
                                        htmlFor="logo-upload"
                                        className="cursor-pointer flex flex-col items-center gap-2"
                                    >
                                        {uploading["logoUrl"] ? (
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600">
                                                <Upload className="h-6 w-6" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {uploading["logoUrl"] ? "Uploading..." : "Click to upload logo"}
                                            </p>
                                            <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Light Logo Upload Section */}
                    <div>
                        <Label className="text-gray-700 font-medium">
                            Platform Logo (Light - for dark backgrounds)
                        </Label>
                        <div className="mt-2 p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-900 hover:bg-gray-800 transition-colors">
                            {settings.logoLightUrl ? (
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-800 flex items-center justify-center border border-gray-700 p-2">
                                        <img
                                            src={settings.logoLightUrl}
                                            alt="Light Logo"
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white">Logo uploaded</p>
                                        <p className="text-xs text-gray-400">Click remove to change</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRemoveImage("logoLightUrl")}
                                        className="rounded-lg border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700 hover:border-gray-500 transition-colors"
                                    >
                                        <X className="h-4 w-4 mr-1" /> Remove
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <input
                                        ref={lightLogoInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, "logoLightUrl")}
                                        className="hidden"
                                        id="light-logo-upload"
                                    />
                                    <label
                                        htmlFor="light-logo-upload"
                                        className="cursor-pointer flex flex-col items-center gap-2"
                                    >
                                        {uploading["logoLightUrl"] ? (
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-800 text-gray-400">
                                                <Upload className="h-6 w-6" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-white">
                                                {uploading["logoLightUrl"]
                                                    ? "Uploading..."
                                                    : "Click to upload light logo"}
                                            </p>
                                            <p className="text-xs text-gray-400">PNG, JPG up to 2MB</p>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Favicon Upload Section */}
                    <div>
                        <Label className="text-gray-700 font-medium">Favicon</Label>
                        <div className="mt-2 p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                            {settings.faviconUrl ? (
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex items-center justify-center border border-gray-200 p-2">
                                        <img
                                            src={settings.faviconUrl}
                                            alt="Favicon"
                                            className="w-8 h-8 object-contain"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">Favicon uploaded</p>
                                        <p className="text-xs text-gray-500">Click remove to change</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRemoveImage("faviconUrl")}
                                        className="rounded-lg border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
                                    >
                                        <X className="h-4 w-4 mr-1" /> Remove
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <input
                                        ref={faviconInputRef}
                                        type="file"
                                        accept="image/x-icon,image/png,image/jpeg"
                                        onChange={(e) => handleImageUpload(e, "faviconUrl")}
                                        className="hidden"
                                        id="favicon-upload"
                                    />
                                    <label
                                        htmlFor="favicon-upload"
                                        className="cursor-pointer flex flex-col items-center gap-2"
                                    >
                                        {uploading["faviconUrl"] ? (
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600">
                                                <Upload className="h-6 w-6" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {uploading["faviconUrl"] ? "Uploading..." : "Click to upload favicon"}
                                            </p>
                                            <p className="text-xs text-gray-500">ICO, PNG up to 2MB</p>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label className="text-gray-700 font-medium">Primary Color</Label>
                        <div className="flex items-center gap-2 mt-1.5">
                            <input
                                type="color"
                                value={settings.primaryColor}
                                onChange={(e) => setSettings((s) => ({ ...s, primaryColor: e.target.value }))}
                                className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                            />
                            <Input
                                value={settings.primaryColor}
                                onChange={(e) => setSettings((s) => ({ ...s, primaryColor: e.target.value }))}
                                className="flex-1 bg-white border-gray-200 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>
            ),
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-500">Configure platform-wide settings</p>
                </div>
                <Button
                    onClick={saveSettings}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] shadow-sm"
                >
                    {saving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                        </>
                    ) : saved ? (
                        <>
                            <Check className="mr-2 h-4 w-4" /> Saved!
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" /> Save Changes
                        </>
                    )}
                </Button>
            </div>

            {/* Settings Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {settingSections.map((section) => {
                    const Icon = section.icon;
                    return (
                        <Card
                            key={section.title}
                            className="shadow-sm border-gray-200 rounded-xl bg-white overflow-hidden"
                        >
                            <CardHeader className="border-b border-gray-100 pb-4 bg-gray-50/30">
                                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    {section.title}
                                </CardTitle>
                                <CardDescription className="text-gray-500 ml-11">{section.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">{section.fields}</CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

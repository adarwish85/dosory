"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Settings, Globe, Mail, Bell, Shield, Database,
    Save, Loader2, Check, Palette, CreditCard, Upload, X, Image as ImageIcon
} from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

// Design system colors
const colors = {
    dark: "#352b38",
    gray: "#7e808c",
    purple: "#dad8f9",
    light: "#f4f3f8",
    accent: "#9b8cff",
};

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
                setSettings({ ...defaultSettings, ...docSnap.data() as PlatformSettings });
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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'logoLightUrl' | 'faviconUrl') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = field === 'faviconUrl'
            ? ["image/x-icon", "image/png", "image/vnd.microsoft.icon", "image/jpeg"]
            : ["image/"];

        if (field !== 'faviconUrl' && !file.type.startsWith("image/")) {
            alert("Please select an image file");
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert("File size must be less than 2MB");
            return;
        }

        setUploading(prev => ({ ...prev, [field]: true }));
        try {
            // Create storage reference
            const ext = file.name.split('.').pop();
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
            alert(`Failed to upload ${field === 'faviconUrl' ? 'favicon' : 'logo'}`);
        } finally {
            setUploading(prev => ({ ...prev, [field]: false }));
            // Clear input
            if (field === 'logoUrl' && logoInputRef.current) logoInputRef.current.value = "";
            if (field === 'logoLightUrl' && lightLogoInputRef.current) lightLogoInputRef.current.value = "";
            if (field === 'faviconUrl' && faviconInputRef.current) faviconInputRef.current.value = "";
        }
    };

    const handleRemoveImage = async (field: 'logoUrl' | 'logoLightUrl' | 'faviconUrl') => {
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
                        <Label style={{ color: colors.dark }}>Platform Name</Label>
                        <Input
                            value={settings.platformName}
                            onChange={(e) => setSettings(s => ({ ...s, platformName: e.target.value }))}
                            className="mt-1.5"
                            style={{ backgroundColor: colors.light, borderColor: colors.purple, color: colors.dark }}
                        />
                    </div>
                    <div>
                        <Label style={{ color: colors.dark }}>Website URL</Label>
                        <Input
                            value={settings.websiteUrl}
                            onChange={(e) => setSettings(s => ({ ...s, websiteUrl: e.target.value }))}
                            className="mt-1.5"
                            style={{ backgroundColor: colors.light, borderColor: colors.purple, color: colors.dark }}
                        />
                    </div>
                    <div>
                        <Label style={{ color: colors.dark }}>Support Email</Label>
                        <Input
                            type="email"
                            value={settings.supportEmail}
                            onChange={(e) => setSettings(s => ({ ...s, supportEmail: e.target.value }))}
                            className="mt-1.5"
                            style={{ backgroundColor: colors.light, borderColor: colors.purple, color: colors.dark }}
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
                    <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: colors.light }}>
                        <div>
                            <Label style={{ color: colors.dark }}>Maintenance Mode</Label>
                            <p className="text-sm" style={{ color: colors.gray }}>Disable public access temporarily</p>
                        </div>
                        <Switch
                            checked={settings.maintenanceMode}
                            onCheckedChange={(checked) => setSettings(s => ({ ...s, maintenanceMode: checked }))}
                        />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: colors.light }}>
                        <div>
                            <Label style={{ color: colors.dark }}>Allow New Signups</Label>
                            <p className="text-sm" style={{ color: colors.gray }}>Enable tenant self-registration</p>
                        </div>
                        <Switch
                            checked={settings.allowSignups}
                            onCheckedChange={(checked) => setSettings(s => ({ ...s, allowSignups: checked }))}
                        />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: colors.light }}>
                        <div>
                            <Label style={{ color: colors.dark }}>Require Email Verification</Label>
                            <p className="text-sm" style={{ color: colors.gray }}>Verify email before account activation</p>
                        </div>
                        <Switch
                            checked={settings.requireEmailVerification}
                            onCheckedChange={(checked) => setSettings(s => ({ ...s, requireEmailVerification: checked }))}
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
                        <Label style={{ color: colors.dark }}>Default Trial Days</Label>
                        <Input
                            type="number"
                            value={settings.defaultTrialDays}
                            onChange={(e) => setSettings(s => ({ ...s, defaultTrialDays: parseInt(e.target.value) || 14 }))}
                            className="mt-1.5"
                            style={{ backgroundColor: colors.light, borderColor: colors.purple, color: colors.dark }}
                        />
                    </div>
                    <div>
                        <Label style={{ color: colors.dark }}>Max Users per Tenant</Label>
                        <Input
                            type="number"
                            value={settings.maxUsersPerTenant}
                            onChange={(e) => setSettings(s => ({ ...s, maxUsersPerTenant: parseInt(e.target.value) || 50 }))}
                            className="mt-1.5"
                            style={{ backgroundColor: colors.light, borderColor: colors.purple, color: colors.dark }}
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
                            <Label style={{ color: colors.dark }}>SMTP Host</Label>
                            <Input
                                value={settings.smtpSettings.host}
                                onChange={(e) => setSettings(s => ({ ...s, smtpSettings: { ...s.smtpSettings, host: e.target.value } }))}
                                className="mt-1.5"
                                placeholder="smtp.example.com"
                                style={{ backgroundColor: colors.light, borderColor: colors.purple, color: colors.dark }}
                            />
                        </div>
                        <div>
                            <Label style={{ color: colors.dark }}>Port</Label>
                            <Input
                                type="number"
                                value={settings.smtpSettings.port}
                                onChange={(e) => setSettings(s => ({ ...s, smtpSettings: { ...s.smtpSettings, port: parseInt(e.target.value) || 587 } }))}
                                className="mt-1.5"
                                placeholder="587"
                                style={{ backgroundColor: colors.light, borderColor: colors.purple, color: colors.dark }}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label style={{ color: colors.dark }}>Username</Label>
                            <Input
                                value={settings.smtpSettings.username}
                                onChange={(e) => setSettings(s => ({ ...s, smtpSettings: { ...s.smtpSettings, username: e.target.value } }))}
                                className="mt-1.5"
                                style={{ backgroundColor: colors.light, borderColor: colors.purple, color: colors.dark }}
                            />
                        </div>
                        <div>
                            <Label style={{ color: colors.dark }}>Password</Label>
                            <Input
                                type="password"
                                value={settings.smtpSettings.password}
                                onChange={(e) => setSettings(s => ({ ...s, smtpSettings: { ...s.smtpSettings, password: e.target.value } }))}
                                className="mt-1.5"
                                style={{ backgroundColor: colors.light, borderColor: colors.purple, color: colors.dark }}
                            />
                        </div>
                    </div>
                    <div>
                        <Label style={{ color: colors.dark }}>Encryption</Label>
                        <Input
                            value={settings.smtpSettings.encryption}
                            onChange={(e) => setSettings(s => ({ ...s, smtpSettings: { ...s.smtpSettings, encryption: e.target.value as any } }))}
                            className="mt-1.5"
                            placeholder="ssl, tls, or none"
                            style={{ backgroundColor: colors.light, borderColor: colors.purple, color: colors.dark }}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label style={{ color: colors.dark }}>From Name</Label>
                            <Input
                                value={settings.smtpSettings.fromName}
                                onChange={(e) => setSettings(s => ({ ...s, smtpSettings: { ...s.smtpSettings, fromName: e.target.value } }))}
                                className="mt-1.5"
                                style={{ backgroundColor: colors.light, borderColor: colors.purple, color: colors.dark }}
                            />
                        </div>
                        <div>
                            <Label style={{ color: colors.dark }}>From Email</Label>
                            <Input
                                value={settings.smtpSettings.fromEmail}
                                onChange={(e) => setSettings(s => ({ ...s, smtpSettings: { ...s.smtpSettings, fromEmail: e.target.value } }))}
                                className="mt-1.5"
                                style={{ backgroundColor: colors.light, borderColor: colors.purple, color: colors.dark }}
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
                    <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: colors.light }}>
                        <div>
                            <Label style={{ color: colors.dark }}>Email Notifications</Label>
                            <p className="text-sm" style={{ color: colors.gray }}>Receive alerts via email</p>
                        </div>
                        <Switch
                            checked={settings.emailNotifications}
                            onCheckedChange={(checked) => setSettings(s => ({ ...s, emailNotifications: checked }))}
                        />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: colors.light }}>
                        <div>
                            <Label style={{ color: colors.dark }}>Slack Notifications</Label>
                            <p className="text-sm" style={{ color: colors.gray }}>Send alerts to Slack channel</p>
                        </div>
                        <Switch
                            checked={settings.slackNotifications}
                            onCheckedChange={(checked) => setSettings(s => ({ ...s, slackNotifications: checked }))}
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
                    <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: colors.light }}>
                        <div>
                            <Label style={{ color: colors.dark }}>Custom Branding</Label>
                            <p className="text-sm" style={{ color: colors.gray }}>Enable white-label features</p>
                        </div>
                        <Switch
                            checked={settings.customBranding}
                            onCheckedChange={(checked) => setSettings(s => ({ ...s, customBranding: checked }))}
                        />
                    </div>

                    {/* Default Logo Upload Section */}
                    <div>
                        <Label style={{ color: colors.dark }}>Platform Logo (Dark)</Label>
                        <div className="mt-2 p-4 rounded-xl border-2 border-dashed" style={{ borderColor: colors.purple, backgroundColor: colors.light }}>
                            {settings.logoUrl ? (
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-white flex items-center justify-center border" style={{ borderColor: colors.purple }}>
                                        <img
                                            src={settings.logoUrl}
                                            alt="Platform Logo"
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium" style={{ color: colors.dark }}>Logo uploaded</p>
                                        <p className="text-xs" style={{ color: colors.gray }}>Click remove to change</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRemoveImage('logoUrl')}
                                        className="rounded-xl"
                                        style={{ borderColor: colors.purple, color: colors.dark }}
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
                                        onChange={(e) => handleImageUpload(e, 'logoUrl')}
                                        className="hidden"
                                        id="logo-upload"
                                    />
                                    <label
                                        htmlFor="logo-upload"
                                        className="cursor-pointer flex flex-col items-center gap-2"
                                    >
                                        {uploading['logoUrl'] ? (
                                            <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.accent }} />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: colors.purple }}>
                                                <Upload className="h-6 w-6" style={{ color: colors.dark }} />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium" style={{ color: colors.dark }}>
                                                {uploading['logoUrl'] ? "Uploading..." : "Click to upload logo"}
                                            </p>
                                            <p className="text-xs" style={{ color: colors.gray }}>PNG, JPG up to 2MB</p>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Light Logo Upload Section */}
                    <div>
                        <Label style={{ color: colors.dark }}>Platform Logo (Light - for dark backgrounds)</Label>
                        <div className="mt-2 p-4 rounded-xl border-2 border-dashed" style={{ borderColor: colors.purple, backgroundColor: colors.dark }}>
                            {settings.logoLightUrl ? (
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center border border-gray-700">
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
                                        onClick={() => handleRemoveImage('logoLightUrl')}
                                        className="rounded-xl border-gray-600 text-gray-300 hover:text-white hover:bg-gray-800"
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
                                        onChange={(e) => handleImageUpload(e, 'logoLightUrl')}
                                        className="hidden"
                                        id="light-logo-upload"
                                    />
                                    <label
                                        htmlFor="light-logo-upload"
                                        className="cursor-pointer flex flex-col items-center gap-2"
                                    >
                                        {uploading['logoLightUrl'] ? (
                                            <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.accent }} />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-800">
                                                <Upload className="h-6 w-6 text-gray-400" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-white">
                                                {uploading['logoLightUrl'] ? "Uploading..." : "Click to upload light logo"}
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
                        <Label style={{ color: colors.dark }}>Favicon</Label>
                        <div className="mt-2 p-4 rounded-xl border-2 border-dashed" style={{ borderColor: colors.purple, backgroundColor: colors.light }}>
                            {settings.faviconUrl ? (
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex items-center justify-center border" style={{ borderColor: colors.purple }}>
                                        <img
                                            src={settings.faviconUrl}
                                            alt="Favicon"
                                            className="w-8 h-8 object-contain"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium" style={{ color: colors.dark }}>Favicon uploaded</p>
                                        <p className="text-xs" style={{ color: colors.gray }}>Click remove to change</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRemoveImage('faviconUrl')}
                                        className="rounded-xl"
                                        style={{ borderColor: colors.purple, color: colors.dark }}
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
                                        onChange={(e) => handleImageUpload(e, 'faviconUrl')}
                                        className="hidden"
                                        id="favicon-upload"
                                    />
                                    <label
                                        htmlFor="favicon-upload"
                                        className="cursor-pointer flex flex-col items-center gap-2"
                                    >
                                        {uploading['faviconUrl'] ? (
                                            <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.accent }} />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: colors.purple }}>
                                                <Upload className="h-6 w-6" style={{ color: colors.dark }} />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium" style={{ color: colors.dark }}>
                                                {uploading['faviconUrl'] ? "Uploading..." : "Click to upload favicon"}
                                            </p>
                                            <p className="text-xs" style={{ color: colors.gray }}>ICO, PNG up to 2MB</p>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label style={{ color: colors.dark }}>Primary Color</Label>
                        <div className="flex items-center gap-2 mt-1.5">
                            <input
                                type="color"
                                value={settings.primaryColor}
                                onChange={(e) => setSettings(s => ({ ...s, primaryColor: e.target.value }))}
                                className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                            />
                            <Input
                                value={settings.primaryColor}
                                onChange={(e) => setSettings(s => ({ ...s, primaryColor: e.target.value }))}
                                className="flex-1"
                                style={{ backgroundColor: colors.light, borderColor: colors.purple, color: colors.dark }}
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
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.gray }} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: colors.dark }}>Settings</h1>
                    <p style={{ color: colors.gray }}>Configure platform-wide settings</p>
                </div>
                <Button
                    onClick={saveSettings}
                    disabled={saving}
                    className="rounded-xl"
                    style={{ backgroundColor: colors.accent, color: "white" }}
                >
                    {saving ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                    ) : saved ? (
                        <><Check className="mr-2 h-4 w-4" /> Saved!</>
                    ) : (
                        <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                    )}
                </Button>
            </div>

            {/* Settings Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {settingSections.map((section) => {
                    const Icon = section.icon;
                    return (
                        <Card key={section.title} className="border-0 shadow-sm rounded-2xl bg-white">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg" style={{ color: colors.dark }}>
                                    <Icon className="h-5 w-5" style={{ color: colors.accent }} />
                                    {section.title}
                                </CardTitle>
                                <CardDescription style={{ color: colors.gray }}>{section.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {section.fields}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

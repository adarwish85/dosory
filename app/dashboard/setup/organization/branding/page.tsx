"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { useTranslation } from "@/lib/i18n";

export default function BrandingPage() {
    const { settings, saveSettings, uploadLogo } = useOrganizationSettings();
    const { t } = useTranslation();
    const [uploading, setUploading] = useState<"light" | "dark" | "favicon" | null>(null);

    const handleUpload = async (file: File, type: "light" | "dark" | "favicon") => {
        try {
            setUploading(type);
            await uploadLogo(file, type);
            toast.success(type === "favicon" ? t("setup.branding.faviconUploaded") : t("setup.branding.logoUploaded"));
        } catch (error) {
            console.error(error);
            toast.error(t("setup.branding.uploadFailed"));
        } finally {
            setUploading(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("setup.branding.title")}</h1>
                <p className="text-gray-500 mt-1">
                    {t("setup.branding.subtitle")}
                </p>
            </div>

            <SettingsSection
                title={t("setup.branding.logosTitle")}
                description={t("setup.branding.logosDescription")}
            >
                <SettingsField label={t("setup.branding.logoLightLabel")} description={t("setup.branding.logoLightDescription")}>
                    {settings.logoLight && (
                        <div className="mt-2 mb-2 relative w-fit">
                            <div className="bg-gray-900 p-2 rounded-md">
                                <img src={settings.logoLight} alt={t("setup.branding.logoLightAlt")} className="h-12 object-contain" />
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 bg-red-100 hover:bg-red-200 rounded-full text-red-600"
                                onClick={() => saveSettings({ logoLight: "" })}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(file, "light");
                            }}
                            disabled={uploading === "light"}
                        />
                        {uploading === "light" && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                </SettingsField>

                <SettingsField label={t("setup.branding.logoDarkLabel")} description={t("setup.branding.logoDarkDescription")}>
                    {settings.logoDark && (
                        <div className="mt-2 mb-2 relative w-fit">
                            <div className="bg-white p-2 rounded-md border">
                                <img src={settings.logoDark} alt={t("setup.branding.logoDarkAlt")} className="h-12 object-contain" />
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 bg-red-100 hover:bg-red-200 rounded-full text-red-600"
                                onClick={() => saveSettings({ logoDark: "" })}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(file, "dark");
                            }}
                            disabled={uploading === "dark"}
                        />
                        {uploading === "dark" && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                </SettingsField>

                <SettingsField label={t("setup.branding.faviconLabel")} description={t("setup.branding.faviconDescription")}>
                    {settings.favicon && (
                        <div className="mt-2 mb-2 relative w-fit">
                            <img src={settings.favicon} alt={t("setup.branding.faviconLabel")} className="h-8 w-8 object-contain" />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 bg-red-100 hover:bg-red-200 rounded-full text-red-600"
                                onClick={() => saveSettings({ favicon: "" })}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                        <Input
                            type="file"
                            accept="image/x-icon,image/png"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(file, "favicon");
                            }}
                            disabled={uploading === "favicon"}
                        />
                        {uploading === "favicon" && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                </SettingsField>
            </SettingsSection>
        </div>
    );
}

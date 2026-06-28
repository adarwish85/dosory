"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";
import { useTranslation } from "@/lib/i18n";

export default function FileStoragePage() {
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const { t } = useTranslation();
    const [allowedFileTypes, setAllowedFileTypes] = useState("");

    useEffect(() => {
        if (!loading) {
            setAllowedFileTypes(settings.allowedFileTypes || "");
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings({ allowedFileTypes });
            toast.success(t("setup.fileStorage.saved"));
        } catch (error) {
            toast.error(t("setup.fileStorage.saveFailed"));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("setup.fileStorage.title")}</h1>
                <p className="text-gray-500 mt-1">
                    {t("setup.fileStorage.subtitle")}
                </p>
            </div>

            <SettingsSection title={t("setup.fileStorage.uploadRestrictionsTitle")} description={t("setup.fileStorage.uploadRestrictionsDescription")}>
                <SettingsField
                    label={t("setup.fileStorage.allowedFileTypesLabel")}
                    description={t("setup.fileStorage.allowedFileTypesDescription")}
                >
                    <Input
                        value={allowedFileTypes}
                        onChange={(e) => setAllowedFileTypes(e.target.value)}
                        placeholder=".pdf,.doc,.docx,.jpg,.png"
                    />
                </SettingsField>

                <SettingsSaveButton onClick={handleSave} loading={saving} />
            </SettingsSection>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";

export default function FileStoragePage() {
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [allowedFileTypes, setAllowedFileTypes] = useState("");

    useEffect(() => {
        if (!loading) {
            setAllowedFileTypes(settings.allowedFileTypes || "");
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings({ allowedFileTypes });
            toast.success("File storage settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">File Storage</h1>
                <p className="text-gray-500 mt-1">
                    Configure file upload restrictions and system-wide storage settings
                </p>
            </div>

            <SettingsSection title="Upload Restrictions" description="Control which file types can be uploaded to the system">
                <SettingsField
                    label="Allowed file types"
                    description="Separate file extensions with commas (e.g. .pdf,.jpg,.png)"
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

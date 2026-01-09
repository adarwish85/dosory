"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";
import { CURRENCIES, TIMEZONES } from "@/lib/constants";

export default function LocalizationPage() {
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [localizationForm, setLocalizationForm] = useState({
        dateFormat: "d/m/Y",
        timeFormat: "12" as "12" | "24",
        timezone: "Africa/Cairo",
        defaultLanguage: "english",
        currency: "USD",
    });

    useEffect(() => {
        if (!loading) {
            setLocalizationForm({
                dateFormat: settings.dateFormat ?? "d/m/Y",
                timeFormat: (settings.timeFormat as "12" | "24") ?? "12",
                timezone: settings.timezone ?? "Africa/Cairo",
                defaultLanguage: settings.defaultLanguage ?? "english",
                currency: settings.currency ?? "USD",
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings(localizationForm);
            toast.success("Localization settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Localization</h1>
                <p className="text-gray-500 mt-1">
                    Configure date, time, currency and language preferences
                </p>
            </div>

            <SettingsSection title="Regional Settings" description="Set your organization's locale preferences">
                <SettingsField label="Date Format">
                    <Select
                        value={localizationForm.dateFormat}
                        onValueChange={(val) => setLocalizationForm({ ...localizationForm, dateFormat: val })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="d/m/Y">d/m/Y</SelectItem>
                            <SelectItem value="m/d/Y">m/d/Y</SelectItem>
                            <SelectItem value="Y-m-d">Y-m-d</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label="Time Format">
                    <Select
                        value={localizationForm.timeFormat}
                        onValueChange={(val) => setLocalizationForm({ ...localizationForm, timeFormat: val as "12" | "24" })}
                    >
                        <SelectTrigger>
                            <SelectValue>12 hours</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="12">12 hours</SelectItem>
                            <SelectItem value="24">24 hours</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label="Default Timezone">
                    <Select
                        value={localizationForm.timezone}
                        onValueChange={(val) => setLocalizationForm({ ...localizationForm, timezone: val })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {TIMEZONES.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                    {tz.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label="Default Currency">
                    <Select
                        value={localizationForm.currency}
                        onValueChange={(val) => setLocalizationForm({ ...localizationForm, currency: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                            {CURRENCIES.map((currency) => (
                                <SelectItem key={currency.value} value={currency.value}>
                                    {currency.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label="Default Language">
                    <Select
                        value={localizationForm.defaultLanguage}
                        onValueChange={(val) =>
                            setLocalizationForm({ ...localizationForm, defaultLanguage: val })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue>English</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="english">English</SelectItem>
                            <SelectItem value="arabic">Arabic</SelectItem>
                            <SelectItem value="spanish">Spanish</SelectItem>
                            <SelectItem value="french">French</SelectItem>
                            <SelectItem value="german">German</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsSaveButton onClick={handleSave} loading={saving} />
            </SettingsSection>
        </div>
    );
}

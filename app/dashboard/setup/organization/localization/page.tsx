"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";
import { CURRENCIES, TIMEZONES } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";

export default function LocalizationPage() {
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const { t } = useTranslation();
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
            toast.success(t("setup.localization.saved"));
        } catch (error) {
            toast.error(t("setup.localization.saveFailed"));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("setup.localization.title")}</h1>
                <p className="text-gray-500 mt-1">
                    {t("setup.localization.subtitle")}
                </p>
            </div>

            <SettingsSection title={t("setup.localization.regionalSettingsTitle")} description={t("setup.localization.regionalSettingsDescription")}>
                <SettingsField label={t("setup.localization.dateFormatLabel")}>
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

                <SettingsField label={t("setup.localization.timeFormatLabel")}>
                    <Select
                        value={localizationForm.timeFormat}
                        onValueChange={(val) => setLocalizationForm({ ...localizationForm, timeFormat: val as "12" | "24" })}
                    >
                        <SelectTrigger>
                            {/* Childless so it shows the SELECTED value; a hardcoded child made
                                the trigger always read "12 Hour" regardless of the saved setting (bug #9a). */}
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="12">{t("setup.localization.time12")}</SelectItem>
                            <SelectItem value="24">{t("setup.localization.time24")}</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label={t("setup.localization.timezoneLabel")}>
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

                <SettingsField label={t("setup.localization.currencyLabel")}>
                    <Select
                        value={localizationForm.currency}
                        onValueChange={(val) => setLocalizationForm({ ...localizationForm, currency: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t("setup.localization.currencyPlaceholder")} />
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

                <SettingsField label={t("setup.localization.languageLabel")}>
                    <Select
                        value={localizationForm.defaultLanguage}
                        onValueChange={(val) =>
                            setLocalizationForm({ ...localizationForm, defaultLanguage: val })
                        }
                    >
                        <SelectTrigger>
                            {/* Childless so it reflects the saved value (bug #9a — was pinned to "English"). */}
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="english">{t("setup.localization.langEnglish")}</SelectItem>
                            <SelectItem value="arabic">{t("setup.localization.langArabic")}</SelectItem>
                            <SelectItem value="spanish">{t("setup.localization.langSpanish")}</SelectItem>
                            <SelectItem value="french">{t("setup.localization.langFrench")}</SelectItem>
                            <SelectItem value="german">{t("setup.localization.langGerman")}</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsSaveButton onClick={handleSave} loading={saving} />
            </SettingsSection>
        </div>
    );
}

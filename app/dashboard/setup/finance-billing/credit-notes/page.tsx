"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";

export default function FinanceCreditNotesPage() {
    const { t } = useTranslation();
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [creditNoteForm, setCreditNoteForm] = useState({
        creditNoteNumberPrefix: "CN-",
        creditNoteNextNumber: "000001",
        creditNoteNumberFormat: "number_based" as "number_based" | "year_based" | "mixed",
        creditNoteDecrementOnDelete: false,
        creditNoteShowProjectName: false,
        creditNoteDefaultClientNote: "",
        creditNoteDefaultTerms: "",
    });

    useEffect(() => {
        if (!loading) {
            setCreditNoteForm({
                creditNoteNumberPrefix: settings.creditNoteNumberPrefix ?? "CN-",
                creditNoteNextNumber: settings.creditNoteNextNumber ?? "000001",
                creditNoteNumberFormat: settings.creditNoteNumberFormat ?? "number_based",
                creditNoteDecrementOnDelete: settings.creditNoteDecrementOnDelete ?? false,
                creditNoteShowProjectName: settings.creditNoteShowProjectName ?? false,
                creditNoteDefaultClientNote: settings.creditNoteDefaultClientNote ?? "",
                creditNoteDefaultTerms: settings.creditNoteDefaultTerms ?? "",
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings(creditNoteForm as any);
            toast.success(t("setup.creditNotes.saveSuccess"));
        } catch (error) {
            toast.error(t("setup.creditNotes.saveError"));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("setup.creditNotes.title")}</h1>
                <p className="text-gray-500 mt-1">
                    {t("setup.creditNotes.subtitle")}
                </p>
            </div>

            <SettingsSection title={t("setup.creditNotes.formatSection")} description={t("setup.creditNotes.formatSectionDesc")}>
                <SettingsField label={t("setup.creditNotes.prefix")}>
                    <Input
                        value={creditNoteForm.creditNoteNumberPrefix}
                        onChange={(e) =>
                            setCreditNoteForm({ ...creditNoteForm, creditNoteNumberPrefix: e.target.value })
                        }
                    />
                </SettingsField>

                <SettingsField label={t("setup.creditNotes.nextNumber")}>
                    <Input
                        value={creditNoteForm.creditNoteNextNumber}
                        onChange={(e) =>
                            setCreditNoteForm({ ...creditNoteForm, creditNoteNextNumber: e.target.value })
                        }
                    />
                </SettingsField>

                <SettingsField label={t("setup.creditNotes.numberFormat")}>
                    <RadioGroup
                        value={creditNoteForm.creditNoteNumberFormat}
                        onValueChange={(val) =>
                            setCreditNoteForm({ ...creditNoteForm, creditNoteNumberFormat: val as any })
                        }
                        className="flex gap-4"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="number_based" id="cn-fmt-number" />
                            <Label htmlFor="cn-fmt-number" className="font-normal">
                                {t("setup.creditNotes.formatNumberBased")}
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="year_based" id="cn-fmt-year" />
                            <Label htmlFor="cn-fmt-year" className="font-normal">
                                {t("setup.creditNotes.formatYearBased")}
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="mixed" id="cn-fmt-mixed" />
                            <Label htmlFor="cn-fmt-mixed" className="font-normal">
                                000001-YY
                            </Label>
                        </div>
                    </RadioGroup>
                </SettingsField>
            </SettingsSection>

            <SettingsSection title={t("setup.creditNotes.behaviorSection")} description={t("setup.creditNotes.behaviorSectionDesc")}>
                <div className="flex items-center justify-between border-b pb-4">
                    <Label>{t("setup.creditNotes.decrementOnDelete")}</Label>
                    <Switch
                        checked={creditNoteForm.creditNoteDecrementOnDelete}
                        onCheckedChange={(val) =>
                            setCreditNoteForm({ ...creditNoteForm, creditNoteDecrementOnDelete: val })
                        }
                    />
                </div>

                <div className="flex items-center justify-between">
                    <Label>{t("setup.creditNotes.showProjectName")}</Label>
                    <Switch
                        checked={creditNoteForm.creditNoteShowProjectName}
                        onCheckedChange={(val) =>
                            setCreditNoteForm({ ...creditNoteForm, creditNoteShowProjectName: val })
                        }
                    />
                </div>
            </SettingsSection>

            <SettingsSection title={t("setup.creditNotes.defaultsSection")} description={t("setup.creditNotes.defaultsSectionDesc")}>
                <SettingsField label={t("setup.creditNotes.predefinedClientNote")}>
                    <Textarea
                        value={creditNoteForm.creditNoteDefaultClientNote}
                        onChange={(e) =>
                            setCreditNoteForm({ ...creditNoteForm, creditNoteDefaultClientNote: e.target.value })
                        }
                        className="h-24"
                    />
                </SettingsField>

                <SettingsField label={t("setup.creditNotes.predefinedTerms")}>
                    <Textarea
                        value={creditNoteForm.creditNoteDefaultTerms}
                        onChange={(e) =>
                            setCreditNoteForm({ ...creditNoteForm, creditNoteDefaultTerms: e.target.value })
                        }
                        className="h-24"
                    />
                </SettingsField>

                <SettingsSaveButton onClick={handleSave} loading={saving} />
            </SettingsSection>
        </div>
    );
}

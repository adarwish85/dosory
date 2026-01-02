"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";

export default function FinanceCreditNotesPage() {
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
            toast.success("Credit note settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Credit Notes</h1>
                <p className="text-gray-500 mt-1">
                    Configure credit note numbering and defaults
                </p>
            </div>

            <SettingsSection title="Format & Numbering" description="Configure how credit note numbers are generated">
                <SettingsField label="Credit Note Number Prefix">
                    <Input
                        value={creditNoteForm.creditNoteNumberPrefix}
                        onChange={(e) =>
                            setCreditNoteForm({ ...creditNoteForm, creditNoteNumberPrefix: e.target.value })
                        }
                    />
                </SettingsField>

                <SettingsField label="Next Credit Note Number">
                    <Input
                        value={creditNoteForm.creditNoteNextNumber}
                        onChange={(e) =>
                            setCreditNoteForm({ ...creditNoteForm, creditNoteNextNumber: e.target.value })
                        }
                    />
                </SettingsField>

                <SettingsField label="Credit Note Number Format">
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
                                Number Based (000001)
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="year_based" id="cn-fmt-year" />
                            <Label htmlFor="cn-fmt-year" className="font-normal">
                                Year Based (YYYY/000001)
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

            <SettingsSection title="Behavior" description="Control credit note behavior">
                <div className="flex items-center justify-between border-b pb-4">
                    <Label>Decrement Credit Note Number on Delete</Label>
                    <Switch
                        checked={creditNoteForm.creditNoteDecrementOnDelete}
                        onCheckedChange={(val) =>
                            setCreditNoteForm({ ...creditNoteForm, creditNoteDecrementOnDelete: val })
                        }
                    />
                </div>

                <div className="flex items-center justify-between">
                    <Label>Show Project Name on Credit Note</Label>
                    <Switch
                        checked={creditNoteForm.creditNoteShowProjectName}
                        onCheckedChange={(val) =>
                            setCreditNoteForm({ ...creditNoteForm, creditNoteShowProjectName: val })
                        }
                    />
                </div>
            </SettingsSection>

            <SettingsSection title="Defaults" description="Set default content for new credit notes">
                <SettingsField label="Predefined Client Note">
                    <Textarea
                        value={creditNoteForm.creditNoteDefaultClientNote}
                        onChange={(e) =>
                            setCreditNoteForm({ ...creditNoteForm, creditNoteDefaultClientNote: e.target.value })
                        }
                        className="h-24"
                    />
                </SettingsField>

                <SettingsField label="Predefined Terms & Conditions">
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

"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useOrganizationSettings, OrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";

export default function ESignSettingsPage() {
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [esignForm, setEsignForm] = useState({
        esignProposalRequireSignature: true,
        esignEstimateRequireSignature: true,
        esignLegalBoundText:
            'By clicking on "Sign", I consent to be legally bound by this electronic representation of my signature.',
    });

    useEffect(() => {
        if (!loading) {
            setEsignForm({
                esignProposalRequireSignature: settings.esignProposalRequireSignature ?? true,
                esignEstimateRequireSignature: settings.esignEstimateRequireSignature ?? true,
                esignLegalBoundText:
                    settings.esignLegalBoundText ??
                    'By clicking on "Sign", I consent to be legally bound by this electronic representation of my signature.',
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings(esignForm as any);
            toast.success("E-Sign settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">E-Signature Settings</h1>
                <p className="text-gray-500 mt-1">
                    Configure electronic signature requirements and legal text
                </p>
            </div>

            <SettingsSection title="Requirements" description="When signatures are required">
                {[
                    { key: "esignProposalRequireSignature", label: "Require digital signature on proposals" },
                    { key: "esignEstimateRequireSignature", label: "Require digital signature on estimates" },
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <Label className="block text-sm font-medium text-gray-700">{item.label}</Label>
                        <RadioGroup
                            value={esignForm[item.key as keyof typeof esignForm] ? "yes" : "no"}
                            onValueChange={(val) =>
                                setEsignForm({ ...esignForm, [item.key]: val === "yes" })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id={`esign-${item.key}-yes`} />
                                <Label htmlFor={`esign-${item.key}-yes`} className="font-normal">
                                    Yes
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`esign-${item.key}-no`} />
                                <Label htmlFor={`esign-${item.key}-no`} className="font-normal">
                                    No
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                ))}
            </SettingsSection>

            <SettingsSection title="Legal Text" description="Text displayed to signer">
                <div className="space-y-2">
                    <Label>Sign Legal Text</Label>
                    <Textarea
                        value={esignForm.esignLegalBoundText}
                        onChange={(e) =>
                            setEsignForm({ ...esignForm, esignLegalBoundText: e.target.value })
                        }
                        className="h-24"
                    />
                </div>

                <SettingsSaveButton onClick={handleSave} loading={saving} />
            </SettingsSection>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";

export default function ProposalsPage() {
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [proposalForm, setProposalForm] = useState({
        proposalNumberPrefix: "PRO-",
        proposalDueAfterDays: 7,
        proposalPipelineLimit: 0,
        proposalPipelineSort: "pipeline_order" as "pipeline_order" | "date",
        proposalPipelineSortOrder: "asc" as "asc" | "desc",
        proposalShowProjectName: false,
        proposalExcludeDrafts: false,
        proposalAutoConvert: false,
        proposalAllowStaffViewAssigned: false,
        proposalInfoFormat: "",
    });

    useEffect(() => {
        if (!loading) {
            setProposalForm({
                proposalNumberPrefix: settings.proposalNumberPrefix ?? "PRO-",
                proposalDueAfterDays: settings.proposalDueAfterDays ?? 7,
                proposalPipelineLimit: settings.proposalPipelineLimit ?? 0,
                proposalPipelineSort: settings.proposalPipelineSort ?? "pipeline_order",
                proposalPipelineSortOrder: settings.proposalPipelineSortOrder ?? "asc",
                proposalShowProjectName: settings.proposalShowProjectName ?? false,
                proposalExcludeDrafts: settings.proposalExcludeDrafts ?? false,
                proposalAutoConvert: settings.proposalAutoConvert ?? false,
                proposalAllowStaffViewAssigned: settings.proposalAllowStaffViewAssigned ?? false,
                proposalInfoFormat: settings.proposalInfoFormat ?? "",
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings(proposalForm as any);
            toast.success("Proposal settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
                <p className="text-gray-500 mt-1">
                    Configure proposal numbering, pipeline, and display settings
                </p>
            </div>

            <SettingsSection title="General" description="Basic proposal configurations">
                <SettingsField label="Proposal Number Prefix">
                    <Input
                        value={proposalForm.proposalNumberPrefix}
                        onChange={(e) =>
                            setProposalForm({ ...proposalForm, proposalNumberPrefix: e.target.value })
                        }
                    />
                </SettingsField>

                <SettingsField label="Proposal Due After (days)">
                    <Input
                        type="number"
                        value={proposalForm.proposalDueAfterDays}
                        onChange={(e) =>
                            setProposalForm({
                                ...proposalForm,
                                proposalDueAfterDays: parseInt(e.target.value) || 0,
                            })
                        }
                    />
                </SettingsField>
            </SettingsSection>

            <SettingsSection title="Pipeline" description="Pipeline view configuration">
                <SettingsField label="Pipeline limit per status">
                    <Input
                        type="number"
                        value={proposalForm.proposalPipelineLimit}
                        onChange={(e) =>
                            setProposalForm({
                                ...proposalForm,
                                proposalPipelineLimit: parseInt(e.target.value) || 0,
                            })
                        }
                    />
                </SettingsField>

                <SettingsField label="Default pipeline sort">
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                        <Select
                            value={proposalForm.proposalPipelineSort}
                            onValueChange={(val) =>
                                setProposalForm({ ...proposalForm, proposalPipelineSort: val as any })
                            }
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Sort By" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pipeline_order">Pipeline Order</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                            </SelectContent>
                        </Select>
                        <RadioGroup
                            value={proposalForm.proposalPipelineSortOrder}
                            onValueChange={(val) =>
                                setProposalForm({ ...proposalForm, proposalPipelineSortOrder: val as any })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="asc" id="sort-asc" />
                                <Label htmlFor="sort-asc">Ascending</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="desc" id="sort-desc" />
                                <Label htmlFor="sort-desc">Descending</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </SettingsField>
            </SettingsSection>

            <SettingsSection title="Behavior & Display" description="Control visibility and automation">
                {[
                    { key: "proposalShowProjectName", label: "Show Project Name On Proposal" },
                    {
                        key: "proposalExcludeDrafts",
                        label: "Exclude proposals with draft status from customers area",
                    },
                    {
                        key: "proposalAutoConvert",
                        label: "Auto convert the proposal to invoice after client accept (only customers related proposals)",
                    },
                    {
                        key: "proposalAllowStaffViewAssigned",
                        label: "Allow staff members to view proposals where they are assigned to",
                    },
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <Label className="block text-sm font-medium text-gray-700">{item.label}</Label>
                        <RadioGroup
                            value={proposalForm[item.key as keyof typeof proposalForm] ? "yes" : "no"}
                            onValueChange={(val) =>
                                setProposalForm({ ...proposalForm, [item.key]: val === "yes" })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id={`pf-${item.key}-yes`} />
                                <Label htmlFor={`pf-${item.key}-yes`} className="font-normal">
                                    Yes
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`pf-${item.key}-no`} />
                                <Label htmlFor={`pf-${item.key}-no`} className="font-normal">
                                    No
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                ))}
            </SettingsSection>

            <SettingsSection title="Proposal Format" description="Customize PDF and HTML output format">
                <SettingsField label="Proposal Info Format">
                    <Textarea
                        value={proposalForm.proposalInfoFormat}
                        onChange={(e) =>
                            setProposalForm({ ...proposalForm, proposalInfoFormat: e.target.value })
                        }
                        className="h-32 font-mono text-sm"
                    />
                    <p className="mt-2 text-xs text-blue-600 break-all">
                        {`{proposal_to}, {address}, {city}, {state}, {zip_code}, {country_code}, {country_name}, {phone}, {email}`}
                    </p>
                </SettingsField>

                <SettingsSaveButton onClick={handleSave} loading={saving} />
            </SettingsSection>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useOrganizationSettings, OrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";

export default function LeadsSettingsPage() {
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [leadsForm, setLeadsForm] = useState({
        leadsKanbanLimit: "50",
        leadsDefaultStatus: "new",
        leadsDefaultSource: "",
        leadsDuplicateValidationFields: "email",
        leadsAutoAssignAdminAfterConvert: false,
        leadsAllowNonAdminImport: false,
        leadsKanbanSort: "dateadded",
        leadsKanbanSortOrder: "desc",
        leadsDisableEditAfterConvert: false,
        leadsModalWidth: "modal-lg",
    });

    useEffect(() => {
        if (!loading) {
            setLeadsForm({
                leadsKanbanLimit: settings.leadsKanbanLimit?.toString() ?? "50",
                leadsDefaultStatus: settings.leadsDefaultStatus ?? "new",
                leadsDefaultSource: settings.leadsDefaultSource ?? "",
                leadsDuplicateValidationFields: settings.leadsDuplicateValidationFields ?? "email",
                leadsAutoAssignAdminAfterConvert: settings.leadsAutoAssignAdminAfterConvert ?? false,
                leadsAllowNonAdminImport: settings.leadsAllowNonAdminImport ?? false,
                leadsKanbanSort: settings.leadsKanbanSort ?? "dateadded",
                leadsKanbanSortOrder: settings.leadsKanbanSortOrder ?? "desc",
                leadsDisableEditAfterConvert: settings.leadsDisableEditAfterConvert ?? false,
                leadsModalWidth: settings.leadsModalWidth ?? "modal-lg",
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings({
                ...leadsForm,
                leadsKanbanLimit: parseInt(leadsForm.leadsKanbanLimit) || 50,
            } as any);
            toast.success("Leads settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Leads Settings</h1>
                <p className="text-gray-500 mt-1">
                    Configure lead management defaults, validation, and kanban view
                </p>
            </div>

            <SettingsSection title="General" description="Default behavior for leads">
                <SettingsField label="Leads Kanban Limit (per status)">
                    <Input
                        type="number"
                        value={leadsForm.leadsKanbanLimit}
                        onChange={(e) =>
                            setLeadsForm({ ...leadsForm, leadsKanbanLimit: e.target.value })
                        }
                    />
                </SettingsField>

                <SettingsField label="Default Status">
                    <Input
                        value={leadsForm.leadsDefaultStatus}
                        onChange={(e) =>
                            setLeadsForm({ ...leadsForm, leadsDefaultStatus: e.target.value })
                        }
                        placeholder="ID of default status"
                    />
                </SettingsField>

                <SettingsField label="Default Source">
                    <Input
                        value={leadsForm.leadsDefaultSource}
                        onChange={(e) =>
                            setLeadsForm({ ...leadsForm, leadsDefaultSource: e.target.value })
                        }
                        placeholder="ID of default source"
                    />
                </SettingsField>

                <SettingsField label="Unique Validation Fields (comma separated)">
                    <Input
                        value={leadsForm.leadsDuplicateValidationFields}
                        onChange={(e) =>
                            setLeadsForm({ ...leadsForm, leadsDuplicateValidationFields: e.target.value })
                        }
                        placeholder="email,phonenumber"
                    />
                </SettingsField>

                <SettingsField label="Modal Width Class (modal-lg, modal-xl, modal-xxl)">
                    <Input
                        value={leadsForm.leadsModalWidth}
                        onChange={(e) => setLeadsForm({ ...leadsForm, leadsModalWidth: e.target.value })}
                    />
                </SettingsField>
            </SettingsSection>

            <SettingsSection title="Automation & Permissions" description="Automated actions and access control">
                {[
                    {
                        key: "leadsAutoAssignAdminAfterConvert",
                        label: "Auto assign customer admin after converting lead to customer",
                    },
                    {
                        key: "leadsAllowNonAdminImport",
                        label: "Allow non-admin staff members to import leads",
                    },
                    {
                        key: "leadsDisableEditAfterConvert",
                        label: "Disable editing lead after converted to customer",
                    },
                ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <Label className="block text-sm font-medium text-gray-700">{item.label}</Label>
                        <RadioGroup
                            value={leadsForm[item.key as keyof typeof leadsForm] ? "yes" : "no"}
                            onValueChange={(val) =>
                                setLeadsForm({ ...leadsForm, [item.key]: val === "yes" })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id={`leads-${item.key}-yes`} />
                                <Label htmlFor={`leads-${item.key}-yes`} className="font-normal">
                                    Yes
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`leads-${item.key}-no`} />
                                <Label htmlFor={`leads-${item.key}-no`} className="font-normal">
                                    No
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                ))}
            </SettingsSection>

            <SettingsSection title="Kanban Sorting" description="Default sort order for kanban board">
                <SettingsField label="Sort By">
                    <Select
                        value={leadsForm.leadsKanbanSort}
                        onValueChange={(val) => setLeadsForm({ ...leadsForm, leadsKanbanSort: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dateadded">Date Created</SelectItem>
                            <SelectItem value="leadorder">Kanban Order</SelectItem>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="company">Company</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label="Sort Order">
                    <Select
                        value={leadsForm.leadsKanbanSortOrder}
                        onValueChange={(val) => setLeadsForm({ ...leadsForm, leadsKanbanSortOrder: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="asc">Ascending</SelectItem>
                            <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>
            </SettingsSection>

            <SettingsSaveButton onClick={handleSave} loading={saving} />
        </div>
    );
}

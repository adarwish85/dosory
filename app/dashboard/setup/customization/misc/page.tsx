"use client";

import { useState, useEffect } from "react";
import { Loader2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganizationSettings, OrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";

export default function MiscSettingsPage() {
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [miscForm, setMiscForm] = useState({
        miscRequireLoginForContract: false,
        miscDropboxAppKey: "",
        miscMaxFileSizeMedia: "50",
        miscMaxFileUploadsPost: "10",
        miscLimitTopSearchBarResults: "10",
        miscDefaultStaffRole: "employee",
        miscDeleteActivityLogOlderThan: "1",
        miscShowSetupMenuHover: false,
        miscShowHelpMenu: true,
        miscUseMinified: true,
        miscSaveLastTableOrder: false,
        miscShowTableExportButton: "admin",
        miscTablesPaginationLimit: "25",
        miscAllowNonAdminCreateLeadStatus: false,
        miscAllowNonAdminCreateLeadSource: false,
        miscAllowNonAdminCreateCustomerGroup: false,
        miscAllowNonAdminCreateService: false,
        miscAllowNonAdminSavePredefinedReplies: false,
        miscAllowNonAdminCreateContractType: false,
        miscAllowNonAdminCreateExpenseCategory: false,
    });

    useEffect(() => {
        if (!loading) {
            setMiscForm({
                miscRequireLoginForContract: settings.miscRequireLoginForContract ?? false,
                miscDropboxAppKey: settings.miscDropboxAppKey ?? "",
                miscMaxFileSizeMedia: settings.miscMaxFileSizeMedia?.toString() ?? "50",
                miscMaxFileUploadsPost: settings.miscMaxFileUploadsPost?.toString() ?? "10",
                miscLimitTopSearchBarResults: settings.miscLimitTopSearchBarResults?.toString() ?? "10",
                miscDefaultStaffRole: settings.miscDefaultStaffRole ?? "employee",
                miscDeleteActivityLogOlderThan: settings.miscDeleteActivityLogOlderThan?.toString() ?? "1",
                miscShowSetupMenuHover: settings.miscShowSetupMenuHover ?? false,
                miscShowHelpMenu: settings.miscShowHelpMenu ?? true,
                miscUseMinified: settings.miscUseMinified ?? true,
                miscSaveLastTableOrder: settings.miscSaveLastTableOrder ?? false,
                miscShowTableExportButton: settings.miscShowTableExportButton ?? "admin",
                miscTablesPaginationLimit: settings.miscTablesPaginationLimit?.toString() ?? "25",
                miscAllowNonAdminCreateLeadStatus: settings.miscAllowNonAdminCreateLeadStatus ?? false,
                miscAllowNonAdminCreateLeadSource: settings.miscAllowNonAdminCreateLeadSource ?? false,
                miscAllowNonAdminCreateCustomerGroup: settings.miscAllowNonAdminCreateCustomerGroup ?? false,
                miscAllowNonAdminCreateService: settings.miscAllowNonAdminCreateService ?? false,
                miscAllowNonAdminSavePredefinedReplies: settings.miscAllowNonAdminSavePredefinedReplies ?? false,
                miscAllowNonAdminCreateContractType: settings.miscAllowNonAdminCreateContractType ?? false,
                miscAllowNonAdminCreateExpenseCategory: settings.miscAllowNonAdminCreateExpenseCategory ?? false,
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings({
                ...miscForm,
                miscMaxFileSizeMedia: parseInt(miscForm.miscMaxFileSizeMedia) || 50,
                miscMaxFileUploadsPost: parseInt(miscForm.miscMaxFileUploadsPost) || 10,
                miscLimitTopSearchBarResults: parseInt(miscForm.miscLimitTopSearchBarResults) || 10,
                miscDeleteActivityLogOlderThan: parseInt(miscForm.miscDeleteActivityLogOlderThan) || 1,
                miscTablesPaginationLimit: parseInt(miscForm.miscTablesPaginationLimit) || 25,
            } as any);
            toast.success("Misc settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Miscellaneous Settings</h1>
                <p className="text-gray-500 mt-1">
                    System-wide configurations, permissions, and defaults
                </p>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="tables">Tables</TabsTrigger>
                    <TabsTrigger value="inline-create">Inline Create</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6 mt-6">
                    <SettingsSection title="System" description="General system behavior">
                        <div className="space-y-4">
                            <div>
                                <Label className="mb-2 block text-sm font-medium text-gray-700">
                                    Require client to be logged in to view contract
                                </Label>
                                <RadioGroup
                                    value={miscForm.miscRequireLoginForContract ? "yes" : "no"}
                                    onValueChange={(val) =>
                                        setMiscForm({ ...miscForm, miscRequireLoginForContract: val === "yes" })
                                    }
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="miscRequireLoginForContract-yes" />
                                        <Label htmlFor="miscRequireLoginForContract-yes" className="font-normal">
                                            Yes
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="miscRequireLoginForContract-no" />
                                        <Label htmlFor="miscRequireLoginForContract-no" className="font-normal">
                                            No
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <SettingsField label="Dropbox APP Key">
                                <Input
                                    value={miscForm.miscDropboxAppKey}
                                    onChange={(e) =>
                                        setMiscForm({ ...miscForm, miscDropboxAppKey: e.target.value })
                                    }
                                />
                            </SettingsField>

                            <SettingsField label="Max file size upload in Media (MB)">
                                <Input
                                    type="number"
                                    value={miscForm.miscMaxFileSizeMedia}
                                    onChange={(e) =>
                                        setMiscForm({ ...miscForm, miscMaxFileSizeMedia: e.target.value })
                                    }
                                />
                            </SettingsField>

                            <div>
                                <div className="flex items-center gap-1 mb-1">
                                    <HelpCircle className="h-4 w-4 text-gray-400" />
                                    <Label>Maximum files upload on post</Label>
                                </div>
                                <Input
                                    type="number"
                                    value={miscForm.miscMaxFileUploadsPost}
                                    onChange={(e) =>
                                        setMiscForm({ ...miscForm, miscMaxFileUploadsPost: e.target.value })
                                    }
                                />
                            </div>

                            <SettingsField label="Limit Top Search Bar Results to">
                                <Input
                                    type="number"
                                    value={miscForm.miscLimitTopSearchBarResults}
                                    onChange={(e) =>
                                        setMiscForm({ ...miscForm, miscLimitTopSearchBarResults: e.target.value })
                                    }
                                />
                            </SettingsField>

                            <SettingsField label="Default Staff Role">
                                <Select
                                    value={miscForm.miscDefaultStaffRole}
                                    onValueChange={(val) => setMiscForm({ ...miscForm, miscDefaultStaffRole: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="employee">Employee</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </SettingsField>

                            <SettingsField label="Delete system activity log older then X months">
                                <Input
                                    type="number"
                                    value={miscForm.miscDeleteActivityLogOlderThan}
                                    onChange={(e) =>
                                        setMiscForm({ ...miscForm, miscDeleteActivityLogOlderThan: e.target.value })
                                    }
                                />
                            </SettingsField>

                            {[
                                {
                                    key: "miscShowSetupMenuHover",
                                    label: "Show setup menu item only when hover with mouse on main sidebar area",
                                },
                                { key: "miscShowHelpMenu", label: "Show help menu item on setup menu" },
                                {
                                    key: "miscUseMinified",
                                    label: "Use minified files version for css and js (only system files)",
                                },
                            ].map((item) => (
                                <div key={item.key}>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">
                                        {item.label}
                                    </Label>
                                    <RadioGroup
                                        value={miscForm[item.key as keyof typeof miscForm] ? "yes" : "no"}
                                        onValueChange={(val) =>
                                            setMiscForm({ ...miscForm, [item.key]: val === "yes" })
                                        }
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`misc-${item.key}-yes`} />
                                            <Label htmlFor={`misc-${item.key}-yes`} className="font-normal">
                                                Yes
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`misc-${item.key}-no`} />
                                            <Label htmlFor={`misc-${item.key}-no`} className="font-normal">
                                                No
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>
                    </SettingsSection>
                </TabsContent>

                <TabsContent value="tables" className="space-y-6 mt-6">
                    <SettingsSection title="Table Behavior" description="Configuration for data tables">
                        <div>
                            <div className="flex items-center gap-1 mb-2">
                                <HelpCircle className="h-4 w-4 text-gray-400" />
                                <Label className="block text-sm font-medium text-gray-700">
                                    Save last order for tables
                                </Label>
                            </div>
                            <RadioGroup
                                value={miscForm.miscSaveLastTableOrder ? "yes" : "no"}
                                onValueChange={(val) =>
                                    setMiscForm({ ...miscForm, miscSaveLastTableOrder: val === "yes" })
                                }
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="yes" id="miscSaveLastTableOrder-yes" />
                                    <Label htmlFor="miscSaveLastTableOrder-yes" className="font-normal">
                                        Yes
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="miscSaveLastTableOrder-no" />
                                    <Label htmlFor="miscSaveLastTableOrder-no" className="font-normal">
                                        No
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div>
                            <Label className="mb-2 block text-sm font-medium text-gray-700">
                                Show table export button
                            </Label>
                            <RadioGroup
                                value={miscForm.miscShowTableExportButton}
                                onValueChange={(val) =>
                                    setMiscForm({ ...miscForm, miscShowTableExportButton: val })
                                }
                                className="space-y-2"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="all" id="export-all" />
                                    <Label htmlFor="export-all" className="font-normal">
                                        To all staff members
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="admin" id="export-admin" />
                                    <Label htmlFor="export-admin" className="font-normal">
                                        Only to administrators
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="hide" id="export-hide" />
                                    <Label htmlFor="export-hide" className="font-normal">
                                        Hide export button for all staff members
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <SettingsField label="Tables Pagination Limit">
                            <Input
                                type="number"
                                value={miscForm.miscTablesPaginationLimit}
                                onChange={(e) =>
                                    setMiscForm({ ...miscForm, miscTablesPaginationLimit: e.target.value })
                                }
                            />
                        </SettingsField>
                    </SettingsSection>
                </TabsContent>

                <TabsContent value="inline-create" className="space-y-6 mt-6">
                    <SettingsSection title="Inline Creation" description="Permissions for creating items on the fly">
                        {[
                            {
                                key: "miscAllowNonAdminCreateLeadStatus",
                                label: "Allow non-admin staff members to create Lead Status in Lead create/edit area?",
                            },
                            {
                                key: "miscAllowNonAdminCreateLeadSource",
                                label: "Allow non-admin staff members to create Lead Source in Lead create/edit area?",
                            },
                            {
                                key: "miscAllowNonAdminCreateCustomerGroup",
                                label: "Allow non-admin staff members to create Customer Group in Customer create/edit area?",
                            },
                            {
                                key: "miscAllowNonAdminCreateService",
                                label: "Allow non-admin staff members to create Service in Ticket create/edit area?",
                            },
                            {
                                key: "miscAllowNonAdminSavePredefinedReplies",
                                label: "Allow non-admin staff members to save predefined replies from ticket message",
                            },
                            {
                                key: "miscAllowNonAdminCreateContractType",
                                label: "Allow non-admin staff members to create Contract type in Contract create/edit area?",
                            },
                            {
                                key: "miscAllowNonAdminCreateExpenseCategory",
                                label: "Allow non-admin staff members to create Expense Category in Expense create/edit area?",
                            },
                        ].map((item) => (
                            <div key={item.key} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                <Label className="block text-sm font-medium text-gray-700">{item.label}</Label>
                                <RadioGroup
                                    value={miscForm[item.key as keyof typeof miscForm] ? "yes" : "no"}
                                    onValueChange={(val) =>
                                        setMiscForm({ ...miscForm, [item.key]: val === "yes" })
                                    }
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id={`misc-${item.key}-yes`} />
                                        <Label htmlFor={`misc-${item.key}-yes`} className="font-normal">
                                            Yes
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id={`misc-${item.key}-no`} />
                                        <Label htmlFor={`misc-${item.key}-no`} className="font-normal">
                                            No
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        ))}
                    </SettingsSection>
                </TabsContent>
            </Tabs>

            <SettingsSaveButton onClick={handleSave} loading={saving} />
        </div>
    );
}

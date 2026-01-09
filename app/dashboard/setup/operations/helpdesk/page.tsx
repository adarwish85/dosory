"use client";

import { useState, useEffect } from "react";
import { HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganizationSettings, OrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";

export default function HelpdeskSettingsPage() {
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [supportForm, setSupportForm] = useState({
        supportUseServices: false,
        supportDisablePublicUrl: false,
        supportStaffLimitToAssignedDepartments: false,
        supportStaffNotificationAssignedOnly: false,
        supportNotifyOnNewTicket: false,
        supportNotifyOnCustomerReply: false,
        supportStaffOpenTicketsAllContacts: false,
        supportAutoAssignFirstReplyStaff: false,
        supportAllowNonStaffAccess: false,
        supportAllowNonAdminDeleteAttachments: false,
        supportAllowNonAdminDeleteTickets: false,
        supportAllowCustomerChangeStatus: false,
        supportCustomerShowContactTicketsOnly: false,
        supportTicketReplyOrder: "asc",
        supportEnableBadge: false,
        supportDefaultReplyStatus: "in_progress",
        supportMaxAttachments: 0,
        supportAllowedExtensions: "",
    });

    useEffect(() => {
        if (!loading) {
            setSupportForm({
                supportUseServices: settings.supportUseServices ?? false,
                supportDisablePublicUrl: settings.supportDisablePublicUrl ?? false,
                supportStaffLimitToAssignedDepartments: settings.supportStaffLimitToAssignedDepartments ?? false,
                supportStaffNotificationAssignedOnly: settings.supportStaffNotificationAssignedOnly ?? false,
                supportNotifyOnNewTicket: settings.supportNotifyOnNewTicket ?? false,
                supportNotifyOnCustomerReply: settings.supportNotifyOnCustomerReply ?? false,
                supportStaffOpenTicketsAllContacts: settings.supportStaffOpenTicketsAllContacts ?? false,
                supportAutoAssignFirstReplyStaff: settings.supportAutoAssignFirstReplyStaff ?? false,
                supportAllowNonStaffAccess: settings.supportAllowNonStaffAccess ?? false,
                supportAllowNonAdminDeleteAttachments: settings.supportAllowNonAdminDeleteAttachments ?? false,
                supportAllowNonAdminDeleteTickets: settings.supportAllowNonAdminDeleteTickets ?? false,
                supportAllowCustomerChangeStatus: settings.supportAllowCustomerChangeStatus ?? false,
                supportCustomerShowContactTicketsOnly: settings.supportCustomerShowContactTicketsOnly ?? false,
                supportTicketReplyOrder: settings.supportTicketReplyOrder ?? "asc",
                supportEnableBadge: settings.supportEnableBadge ?? false,
                supportDefaultReplyStatus: settings.supportDefaultReplyStatus ?? "in_progress",
                supportMaxAttachments: settings.supportMaxAttachments ?? 0,
                supportAllowedExtensions: settings.supportAllowedExtensions ?? "",
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings(supportForm as Partial<OrganizationSettings>);
            toast.success("Helpdesk settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Helpdesk Settings</h1>
                <p className="text-gray-500 mt-1">
                    Configure support ticket behavior, notifications, and permissions
                </p>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
                    <TabsTrigger
                        value="general"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-2"
                    >
                        General
                    </TabsTrigger>
                    <TabsTrigger
                        value="email_piping"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-2"
                    >
                        Email Piping
                    </TabsTrigger>
                    <TabsTrigger
                        value="ticket_form"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-2"
                    >
                        Ticket Form
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6">
                    <SettingsSection title="General Helpdesk" description="Basic support configuration">
                        {[
                            { key: "supportUseServices", label: "Use services" },
                            { key: "supportDisablePublicUrl", label: "Disable Ticket Public URL" },
                            {
                                key: "supportStaffLimitToAssignedDepartments",
                                label: "Allow staff to access only ticket that belongs to staff departments",
                            },
                            {
                                key: "supportStaffNotificationAssignedOnly",
                                label: "Send staff-related ticket notifications to the ticket assignee only",
                                help: true,
                            },
                            {
                                key: "supportNotifyOnNewTicket",
                                label: "Receive notification on new ticket opened",
                                help: true,
                            },
                            {
                                key: "supportNotifyOnCustomerReply",
                                label: "Receive notification when customer reply to a ticket",
                                help: true,
                            },
                            {
                                key: "supportStaffOpenTicketsAllContacts",
                                label: "Allow staff members to open tickets to all contacts",
                                help: true,
                            },
                            {
                                key: "supportAutoAssignFirstReplyStaff",
                                label: "Automatically assign the ticket to the first staff that post a reply",
                            },
                            {
                                key: "supportAllowNonStaffAccess",
                                label: "Allow access to tickets for non staff members",
                            },
                            {
                                key: "supportAllowNonAdminDeleteAttachments",
                                label: "Allow non-admin staff members to delete ticket attachments",
                            },
                            {
                                key: "supportAllowNonAdminDeleteTickets",
                                label: "Allow non-admin staff members to delete tickets and replies",
                            },
                            {
                                key: "supportAllowCustomerChangeStatus",
                                label: "Allow customer to change ticket status from customers area",
                            },
                            {
                                key: "supportCustomerShowContactTicketsOnly",
                                label: "In customers area only show tickets related to the logged in contact (Primary contact not applied)",
                            },
                        ].map((item: any) => (
                            <div key={item.key} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                <Label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                    {item.help && <HelpCircle className="h-4 w-4 text-gray-400" />}
                                    {item.label}
                                </Label>
                                <RadioGroup
                                    value={supportForm[item.key as keyof typeof supportForm] ? "yes" : "no"}
                                    onValueChange={(val) =>
                                        setSupportForm({ ...supportForm, [item.key]: val === "yes" })
                                    }
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id={`supp-${item.key}-yes`} />
                                        <Label htmlFor={`supp-${item.key}-yes`} className="font-normal">
                                            Yes
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id={`supp-${item.key}-no`} />
                                        <Label htmlFor={`supp-${item.key}-no`} className="font-normal">
                                            No
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        ))}
                    </SettingsSection>

                    <SettingsSection title="Display & Behavior" description="Reply order and defaults">
                        <SettingsField label="Ticket Replies Order">
                            <RadioGroup
                                value={supportForm.supportTicketReplyOrder}
                                onValueChange={(val) =>
                                    setSupportForm({ ...supportForm, supportTicketReplyOrder: val })
                                }
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="asc" id="rep-asc" />
                                    <Label htmlFor="rep-asc" className="font-normal">
                                        Ascending
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="desc" id="rep-desc" />
                                    <Label htmlFor="rep-desc" className="font-normal">
                                        Descending
                                    </Label>
                                </div>
                            </RadioGroup>
                        </SettingsField>

                        <SettingsField label="Enable support menu item badge">
                            <RadioGroup
                                value={supportForm.supportEnableBadge ? "yes" : "no"}
                                onValueChange={(val) =>
                                    setSupportForm({ ...supportForm, supportEnableBadge: val === "yes" })
                                }
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="yes" id="badge-yes" />
                                    <Label htmlFor="badge-yes" className="font-normal">
                                        Yes
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="badge-no" />
                                    <Label htmlFor="badge-no" className="font-normal">
                                        No
                                    </Label>
                                </div>
                            </RadioGroup>
                        </SettingsField>

                        <SettingsField label="Default status selected when replying to ticket">
                            <Select
                                value={supportForm.supportDefaultReplyStatus}
                                onValueChange={(val) =>
                                    setSupportForm({ ...supportForm, supportDefaultReplyStatus: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="answered">Answered</SelectItem>
                                    <SelectItem value="hold">On Hold</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingsField>
                    </SettingsSection>

                    <SettingsSection title="Attachments" description="File upload restrictions">
                        <SettingsField label="Maximum ticket attachments">
                            <Input
                                type="number"
                                value={supportForm.supportMaxAttachments}
                                onChange={(e) =>
                                    setSupportForm({ ...supportForm, supportMaxAttachments: parseInt(e.target.value) || 0 })
                                }
                            />
                        </SettingsField>

                        <SettingsField label="Allowed attachments file extensions">
                            <Input
                                value={supportForm.supportAllowedExtensions}
                                onChange={(e) =>
                                    setSupportForm({ ...supportForm, supportAllowedExtensions: e.target.value })
                                }
                                placeholder="jpg, png, pdf, doc, docx"
                            />
                        </SettingsField>
                    </SettingsSection>

                    <SettingsSaveButton onClick={handleSave} loading={saving} />
                </TabsContent>

                <TabsContent value="email_piping">
                    <div className="bg-white p-12 text-center rounded-lg border text-gray-500">
                        Email Piping Settings (Coming Soon)
                    </div>
                </TabsContent>

                <TabsContent value="ticket_form">
                    <div className="bg-white p-12 text-center rounded-lg border text-gray-500">
                        Ticket Form Settings (Coming Soon)
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

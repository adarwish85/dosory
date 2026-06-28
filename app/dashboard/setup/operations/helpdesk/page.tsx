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
import { useTranslation } from "@/lib/i18n";

export default function HelpdeskSettingsPage() {
    const { t } = useTranslation();
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
            toast.success(t("setup.helpdesk.saveSuccess"));
        } catch (error) {
            toast.error(t("setup.helpdesk.saveError"));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("setup.helpdesk.title")}</h1>
                <p className="text-gray-500 mt-1">
                    {t("setup.helpdesk.subtitle")}
                </p>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
                    <TabsTrigger
                        value="general"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-2"
                    >
                        {t("setup.helpdesk.tabGeneral")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="email_piping"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-2"
                    >
                        {t("setup.helpdesk.tabEmailPiping")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="ticket_form"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-2"
                    >
                        {t("setup.helpdesk.tabTicketForm")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6">
                    <SettingsSection title={t("setup.helpdesk.generalSectionTitle")} description={t("setup.helpdesk.generalSectionDesc")}>
                        {[
                            { key: "supportUseServices", label: t("setup.helpdesk.useServices") },
                            { key: "supportDisablePublicUrl", label: t("setup.helpdesk.disablePublicUrl") },
                            {
                                key: "supportStaffLimitToAssignedDepartments",
                                label: t("setup.helpdesk.staffLimitToDepartments"),
                            },
                            {
                                key: "supportStaffNotificationAssignedOnly",
                                label: t("setup.helpdesk.staffNotificationAssignedOnly"),
                                help: true,
                            },
                            {
                                key: "supportNotifyOnNewTicket",
                                label: t("setup.helpdesk.notifyOnNewTicket"),
                                help: true,
                            },
                            {
                                key: "supportNotifyOnCustomerReply",
                                label: t("setup.helpdesk.notifyOnCustomerReply"),
                                help: true,
                            },
                            {
                                key: "supportStaffOpenTicketsAllContacts",
                                label: t("setup.helpdesk.staffOpenTicketsAllContacts"),
                                help: true,
                            },
                            {
                                key: "supportAutoAssignFirstReplyStaff",
                                label: t("setup.helpdesk.autoAssignFirstReplyStaff"),
                            },
                            {
                                key: "supportAllowNonStaffAccess",
                                label: t("setup.helpdesk.allowNonStaffAccess"),
                            },
                            {
                                key: "supportAllowNonAdminDeleteAttachments",
                                label: t("setup.helpdesk.allowNonAdminDeleteAttachments"),
                            },
                            {
                                key: "supportAllowNonAdminDeleteTickets",
                                label: t("setup.helpdesk.allowNonAdminDeleteTickets"),
                            },
                            {
                                key: "supportAllowCustomerChangeStatus",
                                label: t("setup.helpdesk.allowCustomerChangeStatus"),
                            },
                            {
                                key: "supportCustomerShowContactTicketsOnly",
                                label: t("setup.helpdesk.customerShowContactTicketsOnly"),
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
                                            {t("common.yes")}
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id={`supp-${item.key}-no`} />
                                        <Label htmlFor={`supp-${item.key}-no`} className="font-normal">
                                            {t("common.no")}
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        ))}
                    </SettingsSection>

                    <SettingsSection title={t("setup.helpdesk.displaySectionTitle")} description={t("setup.helpdesk.displaySectionDesc")}>
                        <SettingsField label={t("setup.helpdesk.ticketRepliesOrder")}>
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
                                        {t("setup.helpdesk.ascending")}
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="desc" id="rep-desc" />
                                    <Label htmlFor="rep-desc" className="font-normal">
                                        {t("setup.helpdesk.descending")}
                                    </Label>
                                </div>
                            </RadioGroup>
                        </SettingsField>

                        <SettingsField label={t("setup.helpdesk.enableBadge")}>
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
                                        {t("common.yes")}
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="badge-no" />
                                    <Label htmlFor="badge-no" className="font-normal">
                                        {t("common.no")}
                                    </Label>
                                </div>
                            </RadioGroup>
                        </SettingsField>

                        <SettingsField label={t("setup.helpdesk.defaultReplyStatus")}>
                            <Select
                                value={supportForm.supportDefaultReplyStatus}
                                onValueChange={(val) =>
                                    setSupportForm({ ...supportForm, supportDefaultReplyStatus: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("setup.helpdesk.selectPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="in_progress">{t("setup.helpdesk.statusInProgress")}</SelectItem>
                                    <SelectItem value="answered">{t("setup.helpdesk.statusAnswered")}</SelectItem>
                                    <SelectItem value="hold">{t("setup.helpdesk.statusOnHold")}</SelectItem>
                                    <SelectItem value="closed">{t("setup.helpdesk.statusClosed")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingsField>
                    </SettingsSection>

                    <SettingsSection title={t("setup.helpdesk.attachmentsSectionTitle")} description={t("setup.helpdesk.attachmentsSectionDesc")}>
                        <SettingsField label={t("setup.helpdesk.maxAttachments")}>
                            <Input
                                type="number"
                                value={supportForm.supportMaxAttachments}
                                onChange={(e) =>
                                    setSupportForm({ ...supportForm, supportMaxAttachments: parseInt(e.target.value) || 0 })
                                }
                            />
                        </SettingsField>

                        <SettingsField label={t("setup.helpdesk.allowedExtensions")}>
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
                        {t("setup.helpdesk.emailPipingComingSoon")}
                    </div>
                </TabsContent>

                <TabsContent value="ticket_form">
                    <div className="bg-white p-12 text-center rounded-lg border text-gray-500">
                        {t("setup.helpdesk.ticketFormComingSoon")}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

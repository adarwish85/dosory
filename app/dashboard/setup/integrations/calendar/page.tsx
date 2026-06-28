"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
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
import { useTranslation } from "@/lib/i18n";

export default function CalendarSettingsPage() {
    const { t } = useTranslation();
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [calendarForm, setCalendarForm] = useState({
        calendarEventsLimit: "4",
        calendarDefaultView: "dayGridMonth",
        calendarFirstDay: "0",
        calendarShowHideNotifiedReminders: false,
        calendarShowTicketReminders: true,
        calendarShowLeadReminders: true,
        calendarShowInvoices: true,
        calendarShowCustomerReminders: true,
        calendarShowEstimates: true,
        calendarShowEstimateReminders: true,
        calendarShowContracts: true,
        calendarShowInvoiceReminders: true,
        calendarShowTasks: true,
        calendarShowTasksStaffOnly: true,
        calendarShowExpenseReminders: true,
        calendarShowProjects: true,
        calendarShowTaskReminders: true,
        calendarShowCreditNoteReminders: true,
        calendarInvoiceColor: "#ff6f00",
        calendarEstimateColor: "#ff6f00",
        calendarReminderColor: "#03a9f4",
        calendarContractColor: "#b72974",
        calendarProjectColor: "#b72974",
    });

    useEffect(() => {
        if (!loading) {
            setCalendarForm({
                calendarEventsLimit: settings.calendarEventsLimit?.toString() ?? "4",
                calendarDefaultView: settings.calendarDefaultView ?? "dayGridMonth",
                calendarFirstDay: settings.calendarFirstDay ?? "0",
                calendarShowHideNotifiedReminders: settings.calendarShowHideNotifiedReminders ?? false,
                calendarShowTicketReminders: settings.calendarShowTicketReminders ?? true,
                calendarShowLeadReminders: settings.calendarShowLeadReminders ?? true,
                calendarShowInvoices: settings.calendarShowInvoices ?? true,
                calendarShowCustomerReminders: settings.calendarShowCustomerReminders ?? true,
                calendarShowEstimates: settings.calendarShowEstimates ?? true,
                calendarShowEstimateReminders: settings.calendarShowEstimateReminders ?? true,
                calendarShowContracts: settings.calendarShowContracts ?? true,
                calendarShowInvoiceReminders: settings.calendarShowInvoiceReminders ?? true,
                calendarShowTasks: settings.calendarShowTasks ?? true,
                calendarShowTasksStaffOnly: settings.calendarShowTasksStaffOnly ?? true,
                calendarShowExpenseReminders: settings.calendarShowExpenseReminders ?? true,
                calendarShowProjects: settings.calendarShowProjects ?? true,
                calendarShowTaskReminders: settings.calendarShowTaskReminders ?? true,
                calendarShowCreditNoteReminders: settings.calendarShowCreditNoteReminders ?? true,
                calendarInvoiceColor: settings.calendarInvoiceColor ?? "#ff6f00",
                calendarEstimateColor: settings.calendarEstimateColor ?? "#ff6f00",
                calendarReminderColor: settings.calendarReminderColor ?? "#03a9f4",
                calendarContractColor: settings.calendarContractColor ?? "#b72974",
                calendarProjectColor: settings.calendarProjectColor ?? "#b72974",
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings({
                ...calendarForm,
                calendarEventsLimit: parseInt(calendarForm.calendarEventsLimit) || 4,
            } as any);
            toast.success(t("setup.calendar.saveSuccess"));
        } catch (error) {
            toast.error(t("setup.calendar.saveError"));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("setup.calendar.title")}</h1>
                <p className="text-gray-500 mt-1">
                    {t("setup.calendar.subtitle")}
                </p>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="general">{t("setup.calendar.tabGeneral")}</TabsTrigger>
                    <TabsTrigger value="styling">{t("setup.calendar.tabStyling")}</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6 mt-6">
                    <SettingsSection title={t("setup.calendar.viewOptionsTitle")} description={t("setup.calendar.viewOptionsDesc")}>
                        <SettingsField label={t("setup.calendar.eventsLimit")}>
                            <Input
                                type="number"
                                value={calendarForm.calendarEventsLimit}
                                onChange={(e) =>
                                    setCalendarForm({ ...calendarForm, calendarEventsLimit: e.target.value })
                                }
                            />
                        </SettingsField>

                        <SettingsField label={t("setup.calendar.defaultView")}>
                            <Select
                                value={calendarForm.calendarDefaultView}
                                onValueChange={(val) =>
                                    setCalendarForm({ ...calendarForm, calendarDefaultView: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("common.select")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="dayGridMonth">{t("setup.calendar.viewMonth")}</SelectItem>
                                    <SelectItem value="timeGridWeek">{t("setup.calendar.viewWeek")}</SelectItem>
                                    <SelectItem value="timeGridDay">{t("setup.calendar.viewDay")}</SelectItem>
                                    <SelectItem value="listWeek">{t("setup.calendar.viewAgendaWeek")}</SelectItem>
                                    <SelectItem value="listDay">{t("setup.calendar.viewAgendaDay")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingsField>

                        <SettingsField label={t("setup.calendar.firstDay")}>
                            <Select
                                value={calendarForm.calendarFirstDay}
                                onValueChange={(val) =>
                                    setCalendarForm({ ...calendarForm, calendarFirstDay: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("common.select")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">{t("setup.calendar.sunday")}</SelectItem>
                                    <SelectItem value="1">{t("setup.calendar.monday")}</SelectItem>
                                    <SelectItem value="2">{t("setup.calendar.tuesday")}</SelectItem>
                                    <SelectItem value="3">{t("setup.calendar.wednesday")}</SelectItem>
                                    <SelectItem value="4">{t("setup.calendar.thursday")}</SelectItem>
                                    <SelectItem value="5">{t("setup.calendar.friday")}</SelectItem>
                                    <SelectItem value="6">{t("setup.calendar.saturday")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingsField>
                    </SettingsSection>

                    <SettingsSection title={t("setup.calendar.visibilityTitle")} description={t("setup.calendar.visibilityDesc")}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                {
                                    key: "calendarShowHideNotifiedReminders",
                                    label: "setup.calendar.vis.hideNotifiedReminders",
                                },
                                { key: "calendarShowTicketReminders", label: "setup.calendar.vis.ticketReminders" },
                                { key: "calendarShowLeadReminders", label: "setup.calendar.vis.leadReminders" },
                                { key: "calendarShowInvoices", label: "setup.calendar.vis.invoices" },
                                { key: "calendarShowCustomerReminders", label: "setup.calendar.vis.customerReminders" },
                                { key: "calendarShowEstimates", label: "setup.calendar.vis.estimates" },
                                { key: "calendarShowEstimateReminders", label: "setup.calendar.vis.estimateReminders" },
                                { key: "calendarShowContracts", label: "setup.calendar.vis.contracts" },
                                { key: "calendarShowInvoiceReminders", label: "setup.calendar.vis.invoiceReminders" },
                                { key: "calendarShowTasks", label: "setup.calendar.vis.tasks" },
                                {
                                    key: "calendarShowTasksStaffOnly",
                                    label: "setup.calendar.vis.tasksStaffOnly",
                                },
                                { key: "calendarShowExpenseReminders", label: "setup.calendar.vis.expenseReminders" },
                                { key: "calendarShowProjects", label: "setup.calendar.vis.projects" },
                                { key: "calendarShowTaskReminders", label: "setup.calendar.vis.taskReminders" },
                                { key: "calendarShowCreditNoteReminders", label: "setup.calendar.vis.creditNoteReminders" },
                            ].map((item) => (
                                <div key={item.key}>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">
                                        {t(item.label)}
                                    </Label>
                                    <RadioGroup
                                        value={
                                            calendarForm[item.key as keyof typeof calendarForm]
                                                ? "yes"
                                                : "no"
                                        }
                                        onValueChange={(val) =>
                                            setCalendarForm({ ...calendarForm, [item.key]: val === "yes" })
                                        }
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id={`cal-${item.key}-yes`} />
                                            <Label htmlFor={`cal-${item.key}-yes`} className="font-normal">
                                                {t("common.yes")}
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`cal-${item.key}-no`} />
                                            <Label htmlFor={`cal-${item.key}-no`} className="font-normal">
                                                {t("common.no")}
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            ))}
                        </div>
                    </SettingsSection>
                    <SettingsSaveButton onClick={handleSave} loading={saving} />
                </TabsContent>

                <TabsContent value="styling" className="space-y-6 mt-6">
                    <SettingsSection title={t("setup.calendar.colorsTitle")} description={t("setup.calendar.colorsDesc")}>
                        {[
                            { key: "calendarInvoiceColor", label: "setup.calendar.color.invoice" },
                            { key: "calendarEstimateColor", label: "setup.calendar.color.estimate" },
                            { key: "calendarReminderColor", label: "setup.calendar.color.reminder" },
                            { key: "calendarContractColor", label: "setup.calendar.color.contract" },
                            { key: "calendarProjectColor", label: "setup.calendar.color.project" },
                        ].map((item) => (
                            <div key={item.key}>
                                <Label>{t(item.label)}</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        value={calendarForm[item.key as keyof typeof calendarForm] as string}
                                        onChange={(e) =>
                                            setCalendarForm({ ...calendarForm, [item.key]: e.target.value })
                                        }
                                        className="flex-1"
                                    />
                                    <div
                                        className="w-10 h-10 rounded border shrink-0"
                                        style={{
                                            backgroundColor: calendarForm[
                                                item.key as keyof typeof calendarForm
                                            ] as string,
                                        }}
                                    />
                                    <Input
                                        type="color"
                                        value={calendarForm[item.key as keyof typeof calendarForm] as string}
                                        onChange={(e) =>
                                            setCalendarForm({ ...calendarForm, [item.key]: e.target.value })
                                        }
                                        className="w-12 p-1 h-10"
                                    />
                                </div>
                            </div>
                        ))}
                        <SettingsSaveButton onClick={handleSave} loading={saving} />
                    </SettingsSection>
                </TabsContent>
            </Tabs>
        </div>
    );
}

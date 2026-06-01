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

export default function CalendarSettingsPage() {
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
            toast.success("Calendar settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Calendar Settings</h1>
                <p className="text-gray-500 mt-1">
                    Configure calendar view defaults and visibility
                </p>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="styling">Styling</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6 mt-6">
                    <SettingsSection title="View Options" description="Default calendar behavior">
                        <SettingsField label="Calendar Events Limit (Month and Week View)">
                            <Input
                                type="number"
                                value={calendarForm.calendarEventsLimit}
                                onChange={(e) =>
                                    setCalendarForm({ ...calendarForm, calendarEventsLimit: e.target.value })
                                }
                            />
                        </SettingsField>

                        <SettingsField label="Default View">
                            <Select
                                value={calendarForm.calendarDefaultView}
                                onValueChange={(val) =>
                                    setCalendarForm({ ...calendarForm, calendarDefaultView: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="dayGridMonth">Month</SelectItem>
                                    <SelectItem value="timeGridWeek">Week</SelectItem>
                                    <SelectItem value="timeGridDay">Day</SelectItem>
                                    <SelectItem value="listWeek">Agenda Week</SelectItem>
                                    <SelectItem value="listDay">Agenda Day</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingsField>

                        <SettingsField label="First Day">
                            <Select
                                value={calendarForm.calendarFirstDay}
                                onValueChange={(val) =>
                                    setCalendarForm({ ...calendarForm, calendarFirstDay: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">Sunday</SelectItem>
                                    <SelectItem value="1">Monday</SelectItem>
                                    <SelectItem value="2">Tuesday</SelectItem>
                                    <SelectItem value="3">Wednesday</SelectItem>
                                    <SelectItem value="4">Thursday</SelectItem>
                                    <SelectItem value="5">Friday</SelectItem>
                                    <SelectItem value="6">Saturday</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingsField>
                    </SettingsSection>

                    <SettingsSection title="Visibility" description="Show or hide items on calendar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                {
                                    key: "calendarShowHideNotifiedReminders",
                                    label: "Hide notified reminders from calendar",
                                },
                                { key: "calendarShowTicketReminders", label: "Ticket Reminders" },
                                { key: "calendarShowLeadReminders", label: "Lead Reminders" },
                                { key: "calendarShowInvoices", label: "Invoices" },
                                { key: "calendarShowCustomerReminders", label: "Customer Reminders" },
                                { key: "calendarShowEstimates", label: "Estimates" },
                                { key: "calendarShowEstimateReminders", label: "Estimate Reminders" },
                                { key: "calendarShowContracts", label: "Contracts" },
                                { key: "calendarShowInvoiceReminders", label: "Invoice Reminders" },
                                { key: "calendarShowTasks", label: "Tasks" },
                                {
                                    key: "calendarShowTasksStaffOnly",
                                    label: "Show only tasks assigned to the logged in staff member",
                                },
                                { key: "calendarShowExpenseReminders", label: "Expense Reminders" },
                                { key: "calendarShowProjects", label: "Projects" },
                                { key: "calendarShowTaskReminders", label: "Task Reminders" },
                                { key: "calendarShowCreditNoteReminders", label: "Credit Note Reminders" },
                            ].map((item) => (
                                <div key={item.key}>
                                    <Label className="mb-2 block text-sm font-medium text-gray-700">
                                        {item.label}
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
                                                Yes
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id={`cal-${item.key}-no`} />
                                            <Label htmlFor={`cal-${item.key}-no`} className="font-normal">
                                                No
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
                    <SettingsSection title="Colors" description="Event type colors">
                        {[
                            { key: "calendarInvoiceColor", label: "Invoice Color" },
                            { key: "calendarEstimateColor", label: "Estimate Color" },
                            { key: "calendarReminderColor", label: "Reminder Color" },
                            { key: "calendarContractColor", label: "Contract Color" },
                            { key: "calendarProjectColor", label: "Project Color" },
                        ].map((item) => (
                            <div key={item.key}>
                                <Label>{item.label}</Label>
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

"use client";

import { useState, useEffect } from "react";
import { HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useOrganizationSettings, OrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsField } from "@/components/dashboard/setup/settings/SettingsField";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";
import { useTranslation } from "@/lib/i18n";

export default function TasksSettingsPage() {
    const { t } = useTranslation();
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [tasksForm, setTasksForm] = useState({
        tasksKanbanLimit: 0,
        tasksAllowStaffViewAllProjectTasks: false,
        tasksAllowEditCommentsFirstHourOnly: false,
        tasksAutoAssignCreator: false,
        tasksAutoAddCreatorAsFollower: false,
        tasksStopOtherTimers: false,
        tasksAutoStartTimer: false,
        tasksBillableDefault: false,
        tasksTimerRoundOff: "no_round",
        tasksTimerRoundOffMultiples: "5",
        tasksDefaultStatus: "to_do",
        tasksDefaultPriority: "medium",
        tasksModalWidth: "modal-lg",
    });

    useEffect(() => {
        if (!loading) {
            setTasksForm({
                tasksKanbanLimit: settings.tasksKanbanLimit ?? 0,
                tasksAllowStaffViewAllProjectTasks: settings.tasksAllowStaffViewAllProjectTasks ?? false,
                tasksAllowEditCommentsFirstHourOnly: settings.tasksAllowEditCommentsFirstHourOnly ?? false,
                tasksAutoAssignCreator: settings.tasksAutoAssignCreator ?? false,
                tasksAutoAddCreatorAsFollower: settings.tasksAutoAddCreatorAsFollower ?? false,
                tasksStopOtherTimers: settings.tasksStopOtherTimers ?? false,
                tasksAutoStartTimer: settings.tasksAutoStartTimer ?? false,
                tasksBillableDefault: settings.tasksBillableDefault ?? false,
                tasksTimerRoundOff: settings.tasksTimerRoundOff ?? "no_round",
                tasksTimerRoundOffMultiples: settings.tasksTimerRoundOffMultiples ?? "5",
                tasksDefaultStatus: settings.tasksDefaultStatus ?? "to_do",
                tasksDefaultPriority: settings.tasksDefaultPriority ?? "medium",
                tasksModalWidth: settings.tasksModalWidth ?? "modal-lg",
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings(tasksForm as Partial<OrganizationSettings>);
            toast.success(t("setup.tasks.saveSuccess"));
        } catch (error) {
            toast.error(t("setup.tasks.saveError"));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("setup.tasks.title")}</h1>
                <p className="text-gray-500 mt-1">
                    {t("setup.tasks.subtitle")}
                </p>
            </div>

            <SettingsSection title={t("setup.tasks.generalSectionTitle")} description={t("setup.tasks.generalSectionDesc")}>
                <SettingsField label={t("setup.tasks.kanbanLimit")}>
                    <Input
                        type="number"
                        value={tasksForm.tasksKanbanLimit}
                        onChange={(e) =>
                            setTasksForm({ ...tasksForm, tasksKanbanLimit: parseInt(e.target.value) || 0 })
                        }
                    />
                </SettingsField>

                <SettingsField label={t("setup.tasks.modalWidthClass")}>
                    <Input
                        value={tasksForm.tasksModalWidth}
                        onChange={(e) => setTasksForm({ ...tasksForm, tasksModalWidth: e.target.value })}
                        placeholder="modal-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        {t("setup.tasks.modalWidthHelp")}
                    </p>
                </SettingsField>
            </SettingsSection>

            <SettingsSection title={t("setup.tasks.behaviorSectionTitle")} description={t("setup.tasks.behaviorSectionDesc")}>
                {[
                    {
                        key: "tasksAllowStaffViewAllProjectTasks",
                        label: t("setup.tasks.allowStaffViewAll"),
                    },
                    {
                        key: "tasksAllowEditCommentsFirstHourOnly",
                        label: t("setup.tasks.allowEditCommentsFirstHour"),
                    },
                    {
                        key: "tasksAutoAssignCreator",
                        label: t("setup.tasks.autoAssignCreator"),
                        help: true,
                    },
                    {
                        key: "tasksAutoAddCreatorAsFollower",
                        label: t("setup.tasks.autoAddCreatorAsFollower"),
                    },
                    {
                        key: "tasksStopOtherTimers",
                        label: t("setup.tasks.stopOtherTimers"),
                    },
                    {
                        key: "tasksAutoStartTimer",
                        label: t("setup.tasks.autoStartTimer"),
                    },
                    {
                        key: "tasksBillableDefault",
                        label: t("setup.tasks.billableDefault"),
                    },
                ].map((item: any) => (
                    <div key={item.key} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <Label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                            {item.help && <HelpCircle className="h-4 w-4 text-gray-400" />}
                            {item.label}
                        </Label>
                        <RadioGroup
                            value={tasksForm[item.key as keyof typeof tasksForm] ? "yes" : "no"}
                            onValueChange={(val) =>
                                setTasksForm({ ...tasksForm, [item.key]: val === "yes" })
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id={`task-${item.key}-yes`} />
                                <Label htmlFor={`task-${item.key}-yes`} className="font-normal">
                                    {t("common.yes")}
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`task-${item.key}-no`} />
                                <Label htmlFor={`task-${item.key}-no`} className="font-normal">
                                    {t("common.no")}
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                ))}
            </SettingsSection>

            <SettingsSection title={t("setup.tasks.timersSectionTitle")} description={t("setup.tasks.timersSectionDesc")}>
                <SettingsField label={t("setup.tasks.roundOffTimer")}>
                    <Select
                        value={tasksForm.tasksTimerRoundOff}
                        onValueChange={(val) => setTasksForm({ ...tasksForm, tasksTimerRoundOff: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t("setup.tasks.selectPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="no_round">{t("setup.tasks.roundNone")}</SelectItem>
                            <SelectItem value="round_up">{t("setup.tasks.roundUp")}</SelectItem>
                            <SelectItem value="round_down">{t("setup.tasks.roundDown")}</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label={t("setup.tasks.multiplesOfMinutes")}>
                    <Select
                        value={tasksForm.tasksTimerRoundOffMultiples}
                        onValueChange={(val) =>
                            setTasksForm({ ...tasksForm, tasksTimerRoundOffMultiples: val })
                        }
                    >
                        <SelectTrigger className="w-24">
                            <SelectValue placeholder="5" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="15">15</SelectItem>
                            <SelectItem value="30">30</SelectItem>
                            <SelectItem value="45">45</SelectItem>
                            <SelectItem value="60">60</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>
            </SettingsSection>

            <SettingsSection title={t("setup.tasks.defaultsSectionTitle")} description={t("setup.tasks.defaultsSectionDesc")}>
                <SettingsField label={t("setup.tasks.defaultStatus")}>
                    <Select
                        value={tasksForm.tasksDefaultStatus}
                        onValueChange={(val) => setTasksForm({ ...tasksForm, tasksDefaultStatus: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t("setup.tasks.selectPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="to_do">{t("setup.tasks.statusNotStarted")}</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label={t("setup.tasks.defaultPriority")}>
                    <Select
                        value={tasksForm.tasksDefaultPriority}
                        onValueChange={(val) => setTasksForm({ ...tasksForm, tasksDefaultPriority: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t("setup.tasks.selectPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">{t("setup.tasks.priorityLow")}</SelectItem>
                            <SelectItem value="medium">{t("setup.tasks.priorityMedium")}</SelectItem>
                            <SelectItem value="high">{t("setup.tasks.priorityHigh")}</SelectItem>
                            <SelectItem value="urgent">{t("setup.tasks.priorityUrgent")}</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsSaveButton onClick={handleSave} loading={saving} />
            </SettingsSection>
        </div>
    );
}

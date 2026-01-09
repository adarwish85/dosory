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

export default function TasksSettingsPage() {
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
            toast.success("Tasks settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
                <p className="text-gray-500 mt-1">
                    Manage task defaults, visibility, and timer settings
                </p>
            </div>

            <SettingsSection title="General" description="Basic task configurations">
                <SettingsField label="Limit tasks kanban rows per status">
                    <Input
                        type="number"
                        value={tasksForm.tasksKanbanLimit}
                        onChange={(e) =>
                            setTasksForm({ ...tasksForm, tasksKanbanLimit: parseInt(e.target.value) || 0 })
                        }
                    />
                </SettingsField>

                <SettingsField label="Modal Width Class">
                    <Input
                        value={tasksForm.tasksModalWidth}
                        onChange={(e) => setTasksForm({ ...tasksForm, tasksModalWidth: e.target.value })}
                        placeholder="modal-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Use Bootstrap classes like modal-lg, modal-xl, modal-xxl
                    </p>
                </SettingsField>
            </SettingsSection>

            <SettingsSection title="Behavior & Visibility" description="Control task permissions and interactions">
                {[
                    {
                        key: "tasksAllowStaffViewAllProjectTasks",
                        label: "Allow all staff to see all tasks related to projects (includes non-staff)",
                    },
                    {
                        key: "tasksAllowEditCommentsFirstHourOnly",
                        label: "Allow customer/staff to add/edit task comments only in the first hour",
                    },
                    {
                        key: "tasksAutoAssignCreator",
                        label: "Auto assign task creator when new task is created",
                        help: true,
                    },
                    {
                        key: "tasksAutoAddCreatorAsFollower",
                        label: "Auto add task creator as task follower when new task is created",
                    },
                    {
                        key: "tasksStopOtherTimers",
                        label: "Stop all other started timers when starting new timer",
                    },
                    {
                        key: "tasksAutoStartTimer",
                        label: "Change task status to In Progress on timer started",
                    },
                    {
                        key: "tasksBillableDefault",
                        label: "Billable option is by default checked when new task is created",
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
                                    Yes
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`task-${item.key}-no`} />
                                <Label htmlFor={`task-${item.key}-no`} className="font-normal">
                                    No
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                ))}
            </SettingsSection>

            <SettingsSection title="Timers" description="Timer rounding and behavior">
                <SettingsField label="Round off task timer">
                    <Select
                        value={tasksForm.tasksTimerRoundOff}
                        onValueChange={(val) => setTasksForm({ ...tasksForm, tasksTimerRoundOff: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="no_round">Don't round off</SelectItem>
                            <SelectItem value="round_up">Round up</SelectItem>
                            <SelectItem value="round_down">Round down</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label="multiplies of (minutes)">
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

            <SettingsSection title="Defaults" description="Default values for new tasks">
                <SettingsField label="Default status when new task is created">
                    <Select
                        value={tasksForm.tasksDefaultStatus}
                        onValueChange={(val) => setTasksForm({ ...tasksForm, tasksDefaultStatus: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="to_do">Not Started</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsField label="Default Priority">
                    <Select
                        value={tasksForm.tasksDefaultPriority}
                        onValueChange={(val) => setTasksForm({ ...tasksForm, tasksDefaultPriority: val })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                    </Select>
                </SettingsField>

                <SettingsSaveButton onClick={handleSave} loading={saving} />
            </SettingsSection>
        </div>
    );
}

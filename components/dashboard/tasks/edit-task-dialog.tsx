"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { taskFormSchema, TaskFormData } from "@/lib/schemas";
import { useTasks, useProjects } from "@/lib/hooks/use-projects";
import { useMilestones } from "@/lib/hooks/use-project-data";
import { useTaskLists } from "@/lib/hooks/use-task-lists";
import { useAssignableStaff } from "@/lib/hooks/use-staff";
import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Task } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

interface EditTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: Task;
}

export function EditTaskDialog({ open, onOpenChange, task }: EditTaskDialogProps) {
    const { t } = useTranslation();
    const { updateTask } = useTasks();
    const { staff } = useAssignableStaff();
    const { projects } = useProjects();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Contextual State
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(task.projectId || null);
    const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(task.milestoneId || null);
    const [isGeneralTask, setIsGeneralTask] = useState<boolean>(!task.projectId);

    const { milestones } = useMilestones(selectedProjectId || undefined);
    const { taskLists } = useTaskLists({ projectId: selectedProjectId || undefined });

    const form = useForm<TaskFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(taskFormSchema) as any,
        defaultValues: {
            name: task.name,
            description: task.description || "",
            status: task.status,
            priority: task.priority,
            assignees: task.assignees || [],
            followers: task.followers || [],
            isPublic: task.isPublic || false,
            billable: task.billable || false,
            hourlyRate: task.hourlyRate || 0,
            dueDate: task.dueDate ? task.dueDate.toDate() : undefined,
            startDate: task.startDate ? task.startDate.toDate() : undefined,
            relatedTo: task.relatedTo,
            customerId: task.customerId,
            projectId: task.projectId,
            milestoneId: task.milestoneId,
            taskListId: task.taskListId,
        },
    });

    // Reset form when task changes
    useEffect(() => {
        if (open && task) {
            const hasProject = !!task.projectId;
            setIsGeneralTask(!hasProject);
            setSelectedProjectId(task.projectId || null);
            setSelectedMilestoneId(task.milestoneId || null);

            form.reset({
                name: task.name,
                description: task.description || "",
                status: task.status,
                priority: task.priority,
                assignees: task.assignees || [],
                followers: task.followers || [],
                isPublic: task.isPublic || false,
                billable: task.billable || false,
                hourlyRate: task.hourlyRate || 0,
                dueDate: task.dueDate ? task.dueDate.toDate() : undefined,
                startDate: task.startDate ? task.startDate.toDate() : undefined,
                relatedTo: task.relatedTo,
                customerId: task.customerId,
                projectId: task.projectId,
                milestoneId: task.milestoneId,
                taskListId: task.taskListId,
            });
        }
    }, [open, task, form]);

    // Handle "General Task" toggle
    const handleGeneralTaskChange = (checked: boolean) => {
        setIsGeneralTask(checked);
        if (checked) {
            // Clear project fields
            setSelectedProjectId(null);
            setSelectedMilestoneId(null);
            form.setValue("projectId", undefined);
            form.setValue("milestoneId", undefined);
            form.setValue("taskListId", undefined);
        } else {
            // If untoggling, user will select project manually, no action needed yet
        }
    };

    const handleProjectChange = (projectId: string) => {
        setSelectedProjectId(projectId);
        form.setValue("projectId", projectId);

        // Reset cascading fields
        setSelectedMilestoneId(null);
        form.setValue("milestoneId", undefined);
        form.setValue("taskListId", undefined);
    };

    const handleMilestoneChange = (milestoneId: string) => {
        setSelectedMilestoneId(milestoneId);
        form.setValue("milestoneId", milestoneId);

        // Reset cascading fields
        form.setValue("taskListId", undefined);
    };

    const onSubmit = async (data: TaskFormData) => {
        try {
            setIsSubmitting(true);
            await updateTask(task.id, data);
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to update task:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t("tasks.dialog.editTitle")}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("tasks.field.subjectRequired")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("tasks.field.subjectPlaceholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex items-center space-x-2 pb-2">
                            <Checkbox
                                id="general-task"
                                checked={isGeneralTask}
                                onCheckedChange={handleGeneralTaskChange}
                            />
                            <label
                                htmlFor="general-task"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                {t("tasks.field.generalTask")}
                            </label>
                        </div>

                        {!isGeneralTask && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="projectId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("tasks.field.project")}</FormLabel>
                                                <Select value={field.value} onValueChange={handleProjectChange}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t("tasks.field.selectProject")} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {projects.map((p) => (
                                                            <SelectItem key={p.id} value={p.id}>
                                                                {p.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="milestoneId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("tasks.field.milestone")}</FormLabel>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={handleMilestoneChange}
                                                    disabled={!selectedProjectId}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue
                                                                placeholder={t("tasks.field.selectMilestone")}
                                                            />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {milestones.map((m) => (
                                                            <SelectItem key={m.id} value={m.id}>
                                                                {m.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="taskListId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("tasks.field.taskList")}</FormLabel>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    disabled={!selectedProjectId}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue
                                                                placeholder={t("tasks.field.selectTaskList")}
                                                            />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {taskLists
                                                            .filter(
                                                                (tl) =>
                                                                    !selectedMilestoneId ||
                                                                    tl.milestoneId === selectedMilestoneId
                                                            )
                                                            .map((tl) => (
                                                                <SelectItem key={tl.id} value={tl.id}>
                                                                    {tl.name}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="hourlyRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("tasks.field.hourlyRate")}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormItem>
                                <FormLabel>{t("tasks.field.repeatEvery")}</FormLabel>
                                <Select disabled>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("tasks.field.nothingSelected")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">{t("tasks.repeat.daily")}</SelectItem>
                                        <SelectItem value="weekly">{t("tasks.repeat.weekly")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>{t("tasks.field.startDate")}</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, "PPP")
                                                        ) : (
                                                            <span>{t("tasks.field.pickDate")}</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) => date < new Date("1900-01-01")}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="dueDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>{t("tasks.field.dueDate")}</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, "PPP")
                                                        ) : (
                                                            <span>{t("tasks.field.pickDate")}</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) => date < new Date("1900-01-01")}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("tasks.field.priority")}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("tasks.field.selectPriority")} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="low">{t("tasks.priority.low")}</SelectItem>
                                                <SelectItem value="medium">{t("tasks.priority.medium")}</SelectItem>
                                                <SelectItem value="high">{t("tasks.priority.high")}</SelectItem>
                                                <SelectItem value="urgent">{t("tasks.priority.urgent")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormItem>
                                <FormLabel>{t("tasks.field.relatedTo")}</FormLabel>
                                <Select disabled defaultValue={task.relatedTo?.type || "lead"}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("tasks.field.selectType")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="lead">{t("tasks.relatedTo.lead")}</SelectItem>
                                        <SelectItem value="customer">{t("tasks.relatedTo.customer")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="assignees"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("tasks.field.assignees")}</FormLabel>
                                        <Select onValueChange={(val) => field.onChange([...field.value, val])}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("tasks.field.selectAssignees")} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {staff.map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {s.firstName} {s.lastName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {t("tasks.field.assignedCount", { count: field.value.length })}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="followers"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("tasks.field.followers")}</FormLabel>
                                        <Select onValueChange={(val) => field.onChange([...(field.value || []), val])}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("tasks.field.selectFollowers")} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {staff.map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {s.firstName} {s.lastName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {t("tasks.field.followersCount", { count: (field.value || []).length })}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("tasks.field.taskDescription")}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t("tasks.field.addDescription")}
                                            className="min-h-[100px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                {t("common.close")}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t("common.saveChanges")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

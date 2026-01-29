"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { taskFormSchema, TaskFormData } from "@/lib/schemas";
import { Task } from "@/lib/types";
import { useTasks, useProjects } from "@/lib/hooks/use-projects";
import { useMilestones } from "@/lib/hooks/use-project-data";
import { useTaskLists } from "@/lib/hooks/use-task-lists";
import { useStaff } from "@/lib/hooks/use-staff";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";

interface CreateTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadId?: string;
    leadName?: string;
    customerId?: string;
    customerName?: string;
    initialData?: Partial<Task>; // Task data for editing
    taskId?: string; // ID of task being edited
}

export function CreateTaskDialog({
    open,
    onOpenChange,
    leadId,
    leadName,
    customerId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    customerName,
    initialData,
    taskId,
}: CreateTaskDialogProps) {
    const { createTask, updateTask } = useTasks();
    const { projects } = useProjects();
    const { staff } = useStaff();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Contextual State
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
    const [isGeneralTask, setIsGeneralTask] = useState<boolean>(true); // Default to General (no project) unless context dictates otherwise
    const [startDateOpen, setStartDateOpen] = useState(false);
    const [dueDateOpen, setDueDateOpen] = useState(false);

    const { milestones } = useMilestones(selectedProjectId || undefined);
    const { taskLists } = useTaskLists({ projectId: selectedProjectId || undefined });

    const form = useForm<TaskFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(taskFormSchema) as any,
        defaultValues: {
            name: "",
            description: "",
            status: "to_do",
            priority: "medium",
            assignees: [],
            followers: [],
            isPublic: false,
            billable: false,
            hourlyRate: 0,
            relatedTo: leadId
                ? { type: "lead", id: leadId }
                : customerId
                  ? { type: "customer", id: customerId }
                  : undefined,
            customerId: customerId,
            projectId: undefined,
            milestoneId: undefined,
            taskListId: undefined,
        },
    });

    useEffect(() => {
        if (open) {
            setIsGeneralTask(true);
            setSelectedProjectId(null);
            setSelectedMilestoneId(null);

            // If editing, use initialData, otherwise use defaults
            if (initialData) {
                form.reset({
                    ...initialData,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    startDate: ((initialData.startDate as any)?.toDate
                        ? (initialData.startDate as any).toDate()
                        : initialData.startDate) as Date,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    dueDate: ((initialData.dueDate as any)?.toDate
                        ? (initialData.dueDate as any).toDate()
                        : initialData.dueDate) as Date,
                });
            } else {
                form.reset({
                    name: "",
                    description: "",
                    status: "to_do",
                    priority: "medium",
                    assignees: [],
                    followers: [],
                    isPublic: false,
                    billable: false,
                    hourlyRate: 0,
                    relatedTo: leadId
                        ? { type: "lead", id: leadId }
                        : customerId
                          ? { type: "customer", id: customerId }
                          : undefined,
                    customerId: customerId,
                    projectId: undefined,
                    milestoneId: undefined,
                    taskListId: undefined,
                });
            }
        }
    }, [open, leadId, customerId, form, initialData]);

    const handleGeneralTaskChange = (checked: boolean) => {
        setIsGeneralTask(checked);
        if (checked) {
            setSelectedProjectId(null);
            setSelectedMilestoneId(null);
            form.setValue("projectId", undefined);
            form.setValue("milestoneId", undefined);
            form.setValue("taskListId", undefined);
        }
    };

    const handleProjectChange = (projectId: string) => {
        setSelectedProjectId(projectId);
        form.setValue("projectId", projectId);
        setSelectedMilestoneId(null);
        form.setValue("milestoneId", undefined);
        form.setValue("taskListId", undefined);
    };

    const handleMilestoneChange = (milestoneId: string) => {
        setSelectedMilestoneId(milestoneId);
        form.setValue("milestoneId", milestoneId);
        form.setValue("taskListId", undefined);
    };

    const onSubmit = async (data: TaskFormData) => {
        try {
            setIsSubmitting(true);
            if (taskId) {
                // Editing existing task
                await updateTask(taskId, data);
            } else {
                // Creating new task
                await createTask(data);
            }
            onOpenChange(false);
            form.reset();
        } catch (error) {
            console.error("Failed to save task:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{taskId ? "Edit Task" : "Create Task"}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Task subject" {...field} />
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
                                General Task (Not linked to any project)
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
                                                <FormLabel>Project</FormLabel>
                                                <Select value={field.value} onValueChange={handleProjectChange}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select project" />
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
                                                <FormLabel>Milestone</FormLabel>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={handleMilestoneChange}
                                                    disabled={!selectedProjectId}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select milestone" />
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
                                                <FormLabel>Task List</FormLabel>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    disabled={!selectedProjectId}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select task list" />
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
                                        <FormLabel>Hourly Rate</FormLabel>
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

                            {/* Placeholder for Repeat every - keeping it mostly visual for now or simple select */}
                            <FormItem>
                                <FormLabel>Repeat every</FormLabel>
                                <Select disabled>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Nothing selected" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
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
                                        <FormLabel>Start Date</FormLabel>
                                        <Popover open={startDateOpen} onOpenChange={setStartDateOpen} modal={true}>
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
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={(date) => {
                                                        field.onChange(date);
                                                        setStartDateOpen(false);
                                                    }}
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
                                        <FormLabel>Due Date</FormLabel>
                                        <Popover open={dueDateOpen} onOpenChange={setDueDateOpen} modal={true}>
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
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={(date) => {
                                                        field.onChange(date);
                                                        setDueDateOpen(false);
                                                    }}
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
                                        <FormLabel>Priority</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select priority" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="urgent">Urgent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormItem>
                                <FormLabel>Related To</FormLabel>
                                <Select disabled defaultValue="lead">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="lead">Lead</SelectItem>
                                        <SelectItem value="customer">Customer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        </div>

                        {leadId && (
                            <FormItem>
                                <FormLabel>Lead</FormLabel>
                                <Input value={leadName || "Current Lead"} disabled />
                            </FormItem>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="assignees"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Assignees</FormLabel>
                                        <Select
                                            onValueChange={(val) => field.onChange([...field.value, val])} // Simplified: Append one, not real multiselect UI here
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select assignees" />
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
                                            {field.value.length} assigned
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
                                        <FormLabel>Followers</FormLabel>
                                        <Select onValueChange={(val) => field.onChange([...(field.value || []), val])}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select followers" />
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
                                            {(field.value || []).length} followers
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
                                    <FormLabel>Task Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Add Description" className="min-h-[100px]" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Close
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

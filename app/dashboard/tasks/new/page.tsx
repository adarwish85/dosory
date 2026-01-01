"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskFormSchema, type TaskFormData } from "@/lib/schemas";
import { useTasks, useProjects, useTaskLists } from "@/lib/hooks";
import { useMilestones } from "@/lib/hooks/use-project-data";
import { useCustomers } from "@/lib/hooks/use-customers";
import { useStaff } from "@/lib/hooks/use-staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format, isAfter } from "date-fns";
import { Calendar as CalendarIcon, Loader2, ChevronLeft, AlertTriangle, FolderTree, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

export default function CreateTaskPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const customerIdParam = searchParams.get("customerId");
    const projectIdParam = searchParams.get("projectId");

    const { createTask } = useTasks();
    const { customers } = useCustomers({ status: "active" });
    const { projects } = useProjects({ status: "in_progress", customerId: customerIdParam || undefined });
    const { staff } = useStaff();

    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<TaskFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(taskFormSchema) as any,
        defaultValues: {
            name: "",
            customerId: customerIdParam || "",
            projectId: projectIdParam || "",
            status: "not_started",
            priority: "medium",
            assignees: [],
            tags: [],
            isPublic: false,
            billable: false,
            milestoneId: "",
            taskListId: "",
        },
    });

    const { register, handleSubmit, formState: { errors }, setValue, watch } = form;
    const customerId = watch("customerId");
    const projectId = watch("projectId");
    const milestoneId = watch("milestoneId");
    const selectedDueDate = watch("dueDate");

    // Fetch milestones and task lists for selected project
    const { milestones } = useMilestones(projectId || "");
    const { taskLists } = useTaskLists({ projectId: projectId || "", milestoneId: milestoneId || undefined });

    // Filter projects based on selected customer
    const filteredProjects = useMemo(() => {
        if (!customerId) return projects;
        return projects.filter(p => p.customerId === customerId);
    }, [projects, customerId]);

    // Get task lists for selected milestone only
    const filteredTaskLists = useMemo(() => {
        if (!milestoneId) return [];
        return taskLists.filter(tl => tl.milestoneId === milestoneId);
    }, [taskLists, milestoneId]);

    // Find selected milestone to check due date
    const selectedMilestone = useMemo(() => {
        return milestones.find(m => m.id === milestoneId);
    }, [milestones, milestoneId]);

    // Check if due date is after milestone
    const isDueDateAfterMilestone = useMemo(() => {
        if (!selectedMilestone || !selectedDueDate) return false;
        const milestoneDue = selectedMilestone.dueDate?.toDate?.() || selectedMilestone.dueDate;
        return isAfter(selectedDueDate, milestoneDue as Date);
    }, [selectedMilestone, selectedDueDate]);

    const onSubmit = async (data: TaskFormData) => {
        setIsSubmitting(true);
        try {
            // Clean up empty values
            const cleanData = {
                ...data,
                projectId: data.projectId || undefined,
                milestoneId: data.milestoneId || undefined,
                taskListId: data.taskListId || undefined,
            };
            await createTask(cleanData);
            toast.success("Task created successfully");

            if (customerIdParam) {
                router.push(`/dashboard/customers/${customerIdParam}/tasks`);
            } else if (projectIdParam) {
                router.push(`/dashboard/projects/${projectIdParam}/tasks`);
            } else {
                router.push(`/dashboard/tasks`);
            }
        } catch (error) {
            console.error("Error creating task:", error);
            toast.error("Failed to create task");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="mb-6 flex items-center gap-2 text-gray-500 text-sm">
                <Link
                    href={customerIdParam ? `/dashboard/customers/${customerIdParam}/tasks` : projectIdParam ? `/dashboard/projects/${projectIdParam}/tasks` : "/dashboard/tasks"}
                    className="flex items-center hover:text-gray-900 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to Tasks
                </Link>
            </div>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">New Task</h1>
                <p className="text-gray-500 mt-1">Create and assign a new task.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Task Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        {/* Name */}
                        <div className="grid gap-2">
                            <Label htmlFor="name">Task Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                placeholder="e.g. Update Homepage Hero"
                                {...register("name")}
                                className={cn(errors.name && "border-red-500")}
                            />
                            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                        </div>

                        {/* Customer & Project */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="customerId">Customer</Label>
                                <Select
                                    value={watch("customerId")}
                                    onValueChange={(val) => {
                                        setValue("customerId", val);
                                        setValue("projectId", "");
                                        setValue("milestoneId", "");
                                        setValue("taskListId", "");
                                    }}
                                    disabled={!!customerIdParam}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="projectId">Project</Label>
                                <Select
                                    value={watch("projectId")}
                                    onValueChange={(val) => {
                                        setValue("projectId", val === "none" ? "" : val);
                                        setValue("milestoneId", "");
                                        setValue("taskListId", "");
                                    }}
                                    disabled={!!projectIdParam}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Project (Optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Project</SelectItem>
                                        {filteredProjects.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Milestone & Task List - Show only when project is selected */}
                        {projectId && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-dashed">
                                <div className="grid gap-2">
                                    <Label className="flex items-center gap-2">
                                        <FolderTree className="h-4 w-4 text-gray-400" />
                                        Milestone
                                    </Label>
                                    <Select
                                        value={watch("milestoneId") || ""}
                                        onValueChange={(val) => {
                                            setValue("milestoneId", val === "none" ? "" : val);
                                            setValue("taskListId", "");
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Milestone (Optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Milestone</SelectItem>
                                            {milestones.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>
                                                    <div className="flex items-center gap-2">
                                                        <div 
                                                            className="w-2 h-2 rounded-full" 
                                                            style={{ backgroundColor: m.color || "#3b82f6" }}
                                                        />
                                                        {m.name}
                                                        {m.status === "complete" && (
                                                            <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">Done</Badge>
                                                        )}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {selectedMilestone && (
                                        <p className="text-xs text-muted-foreground">
                                            Due: {format(selectedMilestone.dueDate?.toDate?.() || selectedMilestone.dueDate as unknown as Date, "MMM d, yyyy")}
                                        </p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <Label className="flex items-center gap-2">
                                        <ListTodo className="h-4 w-4 text-gray-400" />
                                        Task List
                                    </Label>
                                    <Select
                                        value={watch("taskListId") || ""}
                                        onValueChange={(val) => setValue("taskListId", val === "none" ? "" : val)}
                                        disabled={!milestoneId}
                                    >
                                        <SelectTrigger className={!milestoneId ? "opacity-50" : ""}>
                                            <SelectValue placeholder={milestoneId ? "Select Task List (Optional)" : "Select milestone first"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Task List</SelectItem>
                                            {filteredTaskLists.map((tl) => (
                                                <SelectItem key={tl.id} value={tl.id}>{tl.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {milestoneId && filteredTaskLists.length === 0 && (
                                        <p className="text-xs text-muted-foreground italic">
                                            No task lists in this milestone
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Task details..."
                                className="min-h-[100px]"
                                {...register("description")}
                            />
                        </div>

                        {/* Assignees */}
                        <div className="grid gap-2">
                            <Label>Assigned To</Label>
                            <Select
                                onValueChange={(val) => setValue("assignees", [val])}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Staff Member" />
                                </SelectTrigger>
                                <SelectContent>
                                    {staff?.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.firstName} {s.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Dates & Priority */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="grid gap-2">
                                <Label>Due Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !watch("dueDate") && "text-muted-foreground",
                                                isDueDateAfterMilestone && "border-amber-400 bg-amber-50"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {watch("dueDate") ? format(watch("dueDate")!, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={watch("dueDate") || undefined}
                                            onSelect={(date) => setValue("dueDate", date)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                {isDueDateAfterMilestone && (
                                    <div className="flex items-center gap-1 text-amber-600 text-xs">
                                        <AlertTriangle className="h-3 w-3" />
                                        <span>Due date is after milestone deadline</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label>Priority</Label>
                                <Select
                                    value={watch("priority")}
                                    onValueChange={(val) => setValue("priority", val as "low" | "medium" | "high" | "urgent")}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>Status</Label>
                                <Select
                                    value={watch("status")}
                                    onValueChange={(val) => setValue("status", val as "not_started" | "in_progress" | "testing" | "awaiting_feedback" | "completed")}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="not_started">Not Started</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="testing">Testing</SelectItem>
                                        <SelectItem value="awaiting_feedback">Awaiting Feedback</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 pt-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="isPublic"
                                    checked={watch("isPublic")}
                                    onCheckedChange={(checked) => setValue("isPublic", !!checked)}
                                />
                                <Label htmlFor="isPublic">Visible to Customer</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="billable"
                                    checked={watch("billable")}
                                    onCheckedChange={(checked) => setValue("billable", !!checked)}
                                />
                                <Label htmlFor="billable">Billable</Label>
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="justify-end border-t border-gray-100 px-6 py-4 bg-gray-50/50 rounded-b-xl">
                        <Button type="button" variant="ghost" className="mr-2" onClick={() => router.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Task
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}

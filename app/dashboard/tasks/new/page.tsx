"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskFormSchema, type TaskFormData } from "@/lib/schemas";
import { useTasks, useProjects, useTaskLists, useProject } from "@/lib/hooks";
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
import { useTranslation } from "@/lib/i18n";

export default function CreateTaskPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const customerIdParam = searchParams.get("customerId");
    const projectIdParam = searchParams.get("projectId");

    const { createTask } = useTasks();
    const { customers } = useCustomers({ status: "active" });
    const { projects } = useProjects({ status: "active", customerId: customerIdParam || undefined });
    const { project: contextProject } = useProject(projectIdParam || null); // Fetch context project
    const { staff } = useStaff();

    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<TaskFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(taskFormSchema) as any,
        defaultValues: {
            name: "",
            customerId: customerIdParam || "",
            projectId: projectIdParam || "",
            status: "to_do",
            priority: "medium",
            assignees: [],
            tags: [],
            isPublic: false,
            billable: false,
            milestoneId: "",
            taskListId: "",
        },
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
        reset,
    } = form;
    const customerId = watch("customerId");
    const projectId = watch("projectId");
    const milestoneId = watch("milestoneId");
    const selectedDueDate = watch("dueDate");

    // Auto-fill context from fetched project
    useEffect(() => {
        if (contextProject) {
            setValue("projectId", contextProject.id);
            if (contextProject.customerId) {
                setValue("customerId", contextProject.customerId);
            }
        }
    }, [contextProject, setValue]);

    // Fetch milestones and task lists for selected project
    const { milestones } = useMilestones(projectId || "");
    const { taskLists } = useTaskLists({ projectId: projectId || "", milestoneId: milestoneId || undefined });

    // Filter projects based on selected customer
    const filteredProjects = useMemo(() => {
        if (!customerId) return projects;
        return projects.filter((p) => p.customerId === customerId);
    }, [projects, customerId]);

    // Get task lists for selected milestone only
    const filteredTaskLists = useMemo(() => {
        if (!milestoneId) return [];
        return taskLists.filter((tl) => tl.milestoneId === milestoneId);
    }, [taskLists, milestoneId]);

    // Find selected milestone to check due date
    const selectedMilestone = useMemo(() => {
        return milestones.find((m) => m.id === milestoneId);
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
            toast.success(t("tasks.toast.created"));

            if (customerIdParam) {
                router.push(`/dashboard/customers/${customerIdParam}/tasks`);
            } else if (projectIdParam) {
                router.push(`/dashboard/projects/${projectIdParam}/tasks`);
            } else {
                router.push(`/dashboard/tasks`);
            }
        } catch (error) {
            console.error("Error creating task:", error);
            toast.error(t("tasks.toast.createFailed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="mb-6 flex items-center gap-2 text-gray-500 text-sm">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="px-0 hover:bg-transparent hover:text-gray-900"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t("common.back")}
                </Button>
            </div>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">{t("tasks.new")}</h1>
                <p className="text-gray-500 mt-1">
                    {contextProject ? (
                        <>
                            {t("tasks.form.addingTo")}{" "}
                            <span className="font-medium text-gray-900">{contextProject.name}</span>
                        </>
                    ) : (
                        t("tasks.form.createSubtitle")
                    )}
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{t("tasks.form.details")}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        {/* Name */}
                        <div className="grid gap-2">
                            <Label htmlFor="name">
                                {t("tasks.form.subject")} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                placeholder={t("tasks.form.namePlaceholder")}
                                {...register("name")}
                                className={cn("text-lg", errors.name && "border-red-500")}
                                autoFocus
                            />
                            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                        </div>

                        {/* Context Fields (Hidden if fixed, shown otherwise) */}
                        {!projectIdParam && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="grid gap-2">
                                    <Label htmlFor="customerId">{t("tasks.form.customer")}</Label>
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
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder={t("tasks.form.selectCustomer")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {customers.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.company}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="projectId">{t("tasks.form.project")}</Label>
                                    <Select
                                        value={watch("projectId")}
                                        onValueChange={(val) => {
                                            setValue("projectId", val === "none" ? "" : val);
                                            setValue("milestoneId", "");
                                            setValue("taskListId", "");
                                        }}
                                        disabled={!!projectIdParam}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder={t("tasks.form.selectProject")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">{t("tasks.form.noProject")}</SelectItem>
                                            {filteredProjects.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {/* Milestone & Task List */}
                        {projectId && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="grid gap-2">
                                    <Label className="flex items-center gap-2">
                                        <FolderTree className="h-4 w-4 text-gray-400" />
                                        {t("tasks.form.milestone")}
                                    </Label>
                                    <Select
                                        value={watch("milestoneId") || ""}
                                        onValueChange={(val) => {
                                            setValue("milestoneId", val === "none" ? "" : val);
                                            setValue("taskListId", "");
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("tasks.form.noMilestone")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">{t("tasks.form.noMilestone")}</SelectItem>
                                            {milestones.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ backgroundColor: m.color || "#3b82f6" }}
                                                        />
                                                        {m.name}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label className="flex items-center gap-2">
                                        <ListTodo className="h-4 w-4 text-gray-400" />
                                        {t("tasks.form.taskList")}
                                    </Label>
                                    <Select
                                        value={watch("taskListId") || ""}
                                        onValueChange={(val) => setValue("taskListId", val === "none" ? "" : val)}
                                        disabled={!milestoneId}
                                    >
                                        <SelectTrigger className={!milestoneId ? "opacity-50" : ""}>
                                            <SelectValue
                                                placeholder={milestoneId ? t("tasks.form.noTaskList") : t("tasks.form.selectMilestoneFirst")}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">{t("tasks.form.noTaskList")}</SelectItem>
                                            {filteredTaskLists.map((tl) => (
                                                <SelectItem key={tl.id} value={tl.id}>
                                                    {tl.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="description">{t("tasks.form.description")}</Label>
                            <Textarea
                                id="description"
                                placeholder={t("tasks.form.descriptionPlaceholder")}
                                className="min-h-[120px] resize-y"
                                {...register("description")}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label>{t("tasks.form.assignedTo")}</Label>
                                <Select onValueChange={(val) => setValue("assignees", [val])}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("tasks.form.unassigned")} />
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

                            <div className="grid gap-2">
                                <Label>{t("tasks.form.priority")}</Label>
                                <Select
                                    value={watch("priority")}
                                    onValueChange={(val) =>
                                        setValue("priority", val as "low" | "medium" | "high" | "urgent")
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">{t("tasks.priority.low")}</SelectItem>
                                        <SelectItem value="medium">{t("tasks.priority.medium")}</SelectItem>
                                        <SelectItem value="high">{t("tasks.priority.high")}</SelectItem>
                                        <SelectItem value="urgent">{t("tasks.priority.urgent")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label>{t("tasks.form.dueDate")}</Label>
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
                                            {watch("dueDate") ? (
                                                format(watch("dueDate")!, "PPP")
                                            ) : (
                                                <span>{t("tasks.form.pickDate")}</span>
                                            )}
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
                                        <span>{t("tasks.form.afterMilestoneShort")}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label>{t("tasks.form.status")}</Label>
                                <Select
                                    value={watch("status")}
                                    onValueChange={(val) =>
                                        setValue(
                                            "status",
                                            val as
                                            | "to_do"
                                            | "in_progress"
                                            | "in_progress"
                                            | "in_progress"
                                            | "done"
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="to_do">{t("tasks.statusOption.notStarted")}</SelectItem>
                                        <SelectItem value="in_progress">{t("tasks.statusOption.inProgress")}</SelectItem>
                                        <SelectItem value="in_progress">{t("tasks.statusOption.testing")}</SelectItem>
                                        <SelectItem value="in_progress">{t("tasks.statusOption.awaitingFeedback")}</SelectItem>
                                        <SelectItem value="done">{t("tasks.statusOption.completed")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="isPublic"
                                    checked={watch("isPublic")}
                                    onCheckedChange={(checked) => setValue("isPublic", !!checked)}
                                />
                                <Label htmlFor="isPublic" className="font-normal cursor-pointer">
                                    {t("tasks.form.visibleToCustomer")}
                                </Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="billable"
                                    checked={watch("billable")}
                                    onCheckedChange={(checked) => setValue("billable", !!checked)}
                                />
                                <Label htmlFor="billable" className="font-normal cursor-pointer">
                                    {t("tasks.form.billable")}
                                </Label>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end border-t border-gray-100 px-6 py-4 bg-gray-50/50 rounded-b-xl">
                        <Button type="button" variant="ghost" className="mr-2" onClick={() => router.back()}>
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("tasks.form.createTask")}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}

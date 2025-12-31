"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { projectFormSchema, type ProjectFormData } from "@/lib/schemas";
import { useProjects } from "@/lib/hooks/use-projects";
import { useCustomers } from "@/lib/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { useUserProfile } from "@/components/hooks/use-user-profile";

export default function CreateProjectPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const customerIdParam = searchParams.get("customerId");

    const { createProject } = useProjects();
    const { customers, loading: customersLoading } = useCustomers({ status: "active" });
    const { profile } = useUserProfile();

    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ProjectFormData>({
        resolver: zodResolver(projectFormSchema),
        defaultValues: {
            name: "",
            customerId: customerIdParam || "",
            status: "not_started",
            billingType: "fixed",
            estimatedHours: 0,
            projectRate: 0,
            tags: [],
        },
    });

    const { register, handleSubmit, formState: { errors }, setValue, watch } = form;
    const startDate = watch("startDate");
    const deadline = watch("deadline");

    useEffect(() => {
        if (customerIdParam) {
            setValue("customerId", customerIdParam);
        }
    }, [customerIdParam, setValue]);

    const onSubmit = async (data: ProjectFormData) => {
        setIsSubmitting(true);
        try {
            const projectId = await createProject(data);
            toast.success("Project created successfully");

            if (customerIdParam) {
                router.push(`/dashboard/customers/${customerIdParam}/projects`);
            } else {
                router.push(`/dashboard/projects/${projectId}`);
            }
        } catch (error) {
            console.error("Error creating project:", error);
            toast.error("Failed to create project");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-6 flex items-center gap-2 text-gray-500 text-sm">
                <Link
                    href={customerIdParam ? `/dashboard/customers/${customerIdParam}/projects` : "/dashboard/projects"}
                    className="flex items-center hover:text-gray-900 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to Projects
                </Link>
            </div>

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
                    <p className="text-gray-500 mt-1">Start tracking a new customer project</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Project Details</CardTitle>
                        <CardDescription>Basic information about the project</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        {/* Customer Selection */}
                        <div className="grid gap-2">
                            <Label htmlFor="customerId">Customer <span className="text-red-500">*</span></Label>
                            <Select
                                value={watch("customerId")}
                                onValueChange={(val) => setValue("customerId", val, { shouldValidate: true })}
                                disabled={!!customerIdParam}
                            >
                                <SelectTrigger className={cn(errors.customerId && "border-red-500")}>
                                    <SelectValue placeholder="Select a customer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customersLoading ? (
                                        <div className="p-2 flex items-center justify-center text-sm text-gray-500">Loading customers...</div>
                                    ) : (
                                        customers.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.company}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {errors.customerId && <p className="text-red-500 text-xs">{errors.customerId.message}</p>}
                        </div>

                        {/* Project Name */}
                        <div className="grid gap-2">
                            <Label htmlFor="name">Project Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                placeholder="e.g. Website Redesign"
                                {...register("name")}
                                className={cn(errors.name && "border-red-500")}
                            />
                            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                        </div>

                        {/* Description */}
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Project scope and goals..."
                                className="min-h-[100px]"
                                {...register("description")}
                            />
                        </div>

                        {/* Dates Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label>Start Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !startDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={startDate}
                                            onSelect={(date) => setValue("startDate", date)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="grid gap-2">
                                <Label>Deadline</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !deadline && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {deadline ? format(deadline, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={deadline}
                                            onSelect={(date) => setValue("deadline", date)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Details & Billing</CardTitle>
                        <CardDescription>Financial and tracking settings</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={watch("status")}
                                onValueChange={(val: any) => setValue("status", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="not_started">Not Started</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="on_hold">On Hold</SelectItem>
                                    <SelectItem value="finished">Finished</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="billingType">Billing Type</Label>
                            <Select
                                value={watch("billingType")}
                                onValueChange={(val: any) => setValue("billingType", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fixed">Fixed Rate</SelectItem>
                                    <SelectItem value="hourly">Hourly Rate</SelectItem>
                                    <SelectItem value="task_hours">Task Hours</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {watch("billingType") === "fixed" && (
                            <div className="grid gap-2">
                                <Label htmlFor="projectRate">Project Price</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    {...register("projectRate", { valueAsNumber: true })}
                                />
                            </div>
                        )}

                        {watch("billingType") === "hourly" && (
                            <div className="grid gap-2">
                                <Label htmlFor="projectRate">Hourly Rate</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    {...register("projectRate", { valueAsNumber: true })}
                                />
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="estimatedHours">Estimated Hours</Label>
                            <Input
                                type="number"
                                min="0"
                                step="1"
                                {...register("estimatedHours", { valueAsNumber: true })}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end border-t border-gray-100 px-6 py-4 bg-gray-50/50 rounded-b-xl">
                        <Button type="button" variant="ghost" className="mr-2" onClick={() => router.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Project
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}

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
import { useTranslation } from "@/lib/i18n";

export default function CreateProjectPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const customerIdParam = searchParams.get("customerId");

    const { createProject } = useProjects();
    const { customers, loading: customersLoading } = useCustomers({ status: "active" });
    const { profile } = useUserProfile();

    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ProjectFormData>({
        resolver: zodResolver(projectFormSchema) as any,
        defaultValues: {
            name: "",
            customerId: customerIdParam || "",
            status: "active",
            billingType: "fixed",
            priority: "medium",
            projectType: "client",
            projectOwnerId: profile?.uid || "",
            estimatedHours: 0,
            projectRate: 0,
            tags: [],
            currency: "USD",
            pinned: false,
        } as any,
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = form;
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
            toast.success(t("projects.new.toast.created"));

            if (customerIdParam) {
                router.push(`/dashboard/customers/${customerIdParam}/projects`);
            } else {
                router.push(`/dashboard/projects/${projectId}`);
            }
        } catch (error) {
            console.error("Error creating project:", error);
            toast.error(t("projects.new.toast.createFailed"));
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
                    {t("projects.new.backToProjects")}
                </Link>
            </div>

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{t("projects.new.title")}</h1>
                    <p className="text-gray-500 mt-1">{t("projects.new.subtitle")}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{t("projects.new.detailsTitle")}</CardTitle>
                        <CardDescription>{t("projects.new.detailsDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        {/* Customer Selection */}
                        <div className="grid gap-2">
                            <Label htmlFor="customerId">
                                {t("projects.new.customer")} <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={watch("customerId")}
                                onValueChange={(val) => setValue("customerId", val, { shouldValidate: true })}
                                disabled={!!customerIdParam}
                            >
                                <SelectTrigger className={cn(errors.customerId && "border-red-500")}>
                                    <SelectValue placeholder={t("projects.new.selectCustomer")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {customersLoading ? (
                                        <div className="p-2 flex items-center justify-center text-sm text-gray-500">
                                            {t("projects.new.loadingCustomers")}
                                        </div>
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
                            <Label htmlFor="name">
                                {t("projects.new.projectName")} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                placeholder={t("projects.new.projectNamePlaceholder")}
                                {...register("name")}
                                className={cn(errors.name && "border-red-500")}
                            />
                            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                        </div>

                        {/* Description */}
                        <div className="grid gap-2">
                            <Label htmlFor="description">{t("projects.new.description")}</Label>
                            <Textarea
                                id="description"
                                placeholder={t("projects.new.descriptionPlaceholder")}
                                className="min-h-[100px]"
                                {...register("description")}
                            />
                        </div>

                        {/* Dates Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label>{t("projects.new.startDate")}</Label>
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
                                            {startDate ? format(startDate, "PPP") : <span>{t("projects.new.pickDate")}</span>}
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
                                <Label>{t("projects.new.deadline")}</Label>
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
                                            {deadline ? format(deadline, "PPP") : <span>{t("projects.new.pickDate")}</span>}
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
                        <CardTitle>{t("projects.new.billingTitle")}</CardTitle>
                        <CardDescription>{t("projects.new.billingDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="status">{t("common.status")}</Label>
                            <Select
                                value={watch("status")}
                                onValueChange={(val: ProjectFormData["status"]) => setValue("status", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="to_do">{t("projects.new.status.notStarted")}</SelectItem>
                                    <SelectItem value="in_progress">{t("projects.new.status.inProgress")}</SelectItem>
                                    <SelectItem value="on_hold">{t("projects.new.status.onHold")}</SelectItem>
                                    <SelectItem value="completed">{t("projects.new.status.finished")}</SelectItem>
                                    <SelectItem value="archived">{t("projects.new.status.cancelled")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="billingType">{t("projects.new.billingType")}</Label>
                            <Select
                                value={watch("billingType")}
                                onValueChange={(val: ProjectFormData["billingType"]) => setValue("billingType", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fixed">{t("projects.new.billing.fixed")}</SelectItem>
                                    <SelectItem value="hourly">{t("projects.new.billing.hourly")}</SelectItem>
                                    <SelectItem value="task_hours">{t("projects.new.billing.taskHours")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {watch("billingType") === "fixed" && (
                            <div className="grid gap-2">
                                <Label htmlFor="projectRate">{t("projects.new.projectPrice")}</Label>
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
                                <Label htmlFor="projectRate">{t("projects.new.hourlyRate")}</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    {...register("projectRate", { valueAsNumber: true })}
                                />
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="estimatedHours">{t("projects.new.estimatedHours")}</Label>
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
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("projects.new.createButton")}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}

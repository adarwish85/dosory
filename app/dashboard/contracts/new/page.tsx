"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contractFormSchema, type ContractFormData } from "@/lib/schemas";
import { useContracts } from "@/lib/hooks/use-contracts";
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
import { useTranslation } from "@/lib/i18n";

export default function CreateContractPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const customerIdParam = searchParams.get("customerId");

    const { createContract } = useContracts();
    const { customers, loading: customersLoading } = useCustomers({ status: "active" });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ContractFormData>({
        resolver: zodResolver(contractFormSchema),
        defaultValues: {
            subject: "",
            customerId: customerIdParam || "",
            contractType: "service_agreement",
            contractValue: 0,
            content: "",
        },
    });

    const { register, handleSubmit, formState: { errors }, setValue, watch } = form;
    const startDate = watch("startDate");
    const endDate = watch("endDate");

    useEffect(() => {
        if (customerIdParam) {
            setValue("customerId", customerIdParam);
        }
    }, [customerIdParam, setValue]);

    const onSubmit = async (data: ContractFormData) => {
        setIsSubmitting(true);
        try {
            const contractId = await createContract(data);
            toast.success(t("contracts.toast.created"));

            if (customerIdParam) {
                router.push(`/dashboard/customers/${customerIdParam}/contracts`);
            } else {
                router.push(`/dashboard/contracts/${contractId}`);
            }
        } catch (error) {
            console.error("Error creating contract:", error);
            toast.error(t("contracts.toast.createFailed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-6 flex items-center gap-2 text-gray-500 text-sm">
                <Link
                    href={customerIdParam ? `/dashboard/customers/${customerIdParam}/contracts` : "/dashboard/contracts"}
                    className="flex items-center hover:text-gray-900 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t("contracts.new.back")}
                </Link>
            </div>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">{t("contracts.new.title")}</h1>
                <p className="text-gray-500 mt-1">{t("contracts.new.subtitle")}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{t("contracts.form.sectionInfo")}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        {/* Subject */}
                        <div className="grid gap-2">
                            <Label htmlFor="subject">{t("contracts.form.subject")} <span className="text-red-500">*</span></Label>
                            <Input
                                id="subject"
                                placeholder={t("contracts.form.subjectPlaceholder")}
                                {...register("subject")}
                                className={cn(errors.subject && "border-red-500")}
                            />
                            {errors.subject && <p className="text-red-500 text-xs">{errors.subject.message}</p>}
                        </div>

                        {/* Customer & Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="customerId">{t("contracts.form.customer")} <span className="text-red-500">*</span></Label>
                                <Select
                                    value={watch("customerId")}
                                    onValueChange={(val) => setValue("customerId", val, { shouldValidate: true })}
                                    disabled={!!customerIdParam}
                                >
                                    <SelectTrigger className={cn(errors.customerId && "border-red-500")}>
                                        <SelectValue placeholder={t("contracts.form.customerPlaceholder")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.customerId && <p className="text-red-500 text-xs">{errors.customerId.message}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="contractType">{t("contracts.form.type")}</Label>
                                <Input
                                    id="contractType"
                                    placeholder={t("contracts.form.typePlaceholder")}
                                    {...register("contractType")}
                                />
                            </div>
                        </div>

                        {/* Value & Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="contractValue">{t("contracts.form.value")}</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    {...register("contractValue", { valueAsNumber: true })}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>{t("contracts.form.startDate")} <span className="text-red-500">*</span></Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !startDate && "text-muted-foreground",
                                                errors.startDate && "border-red-500"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {startDate ? format(startDate, "PPP") : <span>{t("contracts.form.pickDate")}</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={startDate}
                                            onSelect={(date) => setValue("startDate", date as Date, { shouldValidate: true })}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                {errors.startDate && <p className="text-red-500 text-xs">{errors.startDate.message}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label>{t("contracts.form.endDate")}</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !endDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {endDate ? format(endDate, "PPP") : <span>{t("contracts.form.pickDate")}</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={endDate}
                                            onSelect={(date) => setValue("endDate", date)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="grid gap-2">
                            <Label htmlFor="description">{t("contracts.form.description")}</Label>
                            <Textarea
                                id="description"
                                placeholder={t("contracts.form.descriptionPlaceholder")}
                                className="min-h-[80px]"
                                {...register("description")}
                            />
                        </div>

                        {/* Content - Placeholder for Rich Text */}
                        <div className="grid gap-2">
                            <Label htmlFor="content">{t("contracts.form.content")}</Label>
                            <Textarea
                                id="content"
                                placeholder={t("contracts.form.contentPlaceholder")}
                                className="min-h-[300px] font-mono text-sm"
                                {...register("content")}
                            />
                        </div>

                    </CardContent>
                    <CardFooter className="justify-end border-t border-gray-100 px-6 py-4 bg-gray-50/50 rounded-b-xl">
                        <Button type="button" variant="ghost" className="mr-2" onClick={() => router.back()}>
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("contracts.new.submit")}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseFormSchema, type ExpenseFormData } from "@/lib/schemas";
import { useExpenses, useExpenseCategories } from "@/lib/hooks/use-expenses";
import { useCustomers } from "@/lib/hooks/use-customers";
import { useOrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export default function CreateExpensePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const customerIdParam = searchParams.get("customerId");

    const { createExpense } = useExpenses();
    const { categories, loading: categoriesLoading } = useExpenseCategories();
    const { customers, loading: customersLoading } = useCustomers({ status: "active" });
    const { settings } = useOrganizationSettings();

    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ExpenseFormData>({
        resolver: zodResolver(expenseFormSchema),
        defaultValues: {
            categoryId: "",
            customerId: customerIdParam || "",
            amount: 0,
            currency: settings.currency || "USD",
            date: new Date(),
            billable: false,
            note: "",
        },
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = form;
    const date = watch("date");

    // Default the currency to the org's configured currency once settings load
    // (defaultValues are captured at mount, before settings are available).
    useEffect(() => {
        if (settings.currency) setValue("currency", settings.currency);
    }, [settings.currency, setValue]);

    useEffect(() => {
        if (customerIdParam) {
            setValue("customerId", customerIdParam);
        }
    }, [customerIdParam, setValue]);

    const onSubmit = async (data: ExpenseFormData) => {
        setIsSubmitting(true);
        try {
            await createExpense(data);
            toast.success(t("expenses.toast.created"));

            if (customerIdParam) {
                router.push(`/dashboard/customers/${customerIdParam}/expenses`);
            } else {
                router.push("/dashboard/expenses");
            }
        } catch (error) {
            console.error("Error creating expense:", error);
            toast.error(t("expenses.toast.createError"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <div className="mb-6 flex items-center gap-2 text-gray-500 text-sm">
                <Link
                    href={customerIdParam ? `/dashboard/customers/${customerIdParam}/expenses` : "/dashboard/expenses"}
                    className="flex items-center hover:text-gray-900 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t("expenses.new.back")}
                </Link>
            </div>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">{t("expenses.new.title")}</h1>
                <p className="text-gray-500 mt-1">{t("expenses.new.subtitle")}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{t("expenses.new.detailsTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        {/* Date & Category */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label>
                                    {t("common.date")} <span className="text-red-500">*</span>
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>{t("expenses.new.pickDate")}</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={(date) => setValue("date", date as Date)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                {errors.date && <p className="text-red-500 text-xs">{errors.date.message}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="categoryId">
                                    {t("expenses.table.category")} <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={watch("categoryId")}
                                    onValueChange={(val) => setValue("categoryId", val, { shouldValidate: true })}
                                >
                                    <SelectTrigger className={cn(errors.categoryId && "border-red-500")}>
                                        <SelectValue placeholder={t("expenses.new.selectCategory")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categoriesLoading ? (
                                            <div className="p-2 text-xs text-center">{t("common.loading")}</div>
                                        ) : (
                                            categories.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                                {errors.categoryId && (
                                    <p className="text-red-500 text-xs">{errors.categoryId.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Amount & Currency */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="amount">
                                    {t("expenses.table.amount")} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    {...register("amount", { valueAsNumber: true })}
                                    className={cn(errors.amount && "border-red-500")}
                                />
                                {errors.amount && <p className="text-red-500 text-xs">{errors.amount.message}</p>}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="currency">
                                    {t("expenses.new.currency")} <span className="text-red-500">*</span>
                                </Label>
                                <Select value={watch("currency")} onValueChange={(val) => setValue("currency", val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">USD ($)</SelectItem>
                                        <SelectItem value="EUR">EUR (€)</SelectItem>
                                        <SelectItem value="GBP">GBP (£)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Customer */}
                        <div className="grid gap-2">
                            <Label htmlFor="customerId">{t("expenses.new.customerOptional")}</Label>
                            <Select
                                value={watch("customerId")}
                                onValueChange={(val) => setValue("customerId", val === "none" ? undefined : val)}
                                disabled={!!customerIdParam}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("expenses.new.selectCustomer")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t("expenses.new.none")}</SelectItem>
                                    {customers.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.company}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Note */}
                        <div className="grid gap-2">
                            <Label htmlFor="note">{t("expenses.new.note")}</Label>
                            <Textarea
                                id="note"
                                placeholder={t("expenses.new.notePlaceholder")}
                                className="min-h-[80px]"
                                {...register("note")}
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="billable"
                                checked={watch("billable")}
                                onCheckedChange={(checked) => setValue("billable", !!checked)}
                            />
                            <Label htmlFor="billable">{t("expenses.new.billableToCustomer")}</Label>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end border-t border-gray-100 px-6 py-4 bg-gray-50/50 rounded-b-xl">
                        <Button type="button" variant="ghost" className="mr-2" onClick={() => router.back()}>
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("expenses.new.save")}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}

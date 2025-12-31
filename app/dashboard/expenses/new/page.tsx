"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseFormSchema, type ExpenseFormData } from "@/lib/schemas";
import { useExpenses, useExpenseCategories } from "@/lib/hooks/use-expenses";
import { useCustomers } from "@/lib/hooks/use-customers";
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

export default function CreateExpensePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const customerIdParam = searchParams.get("customerId");

    const { createExpense } = useExpenses();
    const { categories, loading: categoriesLoading } = useExpenseCategories();
    const { customers, loading: customersLoading } = useCustomers({ status: "active", pageSize: 1000 });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ExpenseFormData>({
        resolver: zodResolver(expenseFormSchema),
        defaultValues: {
            categoryId: "",
            customerId: customerIdParam || "",
            amount: 0,
            currency: "USD", // TODO: Get from settings
            date: new Date(),
            billable: false,
            note: "",
        },
    });

    const { register, handleSubmit, formState: { errors }, setValue, watch } = form;
    const date = watch("date");

    useEffect(() => {
        if (customerIdParam) {
            setValue("customerId", customerIdParam);
        }
    }, [customerIdParam, setValue]);

    const onSubmit = async (data: ExpenseFormData) => {
        setIsSubmitting(true);
        try {
            await createExpense(data);
            toast.success("Expense recorded successfully");

            if (customerIdParam) {
                router.push(`/dashboard/customers/${customerIdParam}/expenses`);
            } else {
                router.push("/dashboard/expenses");
            }
        } catch (error) {
            console.error("Error creating expense:", error);
            toast.error("Failed to record expense");
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
                    Back to Expenses
                </Link>
            </div>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Record Expense</h1>
                <p className="text-gray-500 mt-1">Track a new business expense.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Expense Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        {/* Date & Category */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label>Date <span className="text-red-500">*</span></Label>
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
                                            {date ? format(date, "PPP") : <span>Pick a date</span>}
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
                                <Label htmlFor="categoryId">Category <span className="text-red-500">*</span></Label>
                                <Select
                                    value={watch("categoryId")}
                                    onValueChange={(val) => setValue("categoryId", val, { shouldValidate: true })}
                                >
                                    <SelectTrigger className={cn(errors.categoryId && "border-red-500")}>
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categoriesLoading ? (
                                            <div className="p-2 text-xs text-center">Loading...</div>
                                        ) : (
                                            categories.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                                {errors.categoryId && <p className="text-red-500 text-xs">{errors.categoryId.message}</p>}
                            </div>
                        </div>

                        {/* Amount & Currency */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="amount">Amount <span className="text-red-500">*</span></Label>
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
                                <Label htmlFor="currency">Currency <span className="text-red-500">*</span></Label>
                                <Select
                                    value={watch("currency")}
                                    onValueChange={(val) => setValue("currency", val)}
                                >
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
                            <Label htmlFor="customerId">Customer (Optional)</Label>
                            <Select
                                value={watch("customerId")}
                                onValueChange={(val) => setValue("customerId", val === "none" ? undefined : val)}
                                disabled={!!customerIdParam}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Customer" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {customers.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Note */}
                        <div className="grid gap-2">
                            <Label htmlFor="note">Note</Label>
                            <Textarea
                                id="note"
                                placeholder="Expense details..."
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
                            <Label htmlFor="billable">Billable to Customer</Label>
                        </div>

                    </CardContent>
                    <CardFooter className="justify-end border-t border-gray-100 px-6 py-4 bg-gray-50/50 rounded-b-xl">
                        <Button type="button" variant="ghost" className="mr-2" onClick={() => router.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Expense
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}

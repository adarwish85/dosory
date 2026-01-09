"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { accountFormSchema } from "@/lib/schemas";
import { Account, AccountType, AccountSubType } from "@/lib/types/finance";
import { z } from "zod";

type FormData = z.infer<typeof accountFormSchema>;

const ACCOUNT_TYPES: Record<AccountType, string> = {
    asset: "Asset",
    liability: "Liability",
    equity: "Equity",
    income: "Income",
    expense: "Expense",
};

const ACCOUNT_SUBTYPES: Record<AccountSubType, string> = {
    current_asset: "Current Asset",
    fixed_asset: "Fixed Asset",
    current_liability: "Current Liability",
    long_term_liability: "Long Term Liability",
    sales: "Sales",
    other_income: "Other Income",
    operating_expense: "Operating Expense",
    cost_of_goods_sold: "Cost of Goods Sold",
    retained_earnings: "Retained Earnings",
    owner_equity: "Owner Equity",
};

interface AccountFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: Partial<Account>) => Promise<void>;
    initialData?: Account;
}

export function AccountFormDialog({ open, onOpenChange, onSubmit, initialData }: AccountFormDialogProps) {
    const [submitting, setSubmitting] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(accountFormSchema),
        defaultValues: {
            code: "",
            name: "",
            type: "asset",
            subType: "current_asset",
            description: "",
            currency: "USD",
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                code: initialData?.code || "",
                name: initialData?.name || "",
                type: initialData?.type || "asset",
                subType: initialData?.subType || "current_asset",
                description: initialData?.description || "",
                currency: initialData?.currency || "USD",
            });
        }
    }, [open, initialData, form]);

    const handleSubmit = async (data: FormData) => {
        setSubmitting(true);
        try {
            await onSubmit(data);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initialData ? "Edit Account" : "New Account"}</DialogTitle>
                    <DialogDescription>
                        {initialData ? "Update account details." : "Add a new account to your Chart of Accounts."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account Code</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="e.g. 1000" disabled={!!initialData} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Cash on Hand" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.entries(ACCOUNT_TYPES).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>
                                                        {label}
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
                                name="subType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sub Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select subtype" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.entries(ACCOUNT_SUBTYPES).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Optional description" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? "Saving..." : initialData ? "Update" : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

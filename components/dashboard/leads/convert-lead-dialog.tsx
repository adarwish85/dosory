"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLeads } from "@/lib/hooks/use-leads";
import { Lead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEstimates } from "@/lib/hooks/use-sales";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const convertSchema = z.object({
    createContact: z.boolean(),
    createProjectFromDeal: z.boolean(),
    createInvoiceFromEstimate: z.boolean(),
    selectedEstimateId: z.string().optional(),
});

type ConvertFormData = z.infer<typeof convertSchema>;

interface ConvertLeadDialogProps {
    lead: Lead;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ConvertLeadDialog({ lead, trigger, open, onOpenChange }: ConvertLeadDialogProps) {
    const { convertToCustomer, isConverting, conversionStep } = useLeads();
    const { estimates } = useEstimates({ leadId: lead.id }); // Fetch estimates for this lead
    // const [isLoading, setIsLoading] = useState(false); // Deprecated in favor of hook state
    const router = useRouter();

    const [internalOpen, setInternalOpen] = useState(false);

    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : internalOpen;
    const onOpenChangeHandler = isControlled ? onOpenChange : setInternalOpen;

    const form = useForm<ConvertFormData>({
        resolver: zodResolver(convertSchema),
        defaultValues: {
            createContact: true,
            createProjectFromDeal: false,
            createInvoiceFromEstimate: false,
        },
    });

    const createProject = form.watch("createProjectFromDeal");
    const createInvoice = form.watch("createInvoiceFromEstimate");

    const onSubmit = async (data: ConvertFormData) => {
        try {
            // setIsLoading(true); // Handled by hook
            const customerId = await convertToCustomer(lead.id, {
                createContact: data.createContact,
                createProjectFromDeal: data.createProjectFromDeal,
                createInvoiceFromEstimate: data.createInvoiceFromEstimate,
                selectedEstimateId: data.selectedEstimateId,
            });

            toast.success("Lead Converted", {
                description: "Lead successfully converted to customer.",
            });

            onOpenChangeHandler?.(false);
            router.push(`/dashboard/customers/${customerId}`);
        } catch (error) {
            console.error(error);
            toast.error("Error", {
                description: "Failed to convert lead. Please try again.",
            });
        } finally {
            // setIsLoading(false); // Handled by hook
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChangeHandler}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Convert Lead to Customer</DialogTitle>
                    <DialogDescription>
                        Create a new customer from this lead. Select additional items to create.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                            {/* Create Customer (Always checked) */}
                            <div className="flex items-start space-x-3">
                                <Checkbox checked disabled />
                                <div className="grid gap-1.5 leading-none">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Create Customer & Company
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        Creates {lead.company || lead.name} in Customers.
                                    </p>
                                </div>
                            </div>

                            {/* Create Contact */}
                            <FormField
                                control={form.control}
                                name="createContact"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Create Contact Person</FormLabel>
                                            <FormDescription>Creates {lead.name} as a primary contact.</FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {/* Create Project */}
                            <FormField
                                control={form.control}
                                name="createProjectFromDeal"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={!lead.deal}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Create Project from Deal Data</FormLabel>
                                            <FormDescription>
                                                {lead.deal
                                                    ? `Creates project "${lead.deal.subject}"`
                                                    : "No deal data available (add in Deal section)"}
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {/* Create Invoice */}
                            <FormField
                                control={form.control}
                                name="createInvoiceFromEstimate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={!estimates || estimates.length === 0}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Create Invoice from Estimate</FormLabel>
                                            <FormDescription>
                                                {estimates && estimates.length > 0
                                                    ? "Converts an existing estimate to a draft invoice."
                                                    : "No estimates found for this lead."}
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>

                        {createInvoice && estimates && estimates.length > 0 && (
                            <FormField
                                control={form.control}
                                name="selectedEstimateId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Select Estimate to Convert</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value || estimates[0]?.id}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an estimate" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {estimates.map((est) => (
                                                    <SelectItem key={est.id} value={est.id}>
                                                        {est.number} - {est.currency} {est.total}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>This estimate will be marked as accepted.</FormDescription>
                                    </FormItem>
                                )}
                            />
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChangeHandler?.(false)}
                                disabled={isConverting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isConverting}>
                                {isConverting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {conversionStep || "Converting..."}
                                    </>
                                ) : (
                                    "Convert to Customer"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

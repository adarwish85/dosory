"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { dealSchema, lineItemSchema } from "@/lib/schemas";
import { useLeads } from "@/lib/hooks/use-leads";
import { Lead, Deal } from "@/lib/types";
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
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Timestamp } from "firebase/firestore";

// Convert dealSchema to form schema (dates as Date objects)
// dealSchema expects Date for expectedCloseDate
const formSchema = dealSchema;

type DealFormData = z.infer<typeof formSchema>;

interface EditDealDialogProps {
    lead: Lead;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function EditDealDialog({ lead, trigger, open, onOpenChange }: EditDealDialogProps) {
    const { updateLead } = useLeads();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [internalOpen, setInternalOpen] = useState(false);

    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : internalOpen;
    const onOpenChangeHandler = isControlled ? onOpenChange : setInternalOpen;

    const form = useForm<DealFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            subject: lead.deal?.subject || "",
            value: lead.deal?.value || 0,
            description: lead.deal?.description || "",
            expectedCloseDate: lead.deal?.expectedCloseDate instanceof Timestamp
                ? lead.deal.expectedCloseDate.toDate()
                : lead.deal?.expectedCloseDate || undefined,
            products: lead.deal?.products || [],
        },
    });

    // Reset when lead changes
    useEffect(() => {
        if (isOpen) {
            form.reset({
                subject: lead.deal?.subject || "",
                value: lead.deal?.value || 0,
                description: lead.deal?.description || "",
                expectedCloseDate: lead.deal?.expectedCloseDate instanceof Timestamp
                    ? lead.deal.expectedCloseDate.toDate()
                    : lead.deal?.expectedCloseDate || undefined,
                products: lead.deal?.products || [],
            });
        }
    }, [isOpen, lead.deal, form]);

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "products",
    });

    const onSubmit = async (data: DealFormData) => {
        try {
            setIsLoading(true);
            await updateLead(lead.id, {
                deal: data,
                // Also update generic value if it matches deal value?
                // Provide option or sync automatically?
                // Sync automatically makes sense.
                value: data.value,
            });

            toast({
                title: "Deal Updated",
                description: "Deal details saved successfully.",
            });
            onOpenChangeHandler?.(false);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to save deal details.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate total value from products if items exist
    const products = form.watch("products");
    useEffect(() => {
        if (products && products.length > 0) {
            const total = products.reduce((sum, item) => sum + (item.amount || 0), 0);
            if (total !== form.getValues("value")) {
                form.setValue("value", total);
            }
        }
    }, [products, form]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChangeHandler}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Deal Details</DialogTitle>
                    <DialogDescription>
                        Manage deal information, value, and products/services.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Deal Subject</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Q4 Marketing Contract" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="expectedCloseDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Expected Close Date</FormLabel>
                                        <Popover>
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
                                                    onSelect={field.onChange}
                                                    disabled={(date) =>
                                                        date < new Date("1900-01-01")
                                                    }
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
                                name="value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Deal Value</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Auto-calculated from products if added.
                                        </FormDescription>
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
                                        <Textarea placeholder="Deal details..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Products / Line Items */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <FormLabel className="text-base font-semibold">Products / Services</FormLabel>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({
                                        id: Math.random().toString(36).substr(2, 9),
                                        description: "",
                                        quantity: 1,
                                        rate: 0,
                                        amount: 0,
                                    })}
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Add Item
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-12 gap-2 items-start border p-2 rounded-md">
                                        <div className="col-span-5">
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.description`}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-0">
                                                        <FormControl>
                                                            <Input placeholder="Item name" {...field} />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.quantity`}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-0">
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                placeholder="Qty"
                                                                {...field}
                                                                onChange={e => {
                                                                    const qty = parseFloat(e.target.value) || 0;
                                                                    field.onChange(qty);
                                                                    const rate = form.getValues(`products.${index}.rate`);
                                                                    form.setValue(`products.${index}.amount`, qty * rate);
                                                                }}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.rate`}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-0">
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                placeholder="Rate"
                                                                {...field}
                                                                onChange={e => {
                                                                    const rate = parseFloat(e.target.value) || 0;
                                                                    field.onChange(rate);
                                                                    const qty = form.getValues(`products.${index}.quantity`);
                                                                    form.setValue(`products.${index}.amount`, qty * rate);
                                                                }}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="col-span-2 flex items-center h-10 px-3 text-sm font-medium">
                                            {form.watch(`products.${index}.amount`)?.toFixed(2)}
                                        </div>
                                        <div className="col-span-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(index)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {fields.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                                        No products added. Add items to calculate deal value automatically.
                                    </p>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChangeHandler?.(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Deal
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

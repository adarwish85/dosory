"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { leadFormSchema, type LeadFormData } from "@/lib/schemas";
import type { Lead } from "@/lib/types";
import { useEffect } from "react";
import { Printer, X, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LeadEditDialogProps {
    open: boolean;
    onClose: () => void;
    lead: Lead | null;
    onSave: (id: string, data: Partial<LeadFormData>) => Promise<void>;
}

export function LeadEditDialog({ open, onClose, lead, onSave }: LeadEditDialogProps) {
    const form = useForm({
        resolver: zodResolver(leadFormSchema),
        defaultValues: {
            name: "",
            status: "new",
            description: "",
            isPublic: false,
        },
    });

    useEffect(() => {
        if (lead) {
            form.reset({
                name: lead.name,
                company: lead.company || "",
                email: lead.email || "",
                phone: lead.phone || "",
                website: lead.website || "",
                address: lead.address || {},
                source: lead.source || "",
                status: lead.status,
                assignedTo: lead.assignedTo || "",
                value: lead.value || undefined,
                tags: lead.tags || [],
                description: lead.description || "",
                position: lead.position || "",
                defaultLanguage: lead.defaultLanguage || "",
                isPublic: lead.isPublic || false,
            });
        }
    }, [lead, form]);

    const handleSubmit = async (data: LeadFormData) => {
        if (!lead) return;
        await onSave(lead.id, data);
        onClose();
    };

    if (!lead) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[95vh] p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between sticky top-0 bg-white z-10">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        #{lead.id.substring(0, 4)} - {lead.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="text-gray-500 gap-2">
                            <Printer className="h-4 w-4" /> Print
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-gray-400 hover:text-gray-500">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </DialogHeader>

                <ScrollArea className="max-h-[calc(95vh-60px)]">
                    <div className="p-6">
                        {/* Action Header inside scroll */}
                        <div className="flex justify-end mb-6 gap-2 sticky top-0 bg-white/80 backdrop-blur pb-4 border-b z-10 -mx-6 px-6 pt-2">
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button onClick={form.handleSubmit(handleSubmit)} className="bg-gray-900 text-white hover:bg-gray-800">
                                Save
                            </Button>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                                {/* Top Row: Status, Source, Assigned */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-red-500">* Status</FormLabel>
                                                <div className="flex gap-2">
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select status" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="new">New</SelectItem>
                                                            <SelectItem value="contacted">Attempted to Contact</SelectItem>
                                                            <SelectItem value="qualified">SQL</SelectItem>
                                                            <SelectItem value="proposal">Offer Sent</SelectItem>
                                                            <SelectItem value="negotiation">Negotiation</SelectItem>
                                                            <SelectItem value="won">Partner</SelectItem>
                                                            <SelectItem value="lost">Closed: Lost</SelectItem>
                                                            <SelectItem value="junk">Junk</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Button type="button" variant="outline" size="icon" className="shrink-0">
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="source"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-red-500">* Source</FormLabel>
                                                <div className="flex gap-2">
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select source" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="WebSite">WebSite</SelectItem>
                                                            <SelectItem value="Referral">Referral</SelectItem>
                                                            <SelectItem value="Social Media">Social Media</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Button type="button" variant="outline" size="icon" className="shrink-0">
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="assignedTo"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Assigned</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Nothing selected" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                                        {/* Populate with actual staff */}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Tags */}
                                <FormField
                                    control={form.control}
                                    name="tags"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tags</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Tag" {...field} value={field.value?.join(", ") || ""} onChange={(e) => field.onChange(e.target.value.split(",").map(t => t.trim()).filter(Boolean))} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-red-500">* Name</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="space-y-2">
                                        <FormLabel>Address</FormLabel>
                                        <Input {...form.register("address.street")} />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="position"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Position</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="space-y-2">
                                        <FormLabel>City</FormLabel>
                                        <Input {...form.register("address.city")} />
                                    </div>


                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email Address</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="space-y-2">
                                        <FormLabel>State</FormLabel>
                                        <Input {...form.register("address.state")} />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="website"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Website</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="space-y-2">
                                        <FormLabel>Country</FormLabel>
                                        <Select onValueChange={(val) => form.setValue("address.country", val)} defaultValue={form.getValues("address.country")}>
                                            <SelectTrigger><SelectValue placeholder="Nothing selected" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="USA">USA</SelectItem>
                                                <SelectItem value="Egypt">Egypt</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Phone</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="space-y-2">
                                        <FormLabel>Zip Code</FormLabel>
                                        <Input {...form.register("address.zipCode")} />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="value"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Lead value</FormLabel>
                                                <div className="flex gap-2">
                                                    <FormControl>
                                                        <Input type="number" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                                                    </FormControl>
                                                    <div className="flex items-center justify-center border rounded px-3 bg-gray-50 text-sm text-gray-500">
                                                        EGP
                                                    </div>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="defaultLanguage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Default Language</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="System Default" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="en">English</SelectItem>
                                                        <SelectItem value="ar">Arabic</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="company"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Company</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
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
                                                <Textarea {...field} className="min-h-[100px]" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <FormLabel>Last Contact</FormLabel>
                                        <div className="relative">
                                            <Input type="date" className="w-full" disabled />
                                            {/* Date picker would go here */}
                                        </div>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="isPublic"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>
                                                        Public
                                                    </FormLabel>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </form>
                        </Form>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

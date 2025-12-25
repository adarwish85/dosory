"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { leadFormSchema, type LeadFormData } from "@/lib/schemas";
import { ArrowLeft, Save, Loader2, AlertTriangle } from "lucide-react";
import { LEAD_STATUSES, LEAD_SOURCES } from "@/lib/constants";
import { useStaff } from "@/lib/hooks/use-staff";
import { useLeads } from "@/lib/hooks/use-leads";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Lead } from "@/lib/types";

export default function NewLeadPage() {
    const router = useRouter();
    const { staff } = useStaff();
    const { createLead, leads } = useLeads();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [duplicateWarning, setDuplicateWarning] = useState<{ type: "email" | "phone"; duplicates: Lead[] } | null>(null);

    const form = useForm({
        resolver: zodResolver(leadFormSchema),
        defaultValues: {
            name: "",
            company: "",
            email: "",
            phone: "",
            website: "",
            address: {},
            source: "",
            status: "new" as const,
            assignedTo: "",
            value: undefined,
            tags: [],
            description: "",
            position: "",
            defaultLanguage: "",
            isPublic: false,
        },
    });

    const handleSubmit: SubmitHandler<LeadFormData> = async (data) => {
        setIsSubmitting(true);
        try {
            await createLead(data);
            router.push("/dashboard/leads");
        } catch (error) {
            console.error("Failed to create lead:", error);
            setIsSubmitting(false);
        }
    };

    // Check for duplicates when email or phone changes
    const watchedEmail = form.watch("email");
    const watchedPhone = form.watch("phone");

    useEffect(() => {
        if (!leads.length) return;

        if (watchedEmail) {
            const emailDuplicates = leads.filter(l =>
                l.email && l.email.toLowerCase() === watchedEmail.toLowerCase()
            );
            if (emailDuplicates.length > 0) {
                setDuplicateWarning({ type: "email", duplicates: emailDuplicates });
                return;
            }
        }

        if (watchedPhone) {
            const phoneDuplicates = leads.filter(l =>
                l.phone && l.phone.replace(/\D/g, '') === watchedPhone.replace(/\D/g, '')
            );
            if (phoneDuplicates.length > 0) {
                setDuplicateWarning({ type: "phone", duplicates: phoneDuplicates });
                return;
            }
        }

        setDuplicateWarning(null);
    }, [watchedEmail, watchedPhone, leads]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/leads">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">New Lead</h1>
                </div>
                <Button
                    onClick={form.handleSubmit(handleSubmit)}
                    disabled={isSubmitting}
                    className="bg-gray-900 text-white hover:bg-gray-800"
                >
                    {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Lead
                </Button>
            </div>

            {/* Form */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
                <Form {...form}>
                    <form className="space-y-8">
                        {/* Duplicate Warning */}
                        {duplicateWarning && (
                            <Alert variant="destructive" className="bg-yellow-50 border-yellow-300 text-yellow-800">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Potential Duplicate Found!</AlertTitle>
                                <AlertDescription>
                                    A lead with this {duplicateWarning.type} already exists: {duplicateWarning.duplicates.map((d, i) => (
                                        <span key={d.id}>
                                            {i > 0 && ", "}
                                            <strong>{d.name}</strong>
                                            {d.company && ` (${d.company})`}
                                        </span>
                                    ))}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Contact name" {...field} />
                                            </FormControl>
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
                                                <Input placeholder="Company name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="email@example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone</FormLabel>
                                            <FormControl>
                                                <Input placeholder="+1 234 567 890" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="position"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Position</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Job title" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="website"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Website</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Lead Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">Lead Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {LEAD_STATUSES.map((status) => (
                                                        <SelectItem key={status.value} value={status.value}>
                                                            {status.label}
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
                                    name="source"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Source</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select source" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {LEAD_SOURCES.map((source) => (
                                                        <SelectItem key={source} value={source}>
                                                            {source}
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
                                    name="value"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Value ($)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    {...field}
                                                    value={field.value ?? ""}
                                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="assignedTo"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Assigned To</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select staff member" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {staff.map((member) => (
                                                        <SelectItem key={member.id} value={member.id}>
                                                            {member.firstName} {member.lastName}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">Address</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="address.street"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Street</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Street address" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="address.city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>City</FormLabel>
                                            <FormControl>
                                                <Input placeholder="City" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="address.state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>State / Province</FormLabel>
                                            <FormControl>
                                                <Input placeholder="State" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="address.zipCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Zip / Postal Code</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Zip code" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="address.country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Country</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Country" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">Additional Information</h3>
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Add notes about this lead..."
                                                className="min-h-[100px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="isPublic"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Public Lead</FormLabel>
                                            <p className="text-sm text-gray-500">
                                                Make this lead visible to all team members
                                            </p>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}

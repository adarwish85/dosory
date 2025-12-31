"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ticketFormSchema, type TicketFormData } from "@/lib/schemas";
import { useTickets, useDepartments } from "@/lib/hooks/use-support";
import { useCustomers } from "@/lib/hooks/use-customers";
import { useStaff } from "@/lib/hooks/use-staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

export default function CreateTicketPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const customerIdParam = searchParams.get("customerId");

    const { createTicket } = useTickets();
    const { departments, loading: departmentsLoading } = useDepartments();
    const { customers, loading: customersLoading } = useCustomers({ status: "active", pageSize: 1000 });
    const { staff, loading: staffLoading } = useStaff();

    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<TicketFormData>({
        resolver: zodResolver(ticketFormSchema),
        defaultValues: {
            subject: "",
            customerId: customerIdParam || "",
            priority: "medium",
            departmentId: "",
            tags: [],
        },
    });

    const { register, handleSubmit, formState: { errors }, setValue, watch } = form;

    useEffect(() => {
        if (customerIdParam) {
            setValue("customerId", customerIdParam);
        }
    }, [customerIdParam, setValue]);

    const onSubmit = async (data: TicketFormData) => {
        setIsSubmitting(true);
        try {
            await createTicket(data);
            toast.success("Ticket created successfully");

            if (customerIdParam) {
                router.push(`/dashboard/customers/${customerIdParam}/tickets`);
            } else {
                router.push("/dashboard/support");
            }
        } catch (error) {
            console.error("Error creating ticket:", error);
            toast.error("Failed to create ticket");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="mb-6 flex items-center gap-2 text-gray-500 text-sm">
                <Link
                    href={customerIdParam ? `/dashboard/customers/${customerIdParam}/tickets` : "/dashboard/support"}
                    className="flex items-center hover:text-gray-900 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back to Tickets
                </Link>
            </div>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">New Support Ticket</h1>
                <p className="text-gray-500 mt-1">Open a new ticket for a customer issue.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Ticket Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        {/* Subject */}
                        <div className="grid gap-2">
                            <Label htmlFor="subject">Subject <span className="text-red-500">*</span></Label>
                            <Input
                                id="subject"
                                placeholder="e.g. Login Issue"
                                {...register("subject")}
                                className={cn(errors.subject && "border-red-500")}
                            />
                            {errors.subject && <p className="text-red-500 text-xs">{errors.subject.message}</p>}
                        </div>

                        {/* Customer & Department */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="customerId">Customer</Label>
                                <Select
                                    value={watch("customerId")}
                                    onValueChange={(val) => setValue("customerId", val)}
                                    disabled={!!customerIdParam}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Unknown / Internal</SelectItem>
                                        {customers.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="departmentId">Department <span className="text-red-500">*</span></Label>
                                <Select
                                    value={watch("departmentId")}
                                    onValueChange={(val) => setValue("departmentId", val, { shouldValidate: true })}
                                >
                                    <SelectTrigger className={cn(errors.departmentId && "border-red-500")}>
                                        <SelectValue placeholder="Select Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departmentsLoading ? (
                                            <div className="p-2 text-xs text-center">Loading...</div>
                                        ) : (
                                            departments.map((d) => (
                                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                            ))
                                        )}
                                        {departments.length === 0 && !departmentsLoading && (
                                            <SelectItem value="general">General Support (Auto)</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                {errors.departmentId && <p className="text-red-500 text-xs">{errors.departmentId.message}</p>}
                            </div>
                        </div>

                        {/* Priority & Assignee */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={watch("priority")}
                                    onValueChange={(val: any) => setValue("priority", val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="assignedTo">Assign To (Optional)</Label>
                                <Select
                                    value={watch("assignedTo")}
                                    onValueChange={(val) => setValue("assignedTo", val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {staff?.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end border-t border-gray-100 px-6 py-4 bg-gray-50/50 rounded-b-xl">
                        <Button type="button" variant="ghost" className="mr-2" onClick={() => router.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Ticket
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}

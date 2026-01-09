"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { activityFormSchema } from "@/lib/schemas";
import type { ActivityFormData } from "@/lib/schemas";
import { useActivities } from "@/lib/hooks/use-activities";
import type { Activity } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CreateActivityDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    relatedTo: { type: "lead" | "customer"; id: string };
    activity?: Activity | null; // For editing
    onSuccess?: () => void;
}

export function CreateActivityDialog({
    open,
    onOpenChange,
    relatedTo,
    activity,
    onSuccess,
}: CreateActivityDialogProps) {
    const { createActivity, updateActivity } = useActivities({
        relatedToId: relatedTo.id,
        relatedToType: relatedTo.type,
    });
    const [isLoading, setIsLoading] = useState(false);
    const isEditing = !!activity;

    const form = useForm<ActivityFormData>({
        resolver: zodResolver(activityFormSchema),
        defaultValues: {
            type: "call",
            subject: "",
            dateTime: new Date(),
            duration: undefined,
            notes: "",
            outcome: "pending",
        },
    });

    // Reset form when dialog opens or activity changes
    useEffect(() => {
        if (open) {
            if (activity) {
                form.reset({
                    type: activity.type,
                    subject: activity.subject,
                    dateTime: activity.dateTime.toDate(),
                    duration: activity.duration,
                    notes: activity.notes || "",
                    outcome: activity.outcome,
                });
            } else {
                form.reset({
                    type: "call",
                    subject: "",
                    dateTime: new Date(),
                    duration: undefined,
                    notes: "",
                    outcome: "pending",
                });
            }
        }
    }, [open, activity, form]);

    const onSubmit = async (data: ActivityFormData) => {
        try {
            setIsLoading(true);
            if (isEditing && activity) {
                await updateActivity(activity.id, data);
                toast.success("Activity updated");
            } else {
                await createActivity(data, relatedTo);
                toast.success("Activity logged");
            }
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error(error);
            toast.error(isEditing ? "Failed to update activity" : "Failed to log activity");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Activity" : "Log New Activity"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Update the activity details." : "Record a meeting, call, email, or follow-up."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                                <SelectItem value="meeting">Meeting</SelectItem>
                                                <SelectItem value="call">Call</SelectItem>
                                                <SelectItem value="follow_up">Follow-up</SelectItem>
                                                <SelectItem value="email">Email</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="outcome"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Outcome</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select outcome" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Follow-up call about proposal" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="dateTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date & Time</FormLabel>
                                        <FormControl>
                                            <DateTimePicker date={field.value} setDate={field.onChange} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="duration"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Duration (minutes)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="30"
                                                {...field}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.value ? parseInt(e.target.value) : undefined
                                                    )
                                                }
                                                value={field.value ?? ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Add any notes or details..."
                                            className="min-h-[80px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? "Save Changes" : "Log Activity"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

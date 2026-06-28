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
import { useTranslation } from "@/lib/i18n";

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
    const { t } = useTranslation();
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
                toast.success(t("activities.toast.updated"));
            } else {
                await createActivity(data, relatedTo);
                toast.success(t("activities.toast.logged"));
            }
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error(error);
            toast.error(isEditing ? t("activities.toast.updateFailed") : t("activities.toast.logFailed"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? t("activities.dialog.editTitle") : t("activities.dialog.createTitle")}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? t("activities.dialog.editDescription") : t("activities.dialog.createDescription")}
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
                                        <FormLabel>{t("activities.table.type")}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("activities.field.selectType")} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="meeting">{t("activities.type.meeting")}</SelectItem>
                                                <SelectItem value="call">{t("activities.type.call")}</SelectItem>
                                                <SelectItem value="follow_up">{t("activities.type.followUp")}</SelectItem>
                                                <SelectItem value="email">{t("activities.type.email")}</SelectItem>
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
                                        <FormLabel>{t("activities.table.outcome")}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("activities.field.selectOutcome")} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="pending">{t("activities.outcome.pending")}</SelectItem>
                                                <SelectItem value="completed">{t("activities.outcome.completed")}</SelectItem>
                                                <SelectItem value="cancelled">{t("activities.outcome.cancelled")}</SelectItem>
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
                                    <FormLabel>{t("activities.field.subjectRequired")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("activities.field.subjectPlaceholder")} {...field} />
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
                                        <FormLabel>{t("activities.table.dateTime")}</FormLabel>
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
                                        <FormLabel>{t("activities.field.durationMinutes")}</FormLabel>
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
                                    <FormLabel>{t("activities.field.notes")}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t("activities.field.notesPlaceholder")}
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
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? t("common.saveChanges") : t("activities.logActivity")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

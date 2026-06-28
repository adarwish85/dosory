"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useReminders } from "@/lib/hooks/use-customer-data";
import { useCustomer } from "../customer-context";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Timestamp } from "firebase/firestore";
import { useTranslation } from "@/lib/i18n";

interface CreateReminderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface FormData {
    description: string;
    date: string;
    time: string;
}

export function CreateReminderDialog({ open, onOpenChange }: CreateReminderDialogProps) {
    const { t } = useTranslation();
    const { customerId, customer } = useCustomer();
    const { createReminder } = useReminders();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

    const onSubmit = async (data: FormData) => {
        if (!customerId) return;

        setLoading(true);
        try {
            // Combine date and time
            const dateTime = new Date(`${data.date}T${data.time}`);

            await createReminder({
                description: data.description,
                date: Timestamp.fromDate(dateTime),
                relatedTo: { type: "customer", id: customerId || "" },
                assignedTo: user?.uid || "system",
                sendEmail: false,
                createdBy: user?.uid || "system",
                isRead: false,
            });

            toast.success(t("customers.reminders.setSuccess"));
            onOpenChange(false);
            reset();
        } catch (error) {
            console.error(error);
            toast.error(t("customers.reminders.setError"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("customers.reminders.title")}</DialogTitle>
                    <DialogDescription>{t("customers.reminders.description")}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">


                    <div className="grid gap-2">
                        <Label htmlFor="description">{t("common.description")}</Label>
                        <Textarea
                            id="description"
                            {...register("description")}
                            placeholder={t("customers.reminders.detailsPlaceholder")}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="date">{t("common.date")}</Label>
                            <Input
                                id="date"
                                type="date"
                                {...register("date", { required: t("customers.reminders.dateRequired") })}
                            />
                            {errors.date && <p className="text-red-500 text-xs">{errors.date.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="time">{t("customers.reminders.time")}</Label>
                            <Input
                                id="time"
                                type="time"
                                {...register("time", { required: t("customers.reminders.timeRequired") })}
                            />
                            {errors.time && <p className="text-red-500 text-xs">{errors.time.message}</p>}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t("customers.reminders.setReminder")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

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

            toast.success("Reminder set successfully");
            onOpenChange(false);
            reset();
        } catch (error) {
            console.error(error);
            toast.error("Failed to set reminder");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Set Reminder</DialogTitle>
                    <DialogDescription>Create a new reminder for this customer.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">


                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            {...register("description")}
                            placeholder="Add details..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                {...register("date", { required: "Date is required" })}
                            />
                            {errors.date && <p className="text-red-500 text-xs">{errors.date.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="time">Time</Label>
                            <Input
                                id="time"
                                type="time"
                                {...register("time", { required: "Time is required" })}
                            />
                            {errors.time && <p className="text-red-500 text-xs">{errors.time.message}</p>}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Set Reminder"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

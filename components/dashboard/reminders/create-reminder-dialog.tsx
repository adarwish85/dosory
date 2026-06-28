"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reminderFormSchema, ReminderFormData } from "@/lib/schemas";
import { useReminders } from "@/lib/hooks/use-reminders";
import { useStaff } from "@/lib/hooks/use-staff";
import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface CreateReminderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadId?: string;
    leadName?: string;
    customerId?: string;
}

export function CreateReminderDialog({
    open,
    onOpenChange,
    leadId,
    leadName,
    customerId,
}: CreateReminderDialogProps) {
    const { t } = useTranslation();
    const { createReminder } = useReminders();
    const { staff } = useStaff();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState<string>("09:00");

    const form = useForm<ReminderFormData>({
        resolver: zodResolver(reminderFormSchema),
        defaultValues: {
            description: "",
            assignedTo: "",
            sendEmail: false,
            date: new Date(),
            relatedTo: leadId ? { type: "lead", id: leadId } : customerId ? { type: "customer", id: customerId } : undefined,
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                description: "",
                assignedTo: "", // Will need to default to current user if possible, but leaving empty forces selection
                sendEmail: false,
                date: new Date(),
                relatedTo: leadId ? { type: "lead", id: leadId } : customerId ? { type: "customer", id: customerId } : undefined,
            });
            setSelectedDate(new Date());
            setSelectedTime("09:00");
        }
    }, [open, leadId, customerId, form]);

    // Generate time options (every 30 mins)
    const timeOptions = [];
    for (let i = 0; i < 24; i++) {
        for (let j = 0; j < 60; j += 30) {
            const hour = i.toString().padStart(2, '0');
            const minute = j.toString().padStart(2, '0');
            timeOptions.push(`${hour}:${minute}`);
        }
    }

    const onSubmit = async (data: ReminderFormData) => {
        try {
            setIsSubmitting(true);

            // combine date and time
            if (selectedDate) {
                const [hours, minutes] = selectedTime.split(':');
                const combinedDate = new Date(selectedDate);
                combinedDate.setHours(parseInt(hours), parseInt(minutes));
                data.date = combinedDate;
            }

            await createReminder(data);
            onOpenChange(false);
            form.reset();
        } catch (error) {
            console.error("Failed to create reminder:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t("reminders.dialog.title")}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormItem className="flex flex-col">
                                <FormLabel>{t("reminders.field.dateRequired")}</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !selectedDate && "text-muted-foreground"
                                            )}
                                        >
                                            {selectedDate ? (
                                                format(selectedDate, "PPP")
                                            ) : (
                                                <span>{t("reminders.field.pickDate")}</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={setSelectedDate}
                                            disabled={(date) =>
                                                date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </FormItem>

                            <FormItem>
                                <FormLabel>{t("reminders.field.timeRequired")}</FormLabel>
                                <Select value={selectedTime} onValueChange={setSelectedTime}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("reminders.field.selectTime")} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {timeOptions.map((time) => (
                                            <SelectItem key={time} value={time}>
                                                {time}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        </div>

                        <FormField
                            control={form.control}
                            name="assignedTo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("reminders.field.setReminderTo")}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t("reminders.field.selectStaff")} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {staff.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {s.firstName} {s.lastName}
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
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("reminders.field.descriptionRequired")}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t("reminders.field.descriptionPlaceholder")}
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
                            name="sendEmail"
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
                                            {t("reminders.field.sendEmail")}
                                        </FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                {t("common.close")}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t("common.save")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

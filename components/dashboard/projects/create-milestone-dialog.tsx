"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { milestoneFormSchema, type MilestoneFormData } from "@/lib/schemas";
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
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMilestones } from "@/lib/hooks/use-project-data";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

interface CreateMilestoneDialogProps {
    projectId: string;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function CreateMilestoneDialog({
    projectId,
    trigger,
    open: controlledOpen,
    onOpenChange: setControlledOpen,
}: CreateMilestoneDialogProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const { createMilestone } = useMilestones(projectId);

    const isControlled = controlledOpen !== undefined;
    const show = isControlled ? controlledOpen : open;
    const setShow = isControlled ? setControlledOpen : setOpen;

    const form = useForm<MilestoneFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(milestoneFormSchema) as any,
        defaultValues: {
            name: "",
            description: "",
            projectId,
            color: "#3b82f6", // Default blue
            order: 0,
        },
    });

    useEffect(() => {
        if (projectId) {
            form.setValue("projectId", projectId);
        }
    }, [projectId, form]);


    const onSubmit = async (data: MilestoneFormData) => {
        try {
            await createMilestone(data);
            toast.success(t("projects.milestone.createSuccess"));
            if (setShow) setShow(false);
            form.reset({
                name: "",
                description: "",
                projectId,
                dueDate: undefined,
                color: "#3b82f6",
                order: 0,
            });
        } catch (error) {
            console.error(error);
            toast.error(t("projects.milestone.createError"));
        }
    };

    return (
        <Dialog open={show} onOpenChange={setShow}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        {t("projects.milestone.new")}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t("projects.milestone.createTitle")}</DialogTitle>
                    <DialogDescription>
                        {t("projects.milestone.createDescription")}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("common.name")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("projects.milestone.namePlaceholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{t("projects.milestone.dueDate")}</FormLabel>
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
                                                        <span>{t("projects.milestone.pickDate")}</span>
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
                            name="color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("projects.milestone.color")}</FormLabel>
                                    <FormControl>
                                        <div className="flex gap-2">
                                            <Input type="color" className="w-12 h-10 p-1" {...field} />
                                            <Input {...field} placeholder="#RRGGBB" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("common.description")}</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder={t("projects.milestone.descriptionPlaceholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShow && setShow(false)}>
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {t("projects.milestone.createTitle")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

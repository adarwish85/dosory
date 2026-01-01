"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTaskLists } from "@/lib/hooks/use-task-lists";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { TaskList } from "@/lib/types";

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
});

type FormData = z.infer<typeof formSchema>;

interface EditTaskListDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskList: TaskList;
}

export function EditTaskListDialog({ open, onOpenChange, taskList }: EditTaskListDialogProps) {
    const { updateTaskList } = useTaskLists();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: taskList.name,
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                name: taskList.name,
            });
        }
    }, [open, taskList, form]);

    const onSubmit = async (data: FormData) => {
        try {
            setIsSubmitting(true);
            await updateTaskList(taskList.id, {
                name: data.name,
            });
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to update task list:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Task List</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Task list name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

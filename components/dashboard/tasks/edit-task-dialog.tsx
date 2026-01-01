"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { taskFormSchema, TaskFormData } from "@/lib/schemas";
import { useTasks } from "@/lib/hooks/use-projects";
import { useStaff } from "@/lib/hooks/use-staff";
import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Task } from "@/lib/types";

interface EditTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: Task;
}

export function EditTaskDialog({ open, onOpenChange, task }: EditTaskDialogProps) {
    const { updateTask } = useTasks();
    const { staff } = useStaff();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<TaskFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(taskFormSchema) as any,
        defaultValues: {
            name: task.name,
            description: task.description || "",
            status: task.status,
            priority: task.priority,
            assignees: task.assignees || [],
            followers: task.followers || [],
            isPublic: task.isPublic || false,
            billable: task.billable || false,
            hourlyRate: task.hourlyRate || 0,
            dueDate: task.dueDate ? task.dueDate.toDate() : undefined,
            startDate: task.startDate ? task.startDate.toDate() : undefined,
            relatedTo: task.relatedTo,
            customerId: task.customerId,
        },
    });

    // Reset form when task changes
    useEffect(() => {
        if (open && task) {
            form.reset({
                name: task.name,
                description: task.description || "",
                status: task.status,
                priority: task.priority,
                assignees: task.assignees || [],
                followers: task.followers || [],
                isPublic: task.isPublic || false,
                billable: task.billable || false,
                hourlyRate: task.hourlyRate || 0,
                dueDate: task.dueDate ? task.dueDate.toDate() : undefined,
                startDate: task.startDate ? task.startDate.toDate() : undefined,
                relatedTo: task.relatedTo,
                customerId: task.customerId,
            });
        }
    }, [open, task, form]);

    const onSubmit = async (data: TaskFormData) => {
        try {
            setIsSubmitting(true);
            await updateTask(task.id, data);
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to update task:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Task</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Task subject" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="hourlyRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hourly Rate</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormItem>
                                <FormLabel>Repeat every</FormLabel>
                                <Select disabled>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Nothing selected" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Start Date</FormLabel>
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
                                                            <span>Pick a date</span>
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
                                                    disabled={(date) => date < new Date("1900-01-01")}
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
                                name="dueDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Due Date</FormLabel>
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
                                                            <span>Pick a date</span>
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
                                                    disabled={(date) => date < new Date("1900-01-01")}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Priority</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select priority" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="urgent">Urgent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormItem>
                                <FormLabel>Related To</FormLabel>
                                <Select disabled defaultValue={task.relatedTo?.type || "lead"}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="lead">Lead</SelectItem>
                                        <SelectItem value="customer">Customer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="assignees"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Assignees</FormLabel>
                                        <Select onValueChange={(val) => field.onChange([...field.value, val])}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select assignees" />
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
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {field.value.length} assigned
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="followers"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Followers</FormLabel>
                                        <Select onValueChange={(val) => field.onChange([...(field.value || []), val])}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select followers" />
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
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {(field.value || []).length} followers
                                        </div>
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
                                    <FormLabel>Task Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Add Description" className="min-h-[100px]" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Close
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

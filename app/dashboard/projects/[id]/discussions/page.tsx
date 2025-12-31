"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useProjectDiscussions } from "@/lib/hooks/use-project-data";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { discussionFormSchema, type DiscussionFormData } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { MessageSquare, Plus, Loader2, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function ProjectDiscussionsPage() {
    const params = useParams();
    const projectId = params.id as string;
    const { discussions, loading, createDiscussion } = useProjectDiscussions(projectId);
    const [dialogOpen, setDialogOpen] = useState(false);

    const form = useForm<DiscussionFormData>({
        resolver: zodResolver(discussionFormSchema),
        defaultValues: {
            projectId,
            subject: "",
            description: "",
            participants: [],
        },
    });

    const onSubmit = async (data: DiscussionFormData) => {
        try {
            await createDiscussion(data);
            toast.success("Discussion started");
            setDialogOpen(false);
            form.reset({ projectId, subject: "", description: "", participants: [] });
        } catch (error) {
            console.error(error);
            toast.error("Failed to start discussion");
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Discussions</h2>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> New Discussion
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Start a Discussion</DialogTitle>
                            <DialogDescription>Create a topic for team discussion.</DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Subject</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Design Review" {...field} />
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
                                            <FormLabel>Message</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Start the conversation..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Start Discussion
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4">
                {discussions.length === 0 ? (
                    <div className="text-center py-20 border rounded-lg bg-gray-50/50 border-dashed text-muted-foreground">
                        <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p>No discussions yet. Start one!</p>
                    </div>
                ) : (
                    discussions.map((discussion) => (
                        <Card key={discussion.id} className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg text-primary">{discussion.subject}</CardTitle>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>Started by {discussion.createdBy || "Unknown"}</span>
                                            <span>•</span>
                                            <span>{format(discussion.createdAt.toDate(), "MMM d, yyyy h:mm a")}</span>
                                        </div>
                                    </div>
                                    <Badge variant="outline">{discussion.participants.length} Participants</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-600 line-clamp-2">{discussion.description}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

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
import { format, formatDistanceToNow } from "date-fns";
import { MessageSquare, Plus, Loader2, X, Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProjectDiscussion } from "@/lib/types";

export default function ProjectDiscussionsPage() {
    const params = useParams();
    const projectId = params.id as string;
    const { discussions, loading, createDiscussion, addComment } = useProjectDiscussions(projectId);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedDiscussion, setSelectedDiscussion] = useState<ProjectDiscussion | null>(null);
    const [commentText, setCommentText] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);

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

    const handleAddComment = async () => {
        if (!selectedDiscussion || !commentText.trim()) return;

        setSubmittingComment(true);
        try {
            await addComment(selectedDiscussion.id, commentText.trim());
            setCommentText("");
            toast.success("Comment added");
            // Refresh selected discussion from state
            const updated = discussions.find(d => d.id === selectedDiscussion.id);
            if (updated) setSelectedDiscussion(updated);
        } catch (error) {
            console.error(error);
            toast.error("Failed to add comment");
        } finally {
            setSubmittingComment(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    // Discussion Detail View
    if (selectedDiscussion) {
        const comments = selectedDiscussion.comments || [];

        return (
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <button
                        onClick={() => setSelectedDiscussion(null)}
                        className="mt-1 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-500" />
                    </button>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold">{selectedDiscussion.subject}</h2>
                        <p className="text-sm text-muted-foreground">
                            Started by {selectedDiscussion.createdByName || "Unknown"} • {formatDistanceToNow(selectedDiscussion.createdAt.toDate(), { addSuffix: true })}
                        </p>
                    </div>
                    <Badge variant="outline">{comments.length} {comments.length === 1 ? "comment" : "comments"}</Badge>
                </div>

                {/* Original Post */}
                <Card className="bg-blue-50/50 border-blue-200">
                    <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-blue-600 text-white">
                                    {(selectedDiscussion.createdByName || "U").charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{selectedDiscussion.createdByName || "Unknown"}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {format(selectedDiscussion.createdAt.toDate(), "MMM d, yyyy h:mm a")}
                                    </span>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap">{selectedDiscussion.description}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Comments */}
                <div className="space-y-4">
                    {comments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border rounded-lg bg-gray-50/50 border-dashed">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p>No comments yet. Be the first to reply!</p>
                        </div>
                    ) : (
                        <ScrollArea className="max-h-[400px]">
                            <div className="space-y-3 pr-4">
                                {comments.map((comment) => (
                                    <Card key={comment.id} className="bg-white">
                                        <CardContent className="pt-4">
                                            <div className="flex items-start gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="bg-gray-200 text-gray-700 text-sm">
                                                        {comment.authorName.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-sm">{comment.authorName}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                {/* Comment Input */}
                <div className="flex gap-2 pt-4 border-t">
                    <Textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment..."
                        className="flex-1 min-h-[80px]"
                    />
                    <Button
                        onClick={handleAddComment}
                        disabled={!commentText.trim() || submittingComment}
                        className="self-end"
                    >
                        {submittingComment ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        );
    }

    // Discussions List View
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
                        <Card
                            key={discussion.id}
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedDiscussion(discussion)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg text-primary">{discussion.subject}</CardTitle>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>Started by {discussion.createdByName || discussion.createdBy || "Unknown"}</span>
                                            <span>•</span>
                                            <span>{format(discussion.createdAt.toDate(), "MMM d, yyyy h:mm a")}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(discussion.comments?.length || 0) > 0 && (
                                            <Badge variant="secondary" className="gap-1">
                                                <MessageSquare className="h-3 w-3" />
                                                {discussion.comments?.length}
                                            </Badge>
                                        )}
                                        <Badge variant="outline">{discussion.participants.length} Participants</Badge>
                                    </div>
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

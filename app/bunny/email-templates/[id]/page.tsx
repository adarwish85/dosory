"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEmailTemplate, htmlToPlainText, replaceVariables } from "@/lib/hooks/use-email-templates";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    ArrowLeft, Save, Eye, Send, History, RotateCcw,
    Loader2, Bold, Italic, Link as LinkIcon, List, ListOrdered,
    AlignLeft, AlignCenter, AlignRight, Heading1, Heading2,
    Code, ChevronDown, Check, X
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// TipTap imports
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";

// Editor Toolbar Component
function EditorToolbar({ editor }: { editor: Editor | null }) {
    if (!editor) return null;

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-gray-50">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={editor.isActive("bold") ? "bg-gray-200" : ""}
            >
                <Bold className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={editor.isActive("italic") ? "bg-gray-200" : ""}
            >
                <Italic className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={editor.isActive("heading", { level: 1 }) ? "bg-gray-200" : ""}
            >
                <Heading1 className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={editor.isActive("heading", { level: 2 }) ? "bg-gray-200" : ""}
            >
                <Heading2 className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={editor.isActive("bulletList") ? "bg-gray-200" : ""}
            >
                <List className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={editor.isActive("orderedList") ? "bg-gray-200" : ""}
            >
                <ListOrdered className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
                className={editor.isActive({ textAlign: "left" }) ? "bg-gray-200" : ""}
            >
                <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
                className={editor.isActive({ textAlign: "center" }) ? "bg-gray-200" : ""}
            >
                <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
                className={editor.isActive({ textAlign: "right" }) ? "bg-gray-200" : ""}
            >
                <AlignRight className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                    const url = window.prompt("Enter URL:");
                    if (url) {
                        editor.chain().focus().setLink({ href: url }).run();
                    }
                }}
                className={editor.isActive("link") ? "bg-gray-200" : ""}
            >
                <LinkIcon className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={editor.isActive("codeBlock") ? "bg-gray-200" : ""}
            >
                <Code className="h-4 w-4" />
            </Button>
        </div>
    );
}

export default function EmailTemplateEditorPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const templateId = params.id as string;

    const {
        template,
        versions,
        loading,
        saving,
        error,
        updateTemplate,
        toggleEnabled,
        resetToDefault,
        restoreVersion
    } = useEmailTemplate(templateId);

    // Local state for editing
    const [subject, setSubject] = useState("");
    const [htmlContent, setHtmlContent] = useState("");
    const [hasChanges, setHasChanges] = useState(false);
    const [showVersions, setShowVersions] = useState(false);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [showTestDialog, setShowTestDialog] = useState(false);
    const [testEmail, setTestEmail] = useState("");
    const [sendingTest, setSendingTest] = useState(false);

    // TipTap Editor
    const editor = useEditor({
        extensions: [
            StarterKit,
            LinkExtension.configure({
                openOnClick: false,
            }),
            Placeholder.configure({
                placeholder: "Start writing your email content...",
            }),
            TextAlign.configure({
                types: ["heading", "paragraph"],
            }),
        ],
        content: "",
        onUpdate: ({ editor }) => {
            setHtmlContent(editor.getHTML());
            setHasChanges(true);
        },
    });

    // Initialize editor content when template loads
    useEffect(() => {
        if (template && editor) {
            setSubject(template.subject);
            setHtmlContent(template.htmlContent);
            editor.commands.setContent(template.htmlContent);
            setHasChanges(false);
        }
    }, [template, editor]);

    // Track subject changes
    useEffect(() => {
        if (template && subject !== template.subject) {
            setHasChanges(true);
        }
    }, [subject, template]);

    // Save handler
    const handleSave = async () => {
        if (!user?.uid || !template) return;

        const success = await updateTemplate({
            subject,
            htmlContent,
            plainTextContent: htmlToPlainText(htmlContent)
        }, user.uid);

        if (success) {
            toast.success("Template saved successfully!");
            setHasChanges(false);
        } else {
            toast.error("Failed to save template");
        }
    };

    // Toggle handler
    const handleToggle = async () => {
        if (!user?.uid) return;
        const success = await toggleEnabled(user.uid);
        if (success) {
            toast.success(template?.enabled ? "Template disabled" : "Template enabled");
        }
    };

    // Reset handler
    const handleReset = async () => {
        if (!user?.uid) return;
        const success = await resetToDefault(user.uid);
        if (success) {
            toast.success("Template reset to default");
            setShowResetDialog(false);
            // Refresh editor content
            if (editor && template) {
                editor.commands.setContent(template.defaultHtmlContent);
                setSubject(template.defaultSubject);
                setHtmlContent(template.defaultHtmlContent);
                setHasChanges(false);
            }
        }
    };

    // Restore version handler
    const handleRestoreVersion = async (version: typeof versions[0]) => {
        if (!user?.uid) return;
        const success = await restoreVersion(version, user.uid);
        if (success) {
            toast.success(`Restored version ${version.version}`);
            setShowVersions(false);
            // Refresh editor content
            if (editor) {
                editor.commands.setContent(version.htmlContent);
                setSubject(version.subject);
                setHtmlContent(version.htmlContent);
                setHasChanges(false);
            }
        }
    };

    // Insert variable
    const insertVariable = (key: string) => {
        if (editor) {
            editor.chain().focus().insertContent(`{{${key}}}`).run();
        }
    };

    // Send test email
    const handleSendTest = async () => {
        if (!testEmail) {
            toast.error("Please enter an email address");
            return;
        }

        setSendingTest(true);
        try {
            const response = await fetch("/api/admin/test-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: testEmail,
                    subject: replaceVariables(subject, getSampleVariables()),
                    html: replaceVariables(htmlContent, getSampleVariables())
                })
            });

            if (response.ok) {
                toast.success(`Test email sent to ${testEmail}`);
                setShowTestDialog(false);
            } else {
                toast.error("Failed to send test email");
            }
        } catch (err) {
            toast.error("Failed to send test email");
        } finally {
            setSendingTest(false);
        }
    };

    // Sample variables for preview
    const getSampleVariables = () => {
        const samples: Record<string, string> = {
            userName: "John Doe",
            firstName: "John",
            adminName: "Admin User",
            orgName: "Acme Corp",
            platformName: "Dosory",
            resetLink: "https://example.com/reset",
            verifyLink: "https://example.com/verify",
            loginUrl: "https://example.com/login",
            portalUrl: "https://example.com/portal",
            inviteLink: "https://example.com/invite",
            viewLink: "https://example.com/view",
            payLink: "https://example.com/pay",
            expiryTime: "24 hours",
            amount: "$99.00",
            invoiceNumber: "INV-001",
            ticketId: "TICK-001",
            projectName: "Project Alpha",
            taskName: "Complete Documentation",
            dueDate: "January 15, 2025",
            logoUrl: "https://via.placeholder.com/150x50",
            footerText: "© 2024 Dosory. All rights reserved."
        };
        return samples;
    };

    // Preview with sample data
    const getPreviewContent = () => {
        return replaceVariables(htmlContent, getSampleVariables());
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error || !template) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-600 mb-4">{error || "Template not found"}</p>
                <Link href="/bunny/email-templates">
                    <Button>Back to Templates</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/bunny/email-templates">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{template.name}</h1>
                        <p className="text-sm text-gray-500">{template.description}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {hasChanges && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Unsaved changes
                        </Badge>
                    )}

                    <div className="flex items-center gap-2">
                        <Label htmlFor="enabled" className="text-sm">Enabled</Label>
                        <Switch
                            id="enabled"
                            checked={template.enabled}
                            onCheckedChange={handleToggle}
                        />
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => setShowTestDialog(true)}
                        className="gap-2"
                    >
                        <Send className="h-4 w-4" />
                        Test
                    </Button>

                    <Button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="gap-2"
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        Save
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Editor Panel */}
                <div className="space-y-4">
                    {/* Subject */}
                    <div className="space-y-2">
                        <Label>Email Subject</Label>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter email subject..."
                        />
                    </div>

                    {/* Variable Insertion */}
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    Insert Variable
                                    <ChevronDown className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="max-h-64 overflow-y-auto">
                                {template.variables.map((variable) => (
                                    <DropdownMenuItem
                                        key={variable.key}
                                        onClick={() => insertVariable(variable.key)}
                                    >
                                        <div>
                                            <div className="font-mono text-sm">{"{{" + variable.key + "}}"}</div>
                                            <div className="text-xs text-gray-500">{variable.description}</div>
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowVersions(true)}
                            className="gap-2"
                        >
                            <History className="h-4 w-4" />
                            History
                        </Button>

                        {!template.isDefault && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowResetDialog(true)}
                                className="gap-2 text-orange-600 hover:text-orange-700"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Reset
                            </Button>
                        )}
                    </div>

                    {/* Editor */}
                    <div className="border rounded-lg overflow-hidden">
                        <EditorToolbar editor={editor} />
                        <EditorContent
                            editor={editor}
                            className="prose prose-sm max-w-none p-4 min-h-[400px] focus:outline-none [&_.ProseMirror]:min-h-[380px] [&_.ProseMirror]:outline-none"
                        />
                    </div>

                    {/* Available Variables */}
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Available Variables:</p>
                        <div className="flex flex-wrap gap-1">
                            {template.variables.map((v) => (
                                <Badge
                                    key={v.key}
                                    variant="secondary"
                                    className="cursor-pointer hover:bg-gray-200 font-mono text-xs"
                                    onClick={() => insertVariable(v.key)}
                                >
                                    {"{{" + v.key + "}}"}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Live Preview
                        </Label>
                        <Badge variant="outline" className="text-xs">
                            Sample Data
                        </Badge>
                    </div>

                    <div className="border rounded-lg bg-white overflow-hidden">
                        {/* Email Header Preview */}
                        <div className="bg-gray-100 p-3 border-b">
                            <p className="text-xs text-gray-500">Subject:</p>
                            <p className="font-medium text-sm">
                                {replaceVariables(subject, getSampleVariables())}
                            </p>
                        </div>

                        {/* Email Body Preview */}
                        <div
                            className="p-4 min-h-[400px] overflow-auto"
                            dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
                        />
                    </div>
                </div>
            </div>

            {/* Version History Dialog */}
            <Dialog open={showVersions} onOpenChange={setShowVersions}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Version History</DialogTitle>
                        <DialogDescription>
                            Previous versions of this template
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-80 overflow-y-auto space-y-2">
                        {versions.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">No previous versions</p>
                        ) : (
                            versions.map((version) => (
                                <div
                                    key={version.id}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                                >
                                    <div>
                                        <p className="font-medium">Version {version.version}</p>
                                        <p className="text-xs text-gray-500">
                                            {version.createdAt && formatDistanceToNow(version.createdAt.toDate(), { addSuffix: true })}
                                        </p>
                                        {version.changeNote && (
                                            <p className="text-xs text-gray-400">{version.changeNote}</p>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRestoreVersion(version)}
                                    >
                                        Restore
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Reset Confirmation Dialog */}
            <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset to Default?</DialogTitle>
                        <DialogDescription>
                            This will restore the template to its original content. Your current version will be saved in the history.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowResetDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleReset} className="bg-orange-600 hover:bg-orange-700">
                            Reset to Default
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Test Email Dialog */}
            <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send Test Email</DialogTitle>
                        <DialogDescription>
                            Send a test email with sample data to preview how it looks.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input
                                type="email"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                                placeholder="Enter email address..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSendTest} disabled={sendingTest}>
                            {sendingTest ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Send className="h-4 w-4 mr-2" />
                            )}
                            Send Test
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

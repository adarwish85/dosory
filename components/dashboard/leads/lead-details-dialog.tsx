"use client";

import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    User,
    FileText,
    CheckSquare,
    Paperclip,
    Bell,
    StickyNote,
    Activity,
    Printer,
    Pencil,
    Plus,
    Loader2,
    Trash2,
    Calendar,
    Clock,
    Upload,
    Phone,
    Mail,
    CalendarPlus,
    Zap,
    CheckCircle,
    XCircle,
    TrendingUp,
    ArrowRight,
    AlertTriangle,
    ExternalLink,
    Calculator,
    Briefcase,
    Calendar as CalendarIcon,
    DollarSign,
    Download,
} from "lucide-react";
import { toast } from "sonner";
import { formatBytes } from "@/lib/utils";
import type { Lead, FileDoc } from "@/lib/types";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEstimates } from "@/lib/hooks/use-sales";
import { useTasks } from "@/lib/hooks/use-projects";
import { useLeads } from "@/lib/hooks/use-leads";
import { useStaff } from "@/lib/hooks/use-staff";
import { useActivities } from "@/lib/hooks/use-activities";
import { useFiles } from "@/lib/hooks/use-files";
import { usePermission } from "@/lib/hooks";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { ConvertLeadWizard } from "./ConvertLeadWizard";
import { DatePicker } from "@/components/ui/date-picker";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    query,
    where,
    onSnapshot,
    Timestamp,
} from "firebase/firestore";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { EditDealDialog } from "./edit-deal-dialog";
import { CreateEstimateDialog } from "@/components/dashboard/sales/create-estimate-dialog";
import { ActivitiesTable } from "@/components/dashboard/activities/activities-table";
import { useTranslation } from "@/lib/i18n";

interface LeadDetailsSheetProps {
    open: boolean;
    onClose: () => void;
    lead: Lead | null;
    onEdit: (lead: Lead) => void;
}

interface LeadNote {
    id: string;
    content: string;
    createdAt: Timestamp;
    createdBy: string;
}

interface LeadReminder {
    id: string;
    description: string;
    date: Timestamp;
    notifyBefore: string;
    createdAt: Timestamp;
}

// Status Pipeline for Conversion Meter
const STATUS_PIPELINE = [
    { key: "new", labelKey: "leads.pipeline.new", color: "bg-gray-400" },
    { key: "contacted", labelKey: "leads.pipeline.contacted", color: "bg-blue-400" },
    { key: "qualified", labelKey: "leads.pipeline.qualified", color: "bg-purple-500" },
    { key: "offer-sent", labelKey: "leads.pipeline.offerSent", color: "bg-yellow-500" },
    { key: "negotiation", labelKey: "leads.pipeline.negotiation", color: "bg-orange-500" },
    { key: "won", labelKey: "leads.pipeline.won", color: "bg-green-500" },
] as const;

// Shared scoring logic
import { calculateLeadScoreWithBreakdown, COMPLETENESS_FIELDS } from "@/lib/utils/lead-score";
import { estimateFormSchema } from "@/lib/schemas";
import * as z from "zod";

export function LeadDetailsSheet({ open, onClose, lead, onEdit }: LeadDetailsSheetProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("overview");
    const [showConvertWizard, setShowConvertWizard] = useState(false);
    const [estimateInitialData, setEstimateInitialData] = useState<Partial<z.infer<typeof estimateFormSchema>>>();
    const [showCreateEstimate, setShowCreateEstimate] = useState(false);

    // Notes state
    const [noteText, setNoteText] = useState("");
    const [notes, setNotes] = useState<LeadNote[]>([]);
    const [savingNote, setSavingNote] = useState(false);

    // Reminders state
    const [reminders, setReminders] = useState<LeadReminder[]>([]);
    const [showReminderDialog, setShowReminderDialog] = useState(false);
    const [reminderDesc, setReminderDesc] = useState("");
    const [reminderDate, setReminderDate] = useState<Date | undefined>();
    const [reminderNotify, setReminderNotify] = useState("30");
    const [savingReminder, setSavingReminder] = useState(false);

    // Task state
    const [showTaskDialog, setShowTaskDialog] = useState(false);
    const [taskName, setTaskName] = useState("");
    const [taskDueDate, setTaskDueDate] = useState<Date | undefined>();
    const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
    const [savingTask, setSavingTask] = useState(false);

    // Error state for user feedback
    const [error, setError] = useState<string | null>(null);

    // Hooks
    const { profile } = useUserProfile();
    const { can } = usePermission();
    const { estimates } = useEstimates({ leadId: lead?.id });
    const { tasks } = useTasks();
    const { convertToCustomer } = useLeads();
    const { staff } = useStaff();
    const { activities } = useActivities({ relatedToType: "lead", relatedToId: lead?.id });
    const {
        files,
        uploadFile,
        uploading: uploadingFile,
        deleteFile,
    } = useFiles({ relatedTo: lead?.id ? { type: "lead", id: lead.id } : undefined });

    // Filter tasks related to this lead
    const relatedTasks = tasks.filter((t) => t.relatedTo?.type === "lead" && t.relatedTo?.id === lead?.id);

    // Fetch notes for this lead
    useEffect(() => {
        if (!lead?.id || !profile?.orgId) return;

        // Query without orderBy to avoid index requirement
        const notesQuery = query(
            collection(db, "leadNotes"),
            where("leadId", "==", lead.id),
            where("orgId", "==", profile.orgId)
        );

        const unsubscribe = onSnapshot(notesQuery, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as LeadNote[];
            // Sort client-side by createdAt descending
            data.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime; // descending
            });
            setNotes(data);
        });

        return () => unsubscribe();
    }, [lead?.id, profile?.orgId]);

    // Fetch reminders for this lead
    useEffect(() => {
        if (!lead?.id || !profile?.orgId) return;

        // Query without orderBy to avoid index requirement
        const remindersQuery = query(
            collection(db, "leadReminders"),
            where("leadId", "==", lead.id),
            where("orgId", "==", profile.orgId)
        );

        const unsubscribe = onSnapshot(remindersQuery, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as LeadReminder[];
            // Sort client-side by date ascending
            data.sort((a, b) => {
                const aTime = a.date?.toMillis?.() || 0;
                const bTime = b.date?.toMillis?.() || 0;
                return aTime - bTime; // ascending
            });
            setReminders(data);
        });

        return () => unsubscribe();
    }, [lead?.id, profile?.orgId]);

    // Save note handler
    const handleSaveNote = async () => {
        if (!noteText.trim() || !lead?.id || !profile?.orgId) {
            setError(t("leads.details.noteMissingData"));
            return;
        }

        setError(null);
        setSavingNote(true);
        try {
            await addDoc(collection(db, "leadNotes"), {
                leadId: lead.id,
                orgId: profile.orgId,
                content: noteText.trim(),
                createdAt: serverTimestamp(),
                createdBy: profile.uid,
            });
            setNoteText("");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Failed to save note:", error);
            setError(t("leads.details.noteSaveError", { error: error.message || t("common.unknownError") }));
        } finally {
            setSavingNote(false);
        }
    };

    // Delete note handler
    const handleDeleteNote = async (noteId: string) => {
        try {
            await deleteDoc(doc(db, "leadNotes", noteId));
        } catch (error) {
            console.error("Failed to delete note:", error);
        }
    };

    // Save reminder handler
    const handleSaveReminder = async () => {
        if (!reminderDesc.trim() || !reminderDate || !lead?.id || !profile?.orgId) {
            setError(t("leads.details.fillRequiredFields"));
            return;
        }

        setError(null);
        setSavingReminder(true);
        try {
            await addDoc(collection(db, "leadReminders"), {
                leadId: lead.id,
                orgId: profile.orgId,
                description: reminderDesc.trim(),
                date: Timestamp.fromDate(reminderDate),
                notifyBefore: reminderNotify,
                createdAt: serverTimestamp(),
                createdBy: profile.uid,
                status: "pending",
            });
            setReminderDesc("");
            setReminderDate(undefined);
            setShowReminderDialog(false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Failed to save reminder:", error);
            setError(t("leads.details.reminderSaveError", { error: error.message || t("common.unknownError") }));
        } finally {
            setSavingReminder(false);
        }
    };

    // Delete reminder handler
    const handleDeleteReminder = async (reminderId: string) => {
        try {
            await deleteDoc(doc(db, "leadReminders", reminderId));
        } catch (error) {
            console.error("Failed to delete reminder:", error);
        }
    };

    // Save task handler
    const handleSaveTask = async () => {
        if (!taskName.trim() || !lead?.id || !profile?.orgId) return;

        setSavingTask(true);
        try {
            await addDoc(collection(db, "tasks"), {
                name: taskName.trim(),
                description: "",
                status: "to_do",
                priority: taskPriority,
                dueDate: taskDueDate ? Timestamp.fromDate(taskDueDate) : null,
                startDate: null,
                assignees: [],
                followers: [],
                tags: [],
                isPublic: false,
                billable: false,
                relatedTo: { type: "lead", id: lead.id, name: lead.name },
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });
            setTaskName("");
            setTaskDueDate(undefined);
            setTaskPriority("medium");
            setShowTaskDialog(false);
        } catch (error) {
            console.error("Failed to create task:", error);
        } finally {
            setSavingTask(false);
        }
    };

    // File upload handler
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        // Upload each file
        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            try {
                await uploadFile(file);
                toast.success(t("leads.details.fileUploaded", { name: file.name }));
            } catch (error) {
                console.error("File upload error:", error);
                const msg = error instanceof Error ? error.message : t("leads.details.detailsUnavailable");
                toast.error(t("leads.details.fileUploadError", { name: file.name, error: msg }));
            }
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleDeleteFile = async (file: FileDoc) => {
        if (confirm(t("leads.details.confirmDeleteFile", { name: file.name }))) {
            try {
                await deleteFile(file);
                toast.success(t("leads.details.fileDeleted"));
            } catch (error) {
                console.error(error);
                toast.error(t("leads.details.fileDeleteError"));
            }
        }
    };

    if (!lead) return null;

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-[90%] sm:max-w-[800px] p-0 flex flex-col gap-0 bg-white">
                <SheetHeader className="px-6 py-4 border-b flex flex-col space-y-4 sticky top-0 bg-white z-10 shrink-0">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col items-start gap-1">
                            <SheetTitle className="text-xl font-bold flex items-center gap-2">
                                #{lead.id.substring(0, 4)} - {lead.name}
                            </SheetTitle>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span className="capitalize">{lead.status}</span>
                                <span>•</span>
                                <span>{lead.company || t("leads.details.noCompany")}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2 text-gray-600">
                            <Printer className="h-4 w-4" /> {t("leads.details.print")}
                        </Button>
                        {can("leads-edit") && (
                            <Button variant="ghost" size="icon" onClick={() => onEdit(lead)} className="text-gray-600">
                                <Pencil className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                        <div className="px-6 py-2 border-b bg-gray-50/50 shrink-0">
                            <TabsList className="bg-transparent p-0 h-auto gap-4 justify-start w-full overflow-x-auto no-scrollbar">
                                <TabsTrigger
                                    value="overview"
                                    className="gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent text-gray-500 border-b-2 border-transparent transition-none"
                                >
                                    <TrendingUp className="h-4 w-4" /> {t("leads.details.tabOverview")}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="profile"
                                    className="gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent text-gray-500 border-b-2 border-transparent transition-none"
                                >
                                    <User className="h-4 w-4" /> {t("leads.details.tabProfile")}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="activities"
                                    className="gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent text-gray-500 border-b-2 border-transparent transition-none"
                                >
                                    <Phone className="h-4 w-4" /> {t("leads.details.tabActivities")}
                                    <Badge
                                        variant="secondary"
                                        className="ml-1 px-1 py-0 h-5 min-w-5 rounded-full text-[10px]"
                                    >
                                        {activities.length}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="deal"
                                    className="gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent text-gray-500 border-b-2 border-transparent transition-none"
                                >
                                    <DollarSign className="h-4 w-4" /> {t("leads.details.tabDeal")}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="estimates"
                                    className="gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent text-gray-500 border-b-2 border-transparent transition-none"
                                >
                                    <Calculator className="h-4 w-4" /> {t("leads.details.tabEstimates")}
                                    <Badge
                                        variant="secondary"
                                        className="ml-1 px-1 py-0 h-5 min-w-5 rounded-full text-[10px]"
                                    >
                                        {estimates.length}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="tasks"
                                    className="gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent text-gray-500 border-b-2 border-transparent transition-none"
                                >
                                    <CheckSquare className="h-4 w-4" /> {t("leads.details.tabTasks")}
                                    <Badge
                                        variant="secondary"
                                        className="ml-1 px-1 py-0 h-5 min-w-5 rounded-full text-[10px]"
                                    >
                                        {relatedTasks.length}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="reminders"
                                    className="gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent text-gray-500 border-b-2 border-transparent transition-none"
                                >
                                    <Bell className="h-4 w-4" /> {t("leads.details.tabReminders")}
                                    <Badge
                                        variant="secondary"
                                        className="ml-1 px-1 py-0 h-5 min-w-5 rounded-full text-[10px]"
                                    >
                                        {reminders.length}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="attachments"
                                    className="gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent text-gray-500 border-b-2 border-transparent transition-none"
                                >
                                    <Paperclip className="h-4 w-4" /> {t("leads.details.tabFiles")}
                                    <Badge
                                        variant="secondary"
                                        className="ml-1 px-1 py-0 h-5 min-w-5 rounded-full text-[10px]"
                                    >
                                        {files.length}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="notes"
                                    className="gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent text-gray-500 border-b-2 border-transparent transition-none"
                                >
                                    <StickyNote className="h-4 w-4" /> {t("leads.details.tabNotes")}
                                    <Badge
                                        variant="secondary"
                                        className="ml-1 px-1 py-0 h-5 min-w-5 rounded-full text-[10px]"
                                    >
                                        {notes.length}
                                    </Badge>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <ScrollArea className="flex-1 bg-gray-50/30">
                            <div className="p-6">
                                {/* Overview Tab */}
                                <TabsContent value="overview" className="m-0 space-y-3">
                                    {/* Top Row: Lead Score + Quick Actions */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                        {/* Lead Score Card */}
                                        {(() => {
                                            const { score, breakdown } = calculateLeadScoreWithBreakdown(lead);
                                            const scoreColor =
                                                score >= 70
                                                    ? "text-green-600"
                                                    : score >= 40
                                                      ? "text-yellow-600"
                                                      : "text-red-500";
                                            const bgColor =
                                                score >= 70
                                                    ? "from-green-50 to-green-100 border-green-200"
                                                    : score >= 40
                                                      ? "from-yellow-50 to-yellow-100 border-yellow-200"
                                                      : "from-red-50 to-red-100 border-red-200";
                                            return (
                                                <div
                                                    className={`p-3 bg-gradient-to-br ${bgColor} border rounded-lg shadow-sm lg:col-span-1`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Zap className={`h-5 w-5 ${scoreColor}`} />
                                                            <h3 className="font-semibold text-gray-900">{t("leads.details.leadScore")}</h3>
                                                        </div>
                                                        <span className={`text-3xl font-bold ${scoreColor}`}>
                                                            {score}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                                                        <div
                                                            className={`h-1.5 rounded-full ${score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-400"}`}
                                                            style={{ width: `${score}%` }}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        {breakdown.slice(0, 5).map((item, i) => (
                                                            <div
                                                                key={i}
                                                                className="flex items-center justify-between text-xs"
                                                            >
                                                                <span className="flex items-center gap-1">
                                                                    {item.earned ? (
                                                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                                                    ) : (
                                                                        <XCircle className="h-3 w-3 text-gray-300" />
                                                                    )}
                                                                    <span
                                                                        className={
                                                                            item.earned
                                                                                ? "text-gray-700"
                                                                                : "text-gray-400"
                                                                        }
                                                                    >
                                                                        {item.label}
                                                                    </span>
                                                                </span>
                                                                <span
                                                                    className={
                                                                        item.earned
                                                                            ? "text-green-600 font-medium"
                                                                            : "text-gray-400"
                                                                    }
                                                                >
                                                                    +{item.points}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Quick Actions */}
                                        <div className="p-3 bg-white border rounded-lg shadow-sm lg:col-span-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <TrendingUp className="h-5 w-5 text-blue-600" />
                                                <h3 className="font-semibold text-gray-900">{t("leads.details.quickActions")}</h3>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {lead.phone && (
                                                    <a
                                                        href={`tel:${lead.phone}`}
                                                        className="flex flex-col items-center gap-1 p-3 rounded-lg bg-green-50 hover:bg-green-100 border border-green-200 transition-colors"
                                                    >
                                                        <Phone className="h-5 w-5 text-green-600" />
                                                        <span className="text-xs font-medium text-green-700">{t("leads.details.call")}</span>
                                                    </a>
                                                )}
                                                {lead.email && (
                                                    <a
                                                        href={`mailto:${lead.email}`}
                                                        className="flex flex-col items-center gap-1 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                                                    >
                                                        <Mail className="h-5 w-5 text-blue-600" />
                                                        <span className="text-xs font-medium text-blue-700">{t("common.email")}</span>
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => setShowTaskDialog(true)}
                                                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
                                                >
                                                    <CalendarPlus className="h-5 w-5 text-purple-600" />
                                                    <span className="text-xs font-medium text-purple-700">
                                                        {t("leads.details.schedule")}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setActiveTab("notes");
                                                    }}
                                                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors"
                                                >
                                                    <StickyNote className="h-5 w-5 text-orange-600" />
                                                    <span className="text-xs font-medium text-orange-700">
                                                        {t("leads.details.addNote")}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Conversion Pipeline */}
                                    <div className="p-3 bg-white border rounded-lg shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <ArrowRight className="h-5 w-5 text-blue-600" />
                                                <h3 className="font-semibold text-gray-900">{t("leads.details.conversionPipeline")}</h3>
                                            </div>
                                            {can("leads-edit") && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setShowConvertWizard(true)}
                                                >
                                                    <User className="mr-1 h-4 w-4" /> {t("leads.details.convertToCustomer")}
                                                </Button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {STATUS_PIPELINE.map((stage, i) => {
                                                const isActive = lead.status === stage.key;
                                                const isPast =
                                                    STATUS_PIPELINE.findIndex((s) => s.key === lead.status) > i;
                                                return (
                                                    <div
                                                        key={stage.key}
                                                        className="flex-1 flex flex-col items-center min-w-0"
                                                    >
                                                        <div
                                                            className={`w-full h-2 rounded-full ${isPast || isActive ? stage.color : "bg-gray-200"}`}
                                                        />
                                                        <span
                                                            className={`text-[10px] mt-1 w-full text-center truncate px-0.5 ${isActive ? "font-bold text-gray-900" : isPast ? "text-gray-600" : "text-gray-400"}`}
                                                        >
                                                            {t(stage.labelKey)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {lead.status === "new" && (
                                            <p className="mt-3 text-sm text-blue-600 flex items-center gap-1">
                                                <AlertTriangle className="h-4 w-4" /> {t("leads.details.suggestedAction")}{" "}
                                                <strong>{t("leads.details.actionMakeFirstContact")}</strong>
                                            </p>
                                        )}
                                        {lead.status === "contacted" && (
                                            <p className="mt-3 text-sm text-purple-600 flex items-center gap-1">
                                                <AlertTriangle className="h-4 w-4" /> {t("leads.details.suggestedAction")}{" "}
                                                <strong>{t("leads.details.actionQualifyLead")}</strong>
                                            </p>
                                        )}
                                        {lead.status === "qualified" && (
                                            <p className="mt-3 text-sm text-yellow-600 flex items-center gap-1">
                                                <AlertTriangle className="h-4 w-4" /> {t("leads.details.suggestedAction")}{" "}
                                                <strong>{t("leads.details.actionSendEstimate")}</strong>
                                            </p>
                                        )}
                                    </div>

                                    {/* Data Completeness & Related Items */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Data Completeness */}
                                        <div className="p-3 bg-white border rounded-lg shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CheckSquare className="h-4 w-4 text-green-600" />
                                                <h3 className="text-sm font-semibold text-gray-900">
                                                    {t("leads.details.dataCompleteness")}
                                                </h3>
                                            </div>
                                            {(() => {
                                                const complete = COMPLETENESS_FIELDS.filter((f) => {
                                                    if (f.key === "address")
                                                        return lead.address?.street || lead.address?.city;
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    return !!(lead as any)[f.key];
                                                }).length;
                                                const percent = Math.round(
                                                    (complete / COMPLETENESS_FIELDS.length) * 100
                                                );
                                                return (
                                                    <>
                                                        <div className="flex items-center justify-between text-sm mb-2">
                                                            <span className="text-gray-600">
                                                                {t("leads.details.fieldsCount", {
                                                                    complete,
                                                                    total: COMPLETENESS_FIELDS.length,
                                                                })}
                                                            </span>
                                                            <span
                                                                className={
                                                                    percent === 100
                                                                        ? "text-green-600 font-medium"
                                                                        : "text-yellow-600 font-medium"
                                                                }
                                                            >
                                                                {percent}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                                                            <div
                                                                className={`h-2 rounded-full ${percent === 100 ? "bg-green-500" : percent >= 50 ? "bg-yellow-500" : "bg-red-400"}`}
                                                                style={{ width: `${percent}%` }}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            {COMPLETENESS_FIELDS.map((field) => {
                                                                const hasValue =
                                                                    field.key === "address"
                                                                        ? lead.address?.street || lead.address?.city
                                                                        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                          !!(lead as any)[field.key];
                                                                return (
                                                                    <div
                                                                        key={field.key}
                                                                        className="flex items-center justify-between text-xs"
                                                                    >
                                                                        <span className="flex items-center gap-1">
                                                                            {hasValue ? (
                                                                                <CheckCircle className="h-3 w-3 text-green-500" />
                                                                            ) : (
                                                                                <XCircle className="h-3 w-3 text-red-400" />
                                                                            )}
                                                                            <span
                                                                                className={
                                                                                    hasValue
                                                                                        ? "text-gray-700"
                                                                                        : "text-red-500"
                                                                                }
                                                                            >
                                                                                {field.label}
                                                                            </span>
                                                                        </span>
                                                                        {!hasValue && can("leads-edit") && (
                                                                            <button
                                                                                onClick={() => onEdit(lead)}
                                                                                className="text-blue-600 hover:underline text-[10px]"
                                                                                disabled={!can("leads-edit")}
                                                                            >
                                                                                {t("leads.details.add")}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        {/* Related Items Summary */}
                                        <div className="p-4 bg-white border rounded-lg shadow-sm">
                                            <div className="flex items-center gap-2 mb-3">
                                                <FileText className="h-5 w-5 text-purple-600" />
                                                <h3 className="font-semibold text-gray-900">{t("leads.details.relatedItems")}</h3>
                                            </div>
                                            <div className="space-y-3">
                                                <button
                                                    onClick={() => setActiveTab("tasks")}
                                                    className="w-full flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                                                >
                                                    <span className="flex items-center gap-2 text-sm">
                                                        <CheckSquare className="h-4 w-4 text-green-500" /> {t("leads.details.tabTasks")}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <Badge variant="outline" className="text-orange-600">
                                                            {t("leads.details.openCount", {
                                                                count: relatedTasks.filter(
                                                                    (task) => task.status !== "done"
                                                                ).length,
                                                            })}
                                                        </Badge>
                                                        <Badge variant="secondary">
                                                            {t("leads.details.doneCount", {
                                                                count: relatedTasks.filter(
                                                                    (task) => task.status === "done"
                                                                ).length,
                                                            })}
                                                        </Badge>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab("reminders")}
                                                    className="w-full flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                                                >
                                                    <span className="flex items-center gap-2 text-sm">
                                                        <Bell className="h-4 w-4 text-yellow-500" /> {t("leads.details.tabReminders")}
                                                    </span>
                                                    <Badge variant="secondary">{reminders.length}</Badge>
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab("notes")}
                                                    className="w-full flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                                                >
                                                    <span className="flex items-center gap-2 text-sm">
                                                        <StickyNote className="h-4 w-4 text-orange-500" /> {t("leads.details.tabNotes")}
                                                    </span>
                                                    <Badge variant="secondary">{notes.length}</Badge>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Profile Tab */}
                                <TabsContent value="profile" className="m-0 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="p-4 bg-white border rounded-lg shadow-sm">
                                            <div className="flex items-center gap-2 pb-2 border-b mb-3">
                                                <User className="h-4 w-4 text-gray-500" />
                                                <h3 className="text-sm font-semibold text-gray-900">
                                                    {t("leads.details.leadInformation")}
                                                </h3>
                                            </div>
                                            <div className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
                                                <div className="text-gray-500">{t("common.email")}</div>
                                                <div className="font-medium text-blue-600">
                                                    {lead.email ? (
                                                        <a href={`mailto:${lead.email}`}>{lead.email}</a>
                                                    ) : (
                                                        "-"
                                                    )}
                                                </div>
                                                <div className="text-gray-500">{t("common.phone")}</div>
                                                <div className="font-medium">
                                                    {lead.phone ? (
                                                        <a href={`tel:${lead.phone}`} className="text-blue-600">
                                                            {lead.phone}
                                                        </a>
                                                    ) : (
                                                        "-"
                                                    )}
                                                </div>
                                                <div className="text-gray-500">{t("leads.edit.website")}</div>
                                                <div className="font-medium">
                                                    {lead.website ? (
                                                        <a
                                                            href={
                                                                lead.website.startsWith("http")
                                                                    ? lead.website
                                                                    : `https://${lead.website}`
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-blue-600 flex items-center gap-1"
                                                        >
                                                            {lead.website} <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    ) : (
                                                        "-"
                                                    )}
                                                </div>
                                                <div className="text-gray-500">{t("leads.details.value")}</div>
                                                <div className="font-medium">
                                                    {lead.value ? `$${lead.value.toLocaleString()}` : "-"}
                                                </div>
                                                <div className="text-gray-500">{t("leads.details.address")}</div>
                                                <div className="font-medium text-gray-900">
                                                    {[lead.address?.street, lead.address?.city, lead.address?.country]
                                                        .filter(Boolean)
                                                        .join(", ") || "-"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-white border rounded-lg shadow-sm">
                                            <div className="flex items-center gap-2 pb-2 border-b mb-3">
                                                <Activity className="h-4 w-4 text-gray-500" />
                                                <h3 className="text-sm font-semibold text-gray-900">
                                                    {t("leads.details.systemInformation")}
                                                </h3>
                                            </div>
                                            <div className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
                                                <div className="text-gray-500">{t("common.status")}</div>
                                                <div>
                                                    <Badge variant="secondary" className="capitalize">
                                                        {lead.status}
                                                    </Badge>
                                                </div>
                                                <div className="text-gray-500">{t("leads.details.source")}</div>
                                                <div className="font-medium">{lead.source || "-"}</div>
                                                <div className="text-gray-500">{t("leads.details.created")}</div>
                                                <div className="font-medium">
                                                    {lead.createdAt
                                                        ? format(lead.createdAt.toDate(), "MMM d, yyyy")
                                                        : "-"}
                                                </div>
                                                <div className="text-gray-500">{t("leads.details.assignedTo")}</div>
                                                <div className="flex items-center gap-2">
                                                    {lead.assignedTo ? (
                                                        <>
                                                            <Avatar className="h-5 w-5">
                                                                <AvatarFallback className="text-[10px]">
                                                                    {staff
                                                                        .find((s) => s.id === lead.assignedTo)
                                                                        ?.firstName?.charAt(0) || "?"}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium">
                                                                {staff.find((s) => s.id === lead.assignedTo)
                                                                    ?.firstName || t("leads.details.unknown")}{" "}
                                                                {staff.find((s) => s.id === lead.assignedTo)
                                                                    ?.lastName || ""}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-400">{t("leads.details.notAssigned")}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {lead.description && (
                                        <div className="p-4 bg-white border rounded-lg shadow-sm">
                                            <h3 className="text-sm font-semibold text-gray-900 mb-2">{t("common.description")}</h3>
                                            <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
                                                {lead.description}
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>

                                {/* Deal Tab */}
                                <TabsContent value="deal" className="m-0">
                                    <div className="p-4 bg-white border rounded-lg shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="h-5 w-5 text-indigo-600" />
                                                <h3 className="font-semibold text-gray-900">{t("leads.details.dealDetails")}</h3>
                                            </div>
                                            <EditDealDialog
                                                lead={lead}
                                                trigger={
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    >
                                                        {lead.deal ? t("common.edit") : t("leads.details.addDetails")}
                                                    </Button>
                                                }
                                            />
                                            {lead.deal && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 ml-2"
                                                    onClick={() => {
                                                        setEstimateInitialData({
                                                            items: [
                                                                {
                                                                    id: Math.random().toString(),
                                                                    description: lead.deal?.description || t("leads.details.dealValue"),
                                                                    quantity: 1,
                                                                    rate: lead.deal?.value || 0,
                                                                    amount: lead.deal?.value || 0,
                                                                },
                                                            ],
                                                            notes: t("leads.details.createdFromDeal", {
                                                                description: lead.deal?.description || "",
                                                            }),
                                                        });
                                                        setShowCreateEstimate(true);
                                                    }}
                                                >
                                                    <Plus className="mr-2 h-4 w-4" /> {t("leads.details.createEstimate")}
                                                </Button>
                                            )}
                                        </div>
                                        {lead.deal ? (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-2 bg-gray-50 rounded border">
                                                        <div className="text-xs text-gray-500">{t("leads.details.value")}</div>
                                                        <div className="font-medium flex items-center">
                                                            <DollarSign className="h-3 w-3 mr-1 text-green-600" />
                                                            {lead.deal.value?.toLocaleString() || "0"}
                                                        </div>
                                                    </div>
                                                    <div className="p-2 bg-gray-50 rounded border">
                                                        <div className="text-xs text-gray-500">{t("leads.details.closeDate")}</div>
                                                        <div className="font-medium flex items-center">
                                                            <CalendarIcon className="h-3 w-3 mr-1 text-gray-400" />
                                                            {lead.deal.expectedCloseDate
                                                                ? format(
                                                                      lead.deal.expectedCloseDate instanceof Timestamp
                                                                          ? lead.deal.expectedCloseDate.toDate()
                                                                          : lead.deal.expectedCloseDate,
                                                                      "MMM d, yyyy"
                                                                  )
                                                                : "-"}
                                                        </div>
                                                    </div>
                                                </div>
                                                {lead.deal.description && (
                                                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border line-clamp-2">
                                                        {lead.deal.description}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 bg-gray-50 rounded border border-dashed">
                                                <p className="text-xs text-gray-500">{t("leads.details.noDealDetails")}</p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                                <TabsContent value="estimates" className="m-0">
                                    <div className="flex justify-end mb-4">
                                        <Button onClick={() => setShowCreateEstimate(true)} size="sm">
                                            <Plus className="mr-2 h-4 w-4" /> Create Estimate
                                        </Button>
                                    </div>

                                    {/* Estimate List */}
                                    <div className="space-y-2">
                                        {estimates.length === 0 ? (
                                            <div className="text-center py-8 bg-white border rounded-lg border-dashed">
                                                <Calculator className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                                <p className="text-sm text-gray-500">{t("leads.details.noEstimatesFound")}</p>
                                            </div>
                                        ) : (
                                            estimates.map((est) => (
                                                <div
                                                    key={est.id}
                                                    className="p-3 bg-white border rounded-lg shadow-sm flex justify-between items-center group hover:border-blue-200 transition-colors"
                                                >
                                                    <div>
                                                        <div className="font-medium text-sm">{est.number}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {format(
                                                                est.date instanceof Timestamp
                                                                    ? est.date.toDate()
                                                                    : est.date,
                                                                "MMM d, yyyy"
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-medium text-sm">
                                                            {new Intl.NumberFormat("en-US", {
                                                                style: "currency",
                                                                currency: est.currency,
                                                            }).format(est.total)}
                                                        </div>
                                                        <Badge variant="outline" className="text-xs h-5 capitalize">
                                                            {est.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </TabsContent>

                                {/* Tasks Tab */}
                                <TabsContent value="tasks" className="m-0">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold">{t("leads.details.relatedTasks")}</h3>
                                        <Button size="sm" onClick={() => setShowTaskDialog(true)}>
                                            <Plus className="h-4 w-4 mr-1" /> {t("leads.details.newTask")}
                                        </Button>
                                    </div>
                                    {relatedTasks.length === 0 ? (
                                        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50">
                                            <CheckSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500 font-medium">{t("leads.details.noTasksFound")}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {relatedTasks.map((task) => (
                                                <div
                                                    key={task.id}
                                                    className="p-3 border rounded-md bg-white flex items-start gap-3"
                                                >
                                                    <div
                                                        className={`mt-0.5 w-4 h-4 rounded-full border-2 ${task.status === "done" ? "bg-green-500 border-green-500" : "border-gray-300"}`}
                                                    />
                                                    <div className="flex-1">
                                                        <h4
                                                            className={`text-sm font-medium ${task.status === "done" ? "line-through text-gray-500" : "text-gray-900"}`}
                                                        >
                                                            {task.name}
                                                        </h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="secondary" className="text-[10px] h-5 px-1">
                                                                {task.priority}
                                                            </Badge>
                                                            {task.dueDate && (
                                                                <span className="text-xs text-red-500">
                                                                    {t("leads.details.due", {
                                                                        date: format(task.dueDate.toDate(), "MMM d"),
                                                                    })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                {/* Notes Tab */}
                                <TabsContent value="notes" className="m-0">
                                    <div className="space-y-4">
                                        {error && (
                                            <Alert variant="destructive" className="mb-4">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>{error}</AlertDescription>
                                            </Alert>
                                        )}
                                        <div className="bg-yellow-50 p-4 rounded-md border border-yellow-100">
                                            <Textarea
                                                placeholder={t("leads.details.typeNote")}
                                                className="bg-transparent border-none resize-none focus-visible:ring-0 p-0 text-sm min-h-[80px]"
                                                value={noteText}
                                                onChange={(e) => setNoteText(e.target.value)}
                                            />
                                            <div className="flex justify-end mt-2 pt-2 border-t border-yellow-200/50">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 hover:bg-yellow-100 text-yellow-800"
                                                    onClick={handleSaveNote}
                                                    disabled={savingNote || !noteText.trim()}
                                                >
                                                    {savingNote ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        t("leads.details.saveNote")
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        {notes.length === 0 ? (
                                            <p className="text-center text-gray-400 text-sm py-4">{t("leads.details.noPastNotes")}</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {notes.map((note) => (
                                                    <div key={note.id} className="p-4 bg-white rounded-md border group">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-xs text-gray-400">
                                                                {note.createdAt
                                                                    ? format(
                                                                          note.createdAt.toDate(),
                                                                          "MMM d, yyyy @ h:mm a"
                                                                      )
                                                                    : t("leads.details.justNow")}
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                                                                onClick={() => handleDeleteNote(note.id)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                            {note.content}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>

                                {/* Attachments Tab */}
                                <TabsContent value="attachments" className="m-0 text-center py-10">
                                    {files.length === 0 ? (
                                        <div className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center">
                                            <Paperclip className="h-10 w-10 text-gray-300 mb-2" />
                                            <p className="text-sm text-gray-500 mb-4">{t("leads.details.noFilesAttached")}</p>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleFileUpload}
                                                multiple
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploadingFile}
                                            >
                                                {uploadingFile ? (
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Upload className="h-4 w-4 mr-2" />
                                                )}
                                                {t("leads.details.uploadFile")}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex justify-end">
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    onChange={handleFileUpload}
                                                    multiple
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={uploadingFile}
                                                >
                                                    {uploadingFile ? (
                                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                    ) : (
                                                        <Upload className="h-4 w-4 mr-1" />
                                                    )}
                                                    {t("leads.details.upload")}
                                                </Button>
                                            </div>
                                            <div className="space-y-2">
                                                {files.map((file) => (
                                                    <div
                                                        key={file.id}
                                                        className="p-3 bg-white border rounded-lg shadow-sm flex justify-between items-center group hover:border-blue-200 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="h-10 w-10 bg-blue-50 rounded flex items-center justify-center shrink-0">
                                                                <FileText className="h-5 w-5 text-blue-600" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <a
                                                                    href={file.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="font-medium text-sm truncate block hover:text-blue-600 hover:underline"
                                                                >
                                                                    {file.name}
                                                                </a>
                                                                <div className="text-xs text-gray-500">
                                                                    {formatBytes(file.size)} •{" "}
                                                                    {file.createdAt
                                                                        ? format(file.createdAt.toDate(), "MMM d, yyyy")
                                                                        : t("leads.details.unknown")}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <a
                                                                href={file.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-gray-500"
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                </Button>
                                                            </a>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-gray-500 hover:text-red-600"
                                                                onClick={() => handleDeleteFile(file)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>

                                {/* Reminders Tab */}
                                <TabsContent value="reminders" className="m-0">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold">{t("leads.details.tabReminders")}</h3>
                                        <Button size="sm" onClick={() => setShowReminderDialog(true)}>
                                            <Plus className="h-4 w-4 mr-1" /> {t("leads.details.addReminder")}
                                        </Button>
                                    </div>
                                    {reminders.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10">
                                            <Bell className="h-10 w-10 text-gray-300 mb-2" />
                                            <p className="text-sm text-gray-500 mb-4">{t("leads.details.noActiveReminders")}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {reminders.map((reminder) => (
                                                <div
                                                    key={reminder.id}
                                                    className="p-4 bg-white rounded-md border flex items-start justify-between group"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                                            <Bell className="h-4 w-4 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm">
                                                                {reminder.description}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                <Calendar className="h-3 w-3 inline mr-1" />
                                                                {reminder.date
                                                                    ? format(
                                                                          reminder.date.toDate(),
                                                                          "MMM d, yyyy @ h:mm a"
                                                                      )
                                                                    : t("leads.details.noDate")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                                                        onClick={() => handleDeleteReminder(reminder.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                {/* Activity Tab */}
                                <TabsContent value="activity" className="m-0">
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <Activity className="h-5 w-5" /> {t("leads.details.activityTimeline")}
                                        </h3>
                                        <div className="pl-4 border-l-2 border-gray-200 space-y-6">
                                            {/* Lead Created */}
                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white ring-1 ring-gray-200"></div>
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 bg-green-50 rounded-lg">
                                                        <Plus className="h-4 w-4 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {t("leads.details.leadCreated")}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {lead.createdAt
                                                                ? format(
                                                                      lead.createdAt.toDate(),
                                                                      "MMM d, yyyy @ h:mm a"
                                                                  )
                                                                : t("leads.details.unknownDate")}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Notes as timeline items */}
                                            {notes.map((note) => (
                                                <div key={note.id} className="relative">
                                                    <div className="absolute -left-[21px] top-1 h-3 w-3 bg-blue-500 rounded-full border-2 border-white ring-1 ring-gray-200"></div>
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-blue-50 rounded-lg">
                                                            <StickyNote className="h-4 w-4 text-blue-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {t("leads.details.noteAdded")}
                                                            </p>
                                                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                                {note.content}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {note.createdAt
                                                                    ? format(
                                                                          note.createdAt.toDate(),
                                                                          "MMM d, yyyy @ h:mm a"
                                                                      )
                                                                    : ""}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Reminders as timeline items */}
                                            {reminders.map((reminder) => (
                                                <div key={reminder.id} className="relative">
                                                    <div className="absolute -left-[21px] top-1 h-3 w-3 bg-amber-500 rounded-full border-2 border-white ring-1 ring-gray-200"></div>
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-amber-50 rounded-lg">
                                                            <Bell className="h-4 w-4 text-amber-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {t("leads.details.reminderSet")}
                                                            </p>
                                                            <p className="text-sm text-gray-600 mt-1">
                                                                {reminder.description}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {t("leads.details.for")}{" "}
                                                                {reminder.date
                                                                    ? format(
                                                                          reminder.date.toDate(),
                                                                          "MMM d, yyyy @ h:mm a"
                                                                      )
                                                                    : ""}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Tasks as timeline items */}
                                            {relatedTasks.map((task) => (
                                                <div key={task.id} className="relative">
                                                    <div className="absolute -left-[21px] top-1 h-3 w-3 bg-purple-500 rounded-full border-2 border-white ring-1 ring-gray-200"></div>
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-purple-50 rounded-lg">
                                                            <CheckSquare className="h-4 w-4 text-purple-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {t("leads.details.taskCreated", { name: task.name })}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="text-xs capitalize"
                                                                >
                                                                    {task.status.replace(/_/g, " ")}
                                                                </Badge>
                                                                <Badge variant="outline" className="text-xs capitalize">
                                                                    {task.priority}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {task.createdAt
                                                                    ? format(
                                                                          task.createdAt.toDate(),
                                                                          "MMM d, yyyy @ h:mm a"
                                                                      )
                                                                    : ""}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Last Contacted */}
                                            {lead.lastContactedAt && (
                                                <div className="relative">
                                                    <div className="absolute -left-[21px] top-1 h-3 w-3 bg-indigo-500 rounded-full border-2 border-white ring-1 ring-gray-200"></div>
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-indigo-50 rounded-lg">
                                                            <Clock className="h-4 w-4 text-indigo-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {t("leads.details.lastContacted")}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {format(
                                                                    lead.lastContactedAt.toDate(),
                                                                    "MMM d, yyyy @ h:mm a"
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Current Status */}
                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-1 h-3 w-3 bg-gray-400 rounded-full border-2 border-white ring-1 ring-gray-200"></div>
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 bg-gray-50 rounded-lg">
                                                        <Activity className="h-4 w-4 text-gray-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-900">
                                                            {t("leads.details.currentStatus")}{" "}
                                                            <Badge variant="secondary" className="capitalize ml-1">
                                                                {lead.status}
                                                            </Badge>
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {t("leads.details.updated")}{" "}
                                                            {lead.updatedAt
                                                                ? format(
                                                                      lead.updatedAt.toDate(),
                                                                      "MMM d, yyyy @ h:mm a"
                                                                  )
                                                                : t("leads.details.unknown")}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Empty state */}
                                            {notes.length === 0 &&
                                                reminders.length === 0 &&
                                                relatedTasks.length === 0 && (
                                                    <div className="relative">
                                                        <div className="absolute -left-[21px] top-1 h-3 w-3 bg-gray-300 rounded-full border-2 border-white ring-1 ring-gray-200"></div>
                                                        <p className="text-sm text-gray-500 italic">
                                                            {t("leads.details.noActivityYet")}
                                                        </p>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Activities (Logged) Tab */}
                                <TabsContent value="activities" className="m-0">
                                    <ActivitiesTable relatedToType="lead" relatedToId={lead.id} />
                                </TabsContent>
                            </div>
                        </ScrollArea>
                    </Tabs>
                </div>
            </SheetContent>

            {/* Conversion Wizard */}
            <ConvertLeadWizard
                open={showConvertWizard}
                onClose={() => setShowConvertWizard(false)}
                lead={lead}
                onConvert={convertToCustomer}
            />

            {/* New Task Dialog */}
            <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("leads.details.newTaskFor", { name: lead.name })}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("leads.details.taskNameLabel")}</Label>
                            <Input
                                placeholder={t("leads.details.taskNamePlaceholder")}
                                value={taskName}
                                onChange={(e) => setTaskName(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("leads.details.dueDate")}</Label>
                                <DatePicker date={taskDueDate} setDate={setTaskDueDate} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("leads.details.priority")}</Label>
                                <Select
                                    value={taskPriority}
                                    onValueChange={(v) => setTaskPriority(v as "low" | "medium" | "high" | "urgent")}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">{t("leads.details.priorityLow")}</SelectItem>
                                        <SelectItem value="medium">{t("leads.details.priorityMedium")}</SelectItem>
                                        <SelectItem value="high">{t("leads.details.priorityHigh")}</SelectItem>
                                        <SelectItem value="urgent">{t("leads.details.priorityUrgent")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleSaveTask} disabled={savingTask || !taskName.trim()}>
                            {savingTask ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {t("leads.details.createTask")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* New Reminder Dialog */}
            <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("leads.details.addReminder")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("leads.details.descriptionLabel")}</Label>
                            <Textarea
                                placeholder={t("leads.details.reminderPlaceholder")}
                                value={reminderDesc}
                                onChange={(e) => setReminderDesc(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("leads.details.dateTimeLabel")}</Label>
                                <DateTimePicker date={reminderDate} setDate={setReminderDate} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("leads.details.notifyBefore")}</Label>
                                <Select value={reminderNotify} onValueChange={setReminderNotify}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">{t("leads.details.atTime")}</SelectItem>
                                        <SelectItem value="15">{t("leads.details.minutes15")}</SelectItem>
                                        <SelectItem value="30">{t("leads.details.minutes30")}</SelectItem>
                                        <SelectItem value="60">{t("leads.details.hour1")}</SelectItem>
                                        <SelectItem value="1440">{t("leads.details.day1")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReminderDialog(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            onClick={handleSaveReminder}
                            disabled={savingReminder || !reminderDesc.trim() || !reminderDate}
                        >
                            {savingReminder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {t("leads.details.setReminder")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Create Estimate Dialog */}
            <CreateEstimateDialog
                open={showCreateEstimate}
                onOpenChange={(open) => {
                    setShowCreateEstimate(open);
                    if (!open) setEstimateInitialData(undefined);
                }}
                leadId={lead.id}
                initialData={estimateInitialData}
            />
        </Sheet>
    );
}

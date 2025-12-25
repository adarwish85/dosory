"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, FileText, CheckSquare, Paperclip, Bell, StickyNote, Activity, Printer, X, Pencil, MoreHorizontal, Plus } from "lucide-react";
import type { Lead } from "@/lib/types";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProposals } from "@/lib/hooks/use-sales";
import { useTasks } from "@/lib/hooks/use-projects";
import { useLeads } from "@/lib/hooks/use-leads";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { ConvertLeadWizard } from "./ConvertLeadWizard";

interface LeadDetailsSheetProps {
    open: boolean;
    onClose: () => void;
    lead: Lead | null;
    onEdit: (lead: Lead) => void;
}

export function LeadDetailsSheet({ open, onClose, lead, onEdit }: LeadDetailsSheetProps) {
    const [activeTab, setActiveTab] = useState("profile");
    const [showConvertWizard, setShowConvertWizard] = useState(false);

    // Hooks for fetching related data and conversion
    const { proposals } = useProposals({ leadId: lead?.id });
    const { tasks } = useTasks(); // Fetch all tasks, filter client-side for relatedTo
    const { convertToCustomer } = useLeads();

    // Filter tasks related to this lead
    const relatedTasks = tasks.filter(t => t.relatedTo?.type === "lead" && t.relatedTo?.id === lead?.id);

    if (!lead) return null;

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-[90%] sm:max-w-[800px] p-0 flex flex-col gap-0 bg-white">
                <SheetHeader className="px-6 py-4 border-b flex flex-row items-center justify-between sticky top-0 bg-white z-10 shrink-0">
                    <div className="flex flex-col items-start gap-1">
                        <SheetTitle className="text-xl font-bold flex items-center gap-2">
                            #{lead.id.substring(0, 4)} - {lead.name}
                        </SheetTitle>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="capitalize">{lead.status}</span>
                            <span>•</span>
                            <span>{lead.company || "No Company"}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2 text-gray-600">
                            <Printer className="h-4 w-4" /> Print
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(lead)} className="text-gray-600">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                        <div className="px-6 py-2 border-b bg-gray-50/50 shrink-0">
                            <TabsList className="bg-transparent p-0 h-auto gap-4 justify-start w-full overflow-x-auto no-scrollbar">
                                <TabsTrigger
                                    value="profile"
                                    className="gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent text-gray-500 border-b-2 border-transparent transition-none"
                                >
                                    <User className="h-4 w-4" /> Profile
                                </TabsTrigger>
                                <TabsTrigger
                                    value="proposals"
                                    className="gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent text-gray-500 border-b-2 border-transparent transition-none"
                                >
                                    <FileText className="h-4 w-4" /> Proposals
                                    <Badge variant="secondary" className="ml-1 px-1 py-0 h-5 min-w-5 rounded-full text-[10px]">{proposals.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="tasks"
                                    className="gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent text-gray-500 border-b-2 border-transparent transition-none"
                                >
                                    <CheckSquare className="h-4 w-4" /> Tasks
                                    <Badge variant="secondary" className="ml-1 px-1 py-0 h-5 min-w-5 rounded-full text-[10px]">{relatedTasks.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="attachments" className="gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent text-gray-500 border-b-2 border-transparent transition-none">
                                    <Paperclip className="h-4 w-4" /> Attachments
                                </TabsTrigger>
                                <TabsTrigger value="reminders" className="gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent text-gray-500 border-b-2 border-transparent transition-none">
                                    <Bell className="h-4 w-4" /> Reminders
                                </TabsTrigger>
                                <TabsTrigger value="notes" className="gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent text-gray-500 border-b-2 border-transparent transition-none">
                                    <StickyNote className="h-4 w-4" /> Notes
                                </TabsTrigger>
                                <TabsTrigger value="activity" className="gap-2 px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent text-gray-500 border-b-2 border-transparent transition-none">
                                    <Activity className="h-4 w-4" /> Activity
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <ScrollArea className="flex-1 bg-gray-50/30">
                            <div className="p-6">
                                <TabsContent value="profile" className="m-0 space-y-8">
                                    {/* Action Banner */}
                                    <div className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12 border">
                                                <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-lg">{lead.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{lead.name}</h4>
                                                <p className="text-sm text-gray-500">{lead.position || "No title"} at {lead.company || "No company"}</p>
                                            </div>
                                        </div>
                                        <Button
                                            className="bg-gray-900 text-white hover:bg-gray-800"
                                            onClick={() => setShowConvertWizard(true)}
                                        >
                                            <User className="mr-2 h-4 w-4" /> Convert to Customer
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2 pb-2 border-b">
                                                <User className="h-4 w-4 text-gray-500" />
                                                <h3 className="text-sm font-semibold text-gray-900">Lead Information</h3>
                                            </div>
                                            <div className="grid grid-cols-[120px_1fr] gap-y-4 text-sm">
                                                <div className="text-gray-500">Email</div>
                                                <div className="font-medium text-blue-600">{lead.email || "-"}</div>
                                                <div className="text-gray-500">Phone</div>
                                                <div className="font-medium">{lead.phone || "-"}</div>
                                                <div className="text-gray-500">Website</div>
                                                <div className="font-medium text-blue-600">{lead.website || "-"}</div>
                                                <div className="text-gray-500">Value</div>
                                                <div className="font-medium">{lead.value ? `$${lead.value.toLocaleString()}` : "-"}</div>
                                                <div className="text-gray-500">Address</div>
                                                <div className="font-medium text-gray-900">
                                                    {[lead.address?.street, lead.address?.city, lead.address?.country].filter(Boolean).join(", ") || "-"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2 pb-2 border-b">
                                                <Activity className="h-4 w-4 text-gray-500" />
                                                <h3 className="text-sm font-semibold text-gray-900">System Information</h3>
                                            </div>
                                            <div className="grid grid-cols-[120px_1fr] gap-y-4 text-sm">
                                                <div className="text-gray-500">Status</div>
                                                <div>
                                                    <Badge variant="secondary" className="capitalize">{lead.status}</Badge>
                                                </div>
                                                <div className="text-gray-500">Source</div>
                                                <div className="font-medium">{lead.source || "-"}</div>
                                                <div className="text-gray-500">Created</div>
                                                <div className="font-medium">{lead.createdAt ? format(lead.createdAt.toDate(), "MMM d, yyyy") : "-"}</div>
                                                <div className="text-gray-500">Assigned To</div>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-5 w-5">
                                                        <AvatarFallback className="text-[10px]">JD</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">John Doe</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {lead.description && (
                                        <div className="space-y-3 pt-4 border-t">
                                            <h3 className="text-sm font-semibold text-gray-900">Description</h3>
                                            <div className="p-4 bg-gray-50 rounded-md border text-sm text-gray-700 whitespace-pre-wrap">
                                                {lead.description}
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="proposals" className="m-0">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold">Proposals</h3>
                                        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Proposal</Button>
                                    </div>
                                    {proposals.length === 0 ? (
                                        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50">
                                            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500 font-medium">No proposals created yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {proposals.map(prop => (
                                                <div key={prop.id} className="p-3 border rounded-md bg-white hover:shadow-sm transition-shadow flex justify-between items-center">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{prop.number}</span>
                                                        <span className="text-xs text-gray-500">{format(prop.date.toDate(), "MMM d, yyyy")}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-sm">
                                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: prop.currency }).format(prop.total)}
                                                        </span>
                                                        <Badge variant="outline" className="capitalize text-xs">{prop.status}</Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="tasks" className="m-0">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold">Related Tasks</h3>
                                        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Task</Button>
                                    </div>
                                    {relatedTasks.length === 0 ? (
                                        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50">
                                            <CheckSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500 font-medium">No tasks found for this lead</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {relatedTasks.map(task => (
                                                <div key={task.id} className="p-3 border rounded-md bg-white flex items-start gap-3">
                                                    <div className={`mt-0.5 w-4 h-4 rounded-full border-2 ${task.status === "completed" ? "bg-green-500 border-green-500" : "border-gray-300"}`} />
                                                    <div className="flex-1">
                                                        <h4 className={`text-sm font-medium ${task.status === "completed" ? "line-through text-gray-500" : "text-gray-900"}`}>{task.name}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="secondary" className="text-[10px] h-5 px-1">{task.priority}</Badge>
                                                            {task.dueDate && <span className="text-xs text-red-500">Due {format(task.dueDate.toDate(), "MMM d")}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="notes" className="m-0">
                                    <div className="space-y-4">
                                        <div className="bg-yellow-50 p-4 rounded-md border border-yellow-100 placeholder-content">
                                            <Textarea placeholder="Type a note..." className="bg-transparent border-none resize-none focus-visible:ring-0 p-0 text-sm min-h-[80px]" />
                                            <div className="flex justify-end mt-2 pt-2 border-t border-yellow-200/50">
                                                <Button size="sm" variant="ghost" className="h-8 hover:bg-yellow-100 text-yellow-800">Save Note</Button>
                                            </div>
                                        </div>
                                        <p className="text-center text-gray-400 text-sm py-4">No past notes.</p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="attachments" className="m-0 text-center py-10">
                                    <div className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center">
                                        <Paperclip className="h-10 w-10 text-gray-300 mb-2" />
                                        <p className="text-sm text-gray-500 mb-4">No files attached</p>
                                        <Button variant="outline" size="sm">Upload File</Button>
                                    </div>
                                </TabsContent>

                                <TabsContent value="reminders" className="m-0 text-center py-10">
                                    <div className="flex flex-col items-center justify-center">
                                        <Bell className="h-10 w-10 text-gray-300 mb-2" />
                                        <p className="text-sm text-gray-500 mb-4">No active reminders</p>
                                        <Button variant="outline" size="sm">Add Reminder</Button>
                                    </div>
                                </TabsContent>

                                <TabsContent value="activity" className="m-0">
                                    <div className="pl-4 border-l-2 border-gray-100 space-y-6">
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1 h-3 w-3 bg-blue-500 rounded-full border-2 border-white ring-1 ring-gray-100"></div>
                                            <p className="text-sm text-gray-900 font-medium">Lead Created</p>
                                            <p className="text-xs text-gray-500">{lead.createdAt ? format(lead.createdAt.toDate(), "MMM d, yyyy @ h:mm a") : "Unknown date"}</p>
                                        </div>
                                        {/* Mock activity for visual completeness */}
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1 h-3 w-3 bg-gray-300 rounded-full border-2 border-white ring-1 ring-gray-100"></div>
                                            <p className="text-sm text-gray-900">Status updated to <span className="font-medium text-gray-700">{lead.status}</span></p>
                                            <p className="text-xs text-gray-500">Just now</p>
                                        </div>
                                    </div>
                                </TabsContent>
                            </div>
                        </ScrollArea>
                    </Tabs>
                </div>
            </SheetContent>

            {/* Conversion Wizard */}
            {lead && (
                <ConvertLeadWizard
                    open={showConvertWizard}
                    onClose={() => {
                        setShowConvertWizard(false);
                        onClose(); // Close the details sheet after conversion
                    }}
                    lead={lead}
                    onConvert={convertToCustomer}
                />
            )}
        </Sheet>
    );
}

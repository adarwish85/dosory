"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, FileText, CheckSquare, Paperclip, Bell, StickyNote, Activity, Printer, X, Pencil, MoreHorizontal } from "lucide-react";
import type { Lead } from "@/lib/types";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LeadDetailsDialogProps {
    open: boolean;
    onClose: () => void;
    lead: Lead | null;
    onEdit: (lead: Lead) => void;
}

export function LeadDetailsDialog({ open, onClose, lead, onEdit }: LeadDetailsDialogProps) {
    const [activeTab, setActiveTab] = useState("profile");

    if (!lead) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between sticky top-0 bg-white z-10">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        #{lead.id.substring(0, 4)} - {lead.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="text-gray-500 gap-2">
                            <Printer className="h-4 w-4" /> Print
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-gray-400 hover:text-gray-500">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Action Bar */}
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <div className="flex items-center justify-between mb-6">
                                <TabsList className="bg-transparent p-0 h-auto gap-1 flex-wrap justify-start">
                                    <TabsTrigger
                                        value="profile"
                                        className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 bg-gray-50 text-gray-500 border rounded-md"
                                    >
                                        <User className="h-4 w-4" /> Profile
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="proposals"
                                        className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 bg-gray-50 text-gray-500 border rounded-md"
                                    >
                                        <FileText className="h-4 w-4" /> Proposals
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="tasks"
                                        className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 bg-gray-50 text-gray-500 border rounded-md"
                                    >
                                        <CheckSquare className="h-4 w-4" /> Tasks
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="attachments"
                                        className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 bg-gray-50 text-gray-500 border rounded-md"
                                    >
                                        <Paperclip className="h-4 w-4" /> Attachments
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="reminders"
                                        className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 bg-gray-50 text-gray-500 border rounded-md"
                                    >
                                        <Bell className="h-4 w-4" /> Reminders
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="notes"
                                        className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 bg-gray-50 text-gray-500 border rounded-md"
                                    >
                                        <StickyNote className="h-4 w-4" /> Notes
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="activity"
                                        className="gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 bg-gray-50 text-gray-500 border rounded-md"
                                    >
                                        <Activity className="h-4 w-4" /> Activity Log
                                    </TabsTrigger>
                                </TabsList>

                                <div className="flex gap-2">
                                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                                        <User className="mr-2 h-4 w-4" /> Convert to customer
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => onEdit(lead)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" className="gap-2">
                                        More <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <TabsContent value="profile" className="m-0 space-y-8">
                                <div className="grid grid-cols-2 gap-12">
                                    {/* Lead Information */}
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-semibold text-gray-900 bg-gray-50/50 p-2 -mx-2 rounded">Lead Information</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Name</label>
                                                <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Position</label>
                                                <p className="text-sm text-gray-900">{lead.position || "-"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Email Address</label>
                                                <p className="text-sm text-blue-600 hover:underline cursor-pointer">{lead.email || "-"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Website</label>
                                                <p className="text-sm text-gray-900">{lead.website || "-"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Phone</label>
                                                <p className="text-sm text-blue-600">{lead.phone || "-"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Lead value</label>
                                                <p className="text-sm text-gray-900">{lead.value ? `$${lead.value.toLocaleString()}` : "-"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Company</label>
                                                <p className="text-sm text-gray-900">{lead.company || "-"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Address</label>
                                                <p className="text-sm text-gray-900">{lead.address?.street || "-"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">City</label>
                                                <p className="text-sm text-gray-900">{lead.address?.city || "-"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">State</label>
                                                <p className="text-sm text-gray-900">{lead.address?.state || "-"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Country</label>
                                                <p className="text-sm text-gray-900">{lead.address?.country || "-"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Zip Code</label>
                                                <p className="text-sm text-gray-900">{lead.address?.zipCode || "-"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Description</label>
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.description || "-"}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* General Information */}
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-semibold text-gray-900 bg-gray-50/50 p-2 -mx-2 rounded">General Information</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Status</label>
                                                <div className="mt-1">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                                        {lead.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Source</label>
                                                <p className="text-sm text-gray-900">{lead.source || "-"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Default Language</label>
                                                <p className="text-sm text-gray-900">System Default</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Assigned</label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src="/placeholder-avatar.jpg" />
                                                        <AvatarFallback>JD</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm text-gray-900">John Doe</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Tags</label>
                                                <p className="text-sm text-gray-900">{lead.tags && lead.tags.length > 0 ? lead.tags.join(", ") : "-"}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Created</label>
                                                <p className="text-sm text-gray-900">
                                                    {lead.createdAt ? format(lead.createdAt.toDate(), "MMM d, yyyy HH:mm") : "-"}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Last Contact</label>
                                                <p className="text-sm text-gray-900">-</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Public</label>
                                                <p className="text-sm text-gray-900">No</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="proposals">
                                <div className="text-center py-10 text-gray-500">Proposals content placeholder</div>
                            </TabsContent>
                            <TabsContent value="tasks">
                                <div className="text-center py-10 text-gray-500">Tasks content placeholder</div>
                            </TabsContent>
                            <TabsContent value="attachments">
                                <div className="text-center py-10 text-gray-500">Attachments content placeholder</div>
                            </TabsContent>
                            <TabsContent value="reminders">
                                <div className="text-center py-10 text-gray-500">Reminders content placeholder</div>
                            </TabsContent>
                            <TabsContent value="notes">
                                <div className="text-center py-10 text-gray-500">Notes content placeholder</div>
                            </TabsContent>
                            <TabsContent value="activity">
                                <div className="text-center py-10 text-gray-500">Activity content placeholder</div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

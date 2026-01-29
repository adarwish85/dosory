"use client";

import { useLead } from "./lead-context";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Calendar, FileText, CheckSquare, Bell, UserPlus, Link as LinkIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConvertLeadDialog } from "./convert-lead-dialog";
import { toSlug, createSlugId } from "@/lib/url-utils";

export function LeadProfileHeader() {
    const { lead, loading } = useLead();

    if (loading || !lead) return null;

    return (
        <div className="flex flex-col space-y-4 px-8 py-6 border-b bg-white">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                        {lead.name}
                        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {lead.status}
                        </span>
                    </h1>
                    {lead.company && <p className="text-gray-500 mt-1">{lead.company}</p>}
                </div>
            </div>

            <div className="flex items-center justify-start sm:justify-end gap-2 overflow-x-auto pb-1 sm:pb-0">
                <TooltipProvider delayDuration={0}>
                    {/* Convert to Customer - First Action */}
                    <ConvertLeadDialog
                        lead={lead}
                        trigger={
                            <Button
                                variant="default"
                                size="icon"
                                className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
                            >
                                <UserPlus className="h-4 w-4" />
                            </Button>
                        }
                    />

                    {/* Copy Share Link */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0"
                                onClick={() => {
                                    const slug = lead.slug || toSlug(lead.name);
                                    const url = `${window.location.origin}/dashboard/leads/${createSlugId(slug, lead.id)}`;
                                    navigator.clipboard.writeText(url);
                                    // Could add toast notification here
                                }}
                            >
                                <LinkIcon className="h-4 w-4 text-gray-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy Share Link</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0"
                                onClick={() => lead.phone && window.open(`tel:${lead.phone}`)}
                            >
                                <Phone className="h-4 w-4 text-green-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Call Lead</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0"
                                onClick={() => lead.email && window.open(`mailto:${lead.email}`)}
                            >
                                <Mail className="h-4 w-4 text-blue-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Send Email</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0">
                                <Calendar className="h-4 w-4 text-purple-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Schedule Meeting</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0">
                                <FileText className="h-4 w-4 text-orange-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Create Proposal</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0">
                                <CheckSquare className="h-4 w-4 text-teal-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add Task</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0">
                                <Bell className="h-4 w-4 text-pink-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Set Reminder</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
}

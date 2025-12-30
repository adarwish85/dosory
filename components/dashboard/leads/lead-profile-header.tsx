"use client";

import { useLead } from "./lead-context";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Calendar, FileText, CheckSquare, Bell, UserPlus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConvertLeadDialog } from "./convert-lead-dialog";

export function LeadProfileHeader() {
    const { lead, loading } = useLead();

    if (loading || !lead) return null;

    return (
        <div className="flex items-center justify-between px-8 py-6 border-b bg-white">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    {lead.name}
                    <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {lead.status}
                    </span>
                </h1>
                {lead.company && <p className="text-gray-500 mt-1">{lead.company}</p>}
            </div>

            <div className="flex items-center gap-2">
                <TooltipProvider delayDuration={0}>
                    {/* Convert to Customer - First Action */}
                    <ConvertLeadDialog
                        lead={lead}
                        trigger={
                            <Button
                                variant="default"
                                size="icon"
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                <UserPlus className="h-4 w-4" />
                            </Button>
                        }
                    />

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
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
                                onClick={() => lead.email && window.open(`mailto:${lead.email}`)}
                            >
                                <Mail className="h-4 w-4 text-blue-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Send Email</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Calendar className="h-4 w-4 text-purple-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Schedule Meeting</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon">
                                <FileText className="h-4 w-4 text-orange-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Create Proposal</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon">
                                <CheckSquare className="h-4 w-4 text-teal-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add Task</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon">
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

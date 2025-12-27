"use client";

import { useState } from "react";
import { useLead } from "./lead-context";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Calendar, FileText, CheckSquare, Bell, UserPlus, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { toast } from "sonner";

export function LeadProfileHeader() {
    const { lead, loading } = useLead();
    const { profile } = useUserProfile();
    const router = useRouter();
    const [isConverting, setIsConverting] = useState(false);

    const handleConvertToCustomer = async () => {
        if (!lead || !profile?.orgId) return;

        setIsConverting(true);
        try {
            // Create customer document from lead data
            const customerId = lead.id;
            const leadData = lead as any; // Access additional fields if they exist
            await setDoc(doc(db, "customers", customerId), {
                name: lead.name,
                company: lead.company || lead.name,
                email: lead.email || "",
                phone: lead.phone || "",
                address: leadData.address || "",
                city: leadData.city || "",
                state: leadData.state || "",
                zip: leadData.zip || "",
                country: leadData.country || "",
                website: leadData.website || "",
                orgId: profile.orgId,
                status: "active",
                convertedFromLead: true,
                leadId: lead.id,
                createdAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            // Delete the lead
            await deleteDoc(doc(db, "leads", lead.id));

            toast.success("Lead converted to customer successfully!");
            router.push(`/dashboard/customers/${customerId}`);
        } catch (error) {
            console.error("Error converting lead:", error);
            toast.error("Failed to convert lead to customer");
        } finally {
            setIsConverting(false);
        }
    };

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
                {lead.company && (
                    <p className="text-gray-500 mt-1">{lead.company}</p>
                )}
            </div>

            <div className="flex items-center gap-2">
                <TooltipProvider delayDuration={0}>
                    {/* Convert to Customer - First Action */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="default"
                                size="icon"
                                onClick={handleConvertToCustomer}
                                disabled={isConverting}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {isConverting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <UserPlus className="h-4 w-4" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Convert to Customer</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={() => lead.phone && window.open(`tel:${lead.phone}`)}>
                                <Phone className="h-4 w-4 text-green-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Call Lead</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={() => lead.email && window.open(`mailto:${lead.email}`)}>
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


"use client";

import { useLead } from "@/components/dashboard/leads/lead-context";
import { ActivitiesTable } from "@/components/dashboard/activities/activities-table";
import { Loader2 } from "lucide-react";

export default function LeadActivitiesPage() {
    const { loading, leadId } = useLead();

    if (loading) {
        return (
            <div className="p-8 flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading activities...
            </div>
        );
    }

    if (!leadId) {
        return <div className="p-8 text-gray-500">Lead not found.</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Activities</h1>
            </div>
            <ActivitiesTable relatedToType="lead" relatedToId={leadId} />
        </div>
    );
}

"use client";

import { useCallback } from "react";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useLeadActions } from "./leads/use-lead-actions";
import { useLeadConversion } from "./leads/use-lead-conversion";
import { useLeadsData, useLead, type UseLeadsOptions } from "./leads/use-leads-data";
import type { ConvertLeadOptions, LeadStats } from "./leads/types";

// Re-export for consumers
export { useLead };
export type { UseLeadsOptions, ConvertLeadOptions, LeadStats };

export function useLeads(options: UseLeadsOptions = {}) {
    const { profile } = useUserProfile();

    // 1. Fetch Data
    const { leads, setLeads, loading, error, leadStats, setLeadStats, totalRecords, setTotalRecords } =
        useLeadsData(options);

    // 2. Actions (Create, Update, Delete)
    const { createLead, updateLead, deleteLead, bulkDeleteLeads, bulkDeleteAllMatches } = useLeadActions(
        profile,
        leads,
        setLeads,
        setTotalRecords,
        setLeadStats
    );

    // 3. Conversion
    const { convertToCustomer, isConverting, conversionStep } = useLeadConversion(profile);

    // Wrapper for bulkDeleteAllMatches to inject constraints
    const handleBulkDeleteAllMatches = useCallback(
        async (setLoading?: (loading: boolean) => void) => {
            return bulkDeleteAllMatches(options, setLoading);
        },
        [bulkDeleteAllMatches, options]
    );

    return {
        leads,
        loading,
        error,
        leadStats,
        createLead,
        updateLead,
        deleteLead,
        bulkDeleteLeads,
        bulkDeleteAllMatches: handleBulkDeleteAllMatches,
        convertToCustomer,
        isConverting,
        conversionStep,
        totalRecords,
    };
}

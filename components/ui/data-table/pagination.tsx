"use client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface DataTablePaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (p: number) => void;
    totalRecords: number;
    startRecord: number;
    endRecord: number;
    compact?: boolean;
}

export function DataTablePagination({
    currentPage,
    totalPages,
    onPageChange,
    totalRecords,
    startRecord,
    endRecord,
    compact = false
}: DataTablePaginationProps) {
    const canPrev = currentPage > 1;
    const canNext = currentPage < totalPages;
    return (
        <div className={`flex items-center ${compact ? 'gap-1' : 'justify-between gap-4'}`}>
            {!compact && <div className="text-sm text-gray-500">Showing {startRecord} to {endRecord} of {totalRecords}</div>}
            <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(1)} disabled={!canPrev}><ChevronsLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage - 1)} disabled={!canPrev}><ChevronLeft className="h-4 w-4" /></Button>
                <div className="flex items-center gap-1 px-2 text-sm"><span className="text-gray-700">Page</span><span className="font-medium">{currentPage}</span><span className="text-gray-700">of {totalPages}</span></div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage + 1)} disabled={!canNext}><ChevronRight className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(totalPages)} disabled={!canNext}><ChevronsRight className="h-4 w-4" /></Button>
            </div>
        </div>
    );
}

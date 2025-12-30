"use client";
import { CheckSquare } from "lucide-react";

export type SelectionMode = "none" | "page" | "all";

interface SelectionBannerProps {
    selectionMode: SelectionMode;
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onClearSelection: () => void;
}

export function SelectionBanner({
    selectionMode,
    selectedCount,
    totalCount,
    onSelectAll,
    onClearSelection,
}: SelectionBannerProps) {
    if (selectionMode === "none" || selectedCount === 0) return null;
    return (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-2 flex items-center justify-center gap-2 text-sm mb-2">
            <CheckSquare className="h-4 w-4 text-blue-600" />
            <span className="text-blue-800">
                <strong>{selectedCount}</strong> selected.
            </span>
            {selectionMode === "page" && selectedCount < totalCount && (
                <button onClick={onSelectAll} className="text-blue-600 font-medium hover:underline">
                    Select all {totalCount}
                </button>
            )}
            <button onClick={onClearSelection} className="text-blue-600 font-medium hover:underline ml-2">
                Clear
            </button>
        </div>
    );
}

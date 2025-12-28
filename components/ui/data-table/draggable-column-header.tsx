"use client";
import React, { CSSProperties } from "react";
import { TableHead } from "@/components/ui/table";
import { GripVertical, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface DataTableColumnDef {
    key: string;
    label: string;
    defaultVisible: boolean;
    required?: boolean;
    sortable?: boolean;
}

interface DraggableColumnHeaderProps {
    column: DataTableColumnDef;
    sortKey: string | null;
    sortDirection: "asc" | "desc" | null;
    onSort: (key: string) => void;
    isVisible: boolean;
    width: number;
    onResize: (e: React.MouseEvent, key: string) => void;
    className?: string; // For sticky positioning adjustment or specific styling
}

export function DraggableColumnHeader({
    column,
    sortKey,
    sortDirection,
    onSort,
    isVisible,
    width,
    onResize,
    className
}: DraggableColumnHeaderProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.key });

    // Use React.CSSProperties to match style prop type
    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        width: width,
        minWidth: width,
        maxWidth: width
    };

    if (!isVisible) return null;
    const isActive = sortKey === column.key;

    return (
        <TableHead
            ref={setNodeRef}
            style={style}
            className={`relative font-semibold text-gray-900 bg-gray-100 ${className || "border-r border-gray-200"}`}
        >
            <div className="flex items-center gap-1 w-full overflow-hidden">
                <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded shrink-0" type="button">
                    <GripVertical className="h-3 w-3 text-gray-400" />
                </button>
                {column.sortable ? (
                    <button onClick={() => onSort(column.key)} className="flex items-center gap-1 hover:text-blue-600 truncate min-w-0 flex-1 text-left" type="button">
                        <span className="truncate">{column.label}</span>
                        {isActive ? (
                            sortDirection === "asc" ? <ArrowUp className="h-3 w-3 shrink-0" /> : <ArrowDown className="h-3 w-3 shrink-0" />
                        ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-30 shrink-0" />
                        )}
                    </button>
                ) : (
                    <span className="truncate pl-1">{column.label}</span>
                )}
            </div>
            {/* Resizer Handle */}
            <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-20"
                onMouseDown={(e) => onResize(e, column.key)}
            />
        </TableHead>
    );
}

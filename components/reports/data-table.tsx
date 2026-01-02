"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportTableColumn } from "@/lib/types/reports";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataTableProps {
    title?: string;
    columns: ReportTableColumn[];
    data: Record<string, unknown>[];
    total?: number;
    page?: number;
    pageSize?: number;
    onPageChange?: (page: number) => void;
    loading?: boolean;
}

export function DataTable({
    title,
    columns,
    data,
    total = 0,
    page = 1,
    pageSize = 10,
    onPageChange,
    loading,
}: DataTableProps) {
    const totalPages = Math.ceil(total / pageSize);

    const renderCell = (row: Record<string, unknown>, col: ReportTableColumn) => {
        const val = row[col.key];
        if (val === null || val === undefined) return "-";

        switch (col.type) {
            case "currency":
                return formatCurrency(Number(val));
            case "number":
                return formatNumber(Number(val));
            case "date":
                return formatDate(val);
            case "percent":
                return `${Number(val).toFixed(1)}%`;
            default:
                return String(val);
        }
    };

    return (
        <Card>
            {title && (
                <CardHeader>
                    <CardTitle className="text-base font-medium">{title}</CardTitle>
                </CardHeader>
            )}
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((col) => (
                                <TableHead key={col.key}>{col.label}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {columns.map((col) => (
                                        <TableCell key={col.key}>
                                            <div className="h-4 bg-gray-100 rounded animate-pulse" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                    No results found
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row, i) => (
                                <TableRow key={i}>
                                    {columns.map((col) => (
                                        <TableCell key={col.key}>{renderCell(row, col)}</TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {onPageChange && totalPages > 1 && (
                    <div className="flex items-center justify-end space-x-2 p-4 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(page - 1)}
                            disabled={page <= 1 || loading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(page + 1)}
                            disabled={page >= totalPages || loading}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

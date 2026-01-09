"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useJournalEntries } from "@/lib/hooks/use-journal-entries";
import { PageHeader } from "@/components/dashboard/shared/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCcw } from "lucide-react";

export default function JournalPage() {
    const { entries, loading, fetchEntries } = useJournalEntries();

    const formatCurrency = (amount: number, currency = "USD") => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency,
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            <PageHeader title="General Journal" description="View all double-entry accounting records.">
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchEntries(true)} disabled={loading}>
                        <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Link href="/dashboard/accounting/journal/new">
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" /> New Entry
                        </Button>
                    </Link>
                </div>
            </PageHeader>

            <Card>
                <CardHeader>
                    <CardTitle>Journal Entries</CardTitle>
                    <CardDescription>Chronological list of financial transactions</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Date</TableHead>
                                <TableHead className="w-[150px]">Reference</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-[100px]">Currency</TableHead>
                                <TableHead className="text-right w-[150px]">Amount</TableHead>
                                <TableHead className="w-[100px]">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                        No journal entries found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                entries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="font-medium">
                                            {entry.date ? format(entry.date.toDate(), "MMM d, yyyy") : "-"}
                                        </TableCell>
                                        <TableCell className="text-sm font-mono text-muted-foreground">
                                            {entry.referenceType !== "manual" && (
                                                <Badge variant="outline" className="mr-2 text-xs font-normal">
                                                    {entry.referenceType}
                                                </Badge>
                                            )}
                                            {/* We don't store ref number in top level unless manual input */}
                                            {entry.referenceId && (
                                                <span className="text-xs truncate">
                                                    {entry.referenceId.slice(0, 8)}...
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-[300px] truncate" title={entry.description}>
                                            {entry.description}
                                        </TableCell>
                                        <TableCell>{entry.currency || "USD"}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatCurrency(entry.totalAmount, entry.currency)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={entry.status === "voided" ? "destructive" : "secondary"}>
                                                {entry.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

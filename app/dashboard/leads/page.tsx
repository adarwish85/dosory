"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, RefreshCw, Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLeads } from "@/lib/hooks";
import type { Lead, LeadStatus } from "@/lib/types";
import Link from "next/link";
import { TableSkeleton } from "@/components/ui/skeleton-loaders";

// Dynamic imports for better code splitting - these components are only loaded when needed
const ImportWizard = dynamic(() => import("@/components/import/ImportWizard"), {
    loading: () => <div className="text-sm text-gray-500">Loading...</div>,
    ssr: false,
});

const LeadDetailsDialog = dynamic(
    () => import("@/components/dashboard/leads/lead-details-dialog").then(mod => ({ default: mod.LeadDetailsDialog })),
    { ssr: false }
);

const LeadEditDialog = dynamic(
    () => import("@/components/dashboard/leads/lead-edit-dialog").then(mod => ({ default: mod.LeadEditDialog })),
    { ssr: false }
);

const statusColors: Record<LeadStatus, { bg: string; text: string; border: string }> = {
    new: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
    contacted: { bg: "bg-green-50", text: "text-green-600", border: "border-green-100" },
    qualified: { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-100" },
    proposal: { bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-100" },
    negotiation: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100" },
    won: { bg: "bg-green-50", text: "text-green-600", border: "border-green-100" },
    lost: { bg: "bg-red-50", text: "text-red-600", border: "border-red-100" },
    junk: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
};

export default function LeadsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [showImportWizard, setShowImportWizard] = useState(false);

    // Dialog state
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const { leads, loading, leadStats, deleteLead, updateLead } = useLeads({ status: statusFilter });

    // PERFORMANCE: Use useMemo to prevent unnecessary recalculations
    const filteredLeads = useMemo(() => {
        return leads.filter(lead =>
            lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [leads, searchQuery]);

    const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
        await updateLead(leadId, { status: newStatus });
    };

    const handleView = (lead: Lead) => {
        setSelectedLead(lead);
        setDetailsOpen(true);
    };

    const handleEdit = (lead: Lead) => {
        setSelectedLead(lead);
        setEditOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this lead?")) {
            await deleteLead(id);
        }
    };

    const handleSaveLead = async (id: string, data: Partial<Lead>) => {
        await updateLead(id, data);
        // If updating currently viewed lead, update state
        if (selectedLead && selectedLead.id === id) {
            setSelectedLead({ ...selectedLead, ...data } as Lead);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between">
                    <h1 className="text-2xl font-bold">Leads</h1>
                </div>
                <TableSkeleton rows={10} columns={6} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                {/* Stats Header */}
                <div className="flex flex-wrap gap-2">
                    {Object.entries(leadStats).filter(([key]) =>
                        !["total", "totalValue"].includes(key)
                    ).map(([status, count]) => {
                        const colors = statusColors[status as LeadStatus] || { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" };
                        return (
                            <div key={status} className={`border rounded px-3 py-1 text-xs font-medium ${colors.text} ${colors.border} ${colors.bg} flex items-center gap-2 cursor-pointer hover:opacity-80`}>
                                <span className="font-bold text-gray-900">{count}</span> {status.replace("_", " ")}
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-2">
                        <Link href="/dashboard/leads/new">
                            <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-md">
                                <Plus className="mr-2 h-4 w-4" /> New Lead
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            className="text-gray-700 bg-white"
                            onClick={() => setShowImportWizard(true)}
                        >
                            <Upload className="mr-2 h-4 w-4" /> Import Leads
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="text-gray-600 bg-white">
                            <Filter className="mr-2 h-4 w-4" /> Filters
                        </Button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Select defaultValue="25">
                            <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="25" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline">Export</Button>
                        <Button variant="outline">Bulk Actions</Button>
                        <Button variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="border rounded-md bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="w-12 text-center bg-gray-100/50"><Checkbox /></TableHead>
                                <TableHead className="w-10 text-gray-900 font-semibold bg-gray-100/50">#</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Name</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Company</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Email</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Phone</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Value</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Status</TableHead>
                                <TableHead className="font-semibold text-gray-900 bg-gray-100/50">Source</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLeads.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                                        {searchQuery ? "No leads match your search." : "No leads found. Create your first one!"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLeads.map((lead, index) => (
                                    <TableRow key={lead.id} className="group hover:bg-gray-50">
                                        <TableCell className="text-center"><Checkbox /></TableCell>
                                        <TableCell className="font-medium text-gray-500">{lead.id.substring(0, 4)}</TableCell>
                                        <TableCell className="text-gray-900 font-medium">
                                            <div className="flex flex-col">
                                                <span
                                                    className="cursor-pointer hover:text-blue-600"
                                                    onClick={() => handleView(lead)}
                                                >
                                                    {lead.name}
                                                </span>
                                                <div className="hidden group-hover:flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                    <button className="hover:text-blue-600 hover:underline" onClick={() => handleView(lead)}>View</button>
                                                    <span>|</span>
                                                    <button className="hover:text-blue-600 hover:underline" onClick={() => handleEdit(lead)}>Edit</button>
                                                    <span>|</span>
                                                    <button className="hover:text-red-600 hover:underline" onClick={() => handleDelete(lead.id)}>Delete</button>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-500">{lead.company || "-"}</TableCell>
                                        <TableCell className="text-gray-500">{lead.email || "-"}</TableCell>
                                        <TableCell className="text-gray-500">{lead.phone || "-"}</TableCell>
                                        <TableCell className="text-gray-900">{lead.value ? `$${lead.value.toLocaleString()}` : "-"}</TableCell>
                                        <TableCell>
                                            <Select
                                                value={lead.status}
                                                onValueChange={(value) => handleStatusChange(lead.id, value as LeadStatus)}
                                            >
                                                <SelectTrigger className="h-7 text-xs font-normal w-[120px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="new">New</SelectItem>
                                                    <SelectItem value="contacted">Attempted to Contact</SelectItem>
                                                    <SelectItem value="qualified">SQL</SelectItem>
                                                    <SelectItem value="proposal">Offer Sent</SelectItem>
                                                    <SelectItem value="negotiation">Negotiation</SelectItem>
                                                    <SelectItem value="won">Partner</SelectItem>
                                                    <SelectItem value="lost">Closed: Lost</SelectItem>
                                                    <SelectItem value="junk">Junk</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="text-gray-500">{lead.source || "-"}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Import Wizard */}
            <ImportWizard
                open={showImportWizard}
                onClose={() => setShowImportWizard(false)}
                module="leads"
                onSuccess={(count) => console.log(`Imported ${count} leads`)}
            />

            <LeadDetailsDialog
                open={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                lead={selectedLead}
                onEdit={() => {
                    setDetailsOpen(false);
                    setEditOpen(true);
                }}
            />

            <LeadEditDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                lead={selectedLead}
                onSave={handleSaveLead}
            />
        </div>
    );
}


"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSupportTickets, useStaff, useCustomers } from "@/lib/hooks";
import { SupportTicketPriority } from "@/lib/types/support";

export default function NewTicketPage() {
    const router = useRouter();
    const { createTicket, loading } = useSupportTickets();
    const { staff } = useStaff();
    const { customers } = useCustomers();

    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<SupportTicketPriority>("medium");
    const [category, setCategory] = useState("General");
    const [assignedAgentId, setAssignedAgentId] = useState<string>("unassigned");
    const [customerId, setCustomerId] = useState<string>("");

    // Mock categories for V1
    const CATEGORIES = ["General", "Billing", "Technical", "Feature Request", "Bug"];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createTicket({
                subject,
                description,
                priority,
                category,
                source: "manual",
                status: "open",
                assignedAgentId: assignedAgentId === "unassigned" ? null : assignedAgentId,
                customerId: customerId || null,
                metadata: {},
            });
            router.push("/dashboard/support");
        } catch (error) {
            console.error("Failed to create ticket", error);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/support">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">Create New Ticket</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Ticket Details</CardTitle>
                    <CardDescription>Create a new support ticket.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label>Subject</Label>
                            <Input
                                placeholder="Brief summary of the issue"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((c) => (
                                            <SelectItem key={c} value={c}>
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Priority</Label>
                                <Select value={priority} onValueChange={(v) => setPriority(v as SupportTicketPriority)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="critical">Critical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                placeholder="Detailed description of the problem..."
                                className="min-h-[150px]"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Customer (Optional)</Label>
                                <Select value={customerId} onValueChange={setCustomerId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.company}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Assign Agent (Optional)</Label>
                                <Select value={assignedAgentId} onValueChange={setAssignedAgentId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {staff.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.firstName} {s.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={loading}>
                                <Save className="mr-2 h-4 w-4" />
                                {loading ? "Creating..." : "Create Ticket"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

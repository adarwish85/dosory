"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bold, Italic, Underline, Link, Image, MoreHorizontal, AlignLeft, AlignCenter, AlignRight, Printer, Edit2, Plus, Loader2 } from "lucide-react";

interface Ticket {
    id: string;
    subject: string;
    status: string;
    priority: string;
    department?: string;
    contact?: {
        name: string;
        email: string;
    };
    customer?: {
        name: string;
    };
    assignee?: string;
    createdAt?: any;
    lastReply?: any;
    messages?: Array<{
        sender: string;
        senderType: string;
        content: string;
        createdAt: any;
    }>;
}

export default function TicketPage() {
    const params = useParams();
    const ticketId = params?.id as string;
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!ticketId) {
            setLoading(false);
            return;
        }

        async function loadTicket() {
            try {
                const docRef = doc(db, "support_tickets", ticketId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setTicket({ id: docSnap.id, ...docSnap.data() } as Ticket);
                } else {
                    console.error("Ticket not found");
                }
            } catch (error) {
                console.error("Error loading ticket:", error);
            } finally {
                setLoading(false);
            }
        }

        loadTicket();
    }, [ticketId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!ticket) {
        return <div className="p-8">Ticket not found</div>;
    }

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "answered": return "text-blue-600 bg-blue-50 border-blue-200";
            case "open": return "text-orange-600 bg-orange-50 border-orange-200";
            case "closed": return "text-gray-600 bg-gray-50 border-gray-200";
            default: return "text-gray-600 bg-gray-50 border-gray-200";
        }
    };

    return (
        <div className="flex gap-6">
            {/* Main Content */}
            <div className="flex-1 space-y-6">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">#{ticketId?.slice(0, 4)} - {ticket.subject}</h2>
                        <Badge variant="outline" className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="text-gray-600 gap-2">
                            🤖 Summarize (AI)
                        </Button>
                    </div>
                </div>

                <div className="bg-gray-100 p-2 rounded-t-md border-b border-gray-200 flex gap-4 text-sm font-medium text-gray-600">
                    <div className="flex items-center gap-2 text-gray-900 bg-white px-3 py-1 rounded shadow-sm">
                        <span>↩ Add Reply</span>
                    </div>
                    <div className="flex items-center gap-2 cursor-pointer hover:text-gray-900">
                        <span>📝 Add Note</span>
                    </div>
                    <div className="flex items-center gap-2 cursor-pointer hover:text-gray-900">
                        <span>🔔 Reminders</span>
                    </div>
                    <div className="flex items-center gap-2 cursor-pointer hover:text-gray-900">
                        <span>✅ Tasks</span>
                    </div>
                </div>

                <div className="bg-white border rounded-b-md p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select>
                            <SelectTrigger className="bg-gray-50 text-gray-500">
                                <SelectValue placeholder="Insert predefined reply" />
                            </SelectTrigger>
                            <SelectContent><SelectItem value="1">Reply 1</SelectItem></SelectContent>
                        </Select>
                        <Select>
                            <SelectTrigger className="bg-gray-50 text-gray-500">
                                <SelectValue placeholder="Insert knowledge base link" />
                            </SelectTrigger>
                            <SelectContent><SelectItem value="1">Link 1</SelectItem></SelectContent>
                        </Select>
                    </div>

                    <div className="border rounded-md">
                        <div className="border-b p-2 bg-gray-50 flex items-center gap-2 text-gray-600">
                            <span className="text-xs mr-2">File Edit View Insert Format Tools Table</span>
                        </div>
                        <div className="border-b p-2 flex items-center gap-4 text-gray-600">
                            <Select defaultValue="system">
                                <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue placeholder="System Font" /></SelectTrigger>
                                <SelectContent><SelectItem value="system">System Font</SelectItem></SelectContent>
                            </Select>
                            <Select defaultValue="12">
                                <SelectTrigger className="w-[80px] h-8 text-sm"><SelectValue placeholder="12pt" /></SelectTrigger>
                                <SelectContent><SelectItem value="12">12pt</SelectItem></SelectContent>
                            </Select>
                            <div className="h-4 w-px bg-gray-300 mx-2"></div>
                            <Bold className="w-4 h-4 cursor-pointer" />
                            <Italic className="w-4 h-4 cursor-pointer" />
                            <Underline className="w-4 h-4 cursor-pointer" />
                            <div className="h-4 w-px bg-gray-300 mx-2"></div>
                            <AlignLeft className="w-4 h-4 cursor-pointer" />
                            <AlignCenter className="w-4 h-4 cursor-pointer" />
                            <AlignRight className="w-4 h-4 cursor-pointer" />
                            <div className="h-4 w-px bg-gray-300 mx-2"></div>
                            <Image className="w-4 h-4 cursor-pointer" />
                            <Link className="w-4 h-4 cursor-pointer" />
                            <MoreHorizontal className="w-4 h-4 cursor-pointer ml-auto" />
                        </div>
                        <div className="p-4 min-h-[200px] text-gray-400">
                            Add Reply
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700">Attachments</label>
                        <div className="flex gap-2 mt-1">
                            <Button variant="outline" className="h-9">Choose File</Button>
                            <div className="flex items-center px-3 border rounded-md text-sm text-gray-500 bg-gray-50 flex-1">No file chosen</div>
                            <Button variant="outline" size="icon" className="h-9 w-9"><Plus className="h-4 w-4" /></Button>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700">CC</label>
                        <Input className="mt-1" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="assign" />
                            <label htmlFor="assign" className="text-sm font-medium leading-none">Assign this ticket to me automatically</label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="return" defaultChecked />
                            <label htmlFor="return" className="text-sm font-medium leading-none">Return to ticket list after response is submitted</label>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                        {ticket.lastReply ? `Last Reply: ${new Date(ticket.lastReply?.toDate?.() || ticket.lastReply).toLocaleDateString()}` : "No replies yet"}
                    </span>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Ticket Status</span>
                            <Select defaultValue={ticket.status?.toLowerCase() || "open"}>
                                <SelectTrigger className="w-[140px] h-9 bg-gray-50"><SelectValue placeholder="Open" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="answered">Answered</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="outline" className="gap-2">🤖 Suggest Reply (AI)</Button>
                        <Button className="bg-gray-900 text-white hover:bg-gray-800">Add Response</Button>
                    </div>
                </div>

                <h3 className="font-bold text-lg text-gray-900 mt-8">Request History</h3>
                <div className="border rounded-md p-4 bg-white">
                    {ticket.messages && ticket.messages.length > 0 ? (
                        ticket.messages.map((message, index) => (
                            <div key={index} className="flex justify-between items-start mb-4 last:mb-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-blue-600">{message.sender}</span>
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-xs">{message.senderType}</Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>Posted: {new Date(message.createdAt?.toDate?.() || message.createdAt).toLocaleString()}</span>
                                    <Printer className="h-3 w-3 cursor-pointer" />
                                    <Edit2 className="h-3 w-3 cursor-pointer" />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4 text-gray-500">
                            No messages yet
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar Info */}
            <div className="w-80 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Ticket Information</h3>
                    <Badge className="bg-gray-900 text-white hover:bg-gray-800 cursor-pointer">Save</Badge>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Subject</label>
                        <Input defaultValue={ticket.subject} className="h-8" />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Contact</label>
                        <Input defaultValue={ticket.contact?.name || "-"} className="h-8" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Name</label>
                            <Input value={ticket.contact?.name || "-"} readOnly className="h-8 bg-gray-50 text-gray-500" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Email address</label>
                            <Input value={ticket.contact?.email || "-"} readOnly className="h-8 bg-gray-50 text-gray-500 truncate" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Department</label>
                        <Select defaultValue={ticket.department || "technical"}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Technical Support" /></SelectTrigger>
                            <SelectContent><SelectItem value="technical">Technical Support</SelectItem></SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Assign ticket</label>
                        <Select defaultValue={ticket.assignee || ""}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Select assignee" /></SelectTrigger>
                            <SelectContent><SelectItem value="none">Unassigned</SelectItem></SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Priority</label>
                            <Select defaultValue={ticket.priority?.toLowerCase() || "medium"}>
                                <SelectTrigger className="h-8"><SelectValue placeholder="Medium" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Service</label>
                            <Select>
                                <SelectTrigger className="h-8"><SelectValue placeholder="Select service" /></SelectTrigger>
                                <SelectContent><SelectItem value="none">Nothing selected</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

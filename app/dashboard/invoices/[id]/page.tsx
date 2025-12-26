"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface LineItem {
    id: string;
    description: string;
    quantity: number;
    rate: number;
}

interface Invoice {
    id: string;
    number: string;
    clientName: string;
    customerName?: string;
    date: Timestamp | string | Date;
    dueDate: Timestamp | string | Date;
    createdAt?: Timestamp | string | Date;
    total: number;
    status: string;
    items: LineItem[];
    currency?: string;
}

// Helper to format Firestore Timestamp or Date to readable string
const formatDate = (date: Timestamp | string | Date | undefined): string => {
    if (!date) return "-";
    try {
        if (date instanceof Timestamp || (date && typeof date === 'object' && 'toDate' in date)) {
            return format((date as Timestamp).toDate(), "dd/MM/yyyy");
        }
        if (date instanceof Date) {
            return format(date, "dd/MM/yyyy");
        }
        if (typeof date === "string") {
            return format(new Date(date), "dd/MM/yyyy");
        }
        return "-";
    } catch {
        return "-";
    }
};

export default function InvoiceDetailsPage() {
    const params = useParams();
    const id = params.id as string;
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchInvoice() {
            if (!id) return;
            try {
                const docRef = doc(db, "invoices", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setInvoice({ id: docSnap.id, ...docSnap.data() } as Invoice);
                }
            } catch (error) {
                console.error("Error fetching invoice:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchInvoice();
    }, [id]);

    if (loading) return <div>Loading...</div>;
    if (!invoice) return <div>Invoice not found</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{invoice.number}</h2>
                    <p className="text-muted-foreground">{invoice.clientName}</p>
                </div>
                <div className="space-x-2">
                    <Button variant="outline">Download PDF</Button>
                    <Button>Send to Client</Button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Rate</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoice.items && invoice.items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">${item.rate.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">${(item.quantity * item.rate).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                                    <TableCell className="text-right font-bold">${invoice.total.toFixed(2)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <span className="block text-sm font-medium text-muted-foreground">Date</span>
                            <span>{formatDate(invoice.date)}</span>
                        </div>
                        <div>
                            <span className="block text-sm font-medium text-muted-foreground">Due Date</span>
                            <span>{formatDate(invoice.dueDate)}</span>
                        </div>
                        <div>
                            <span className="block text-sm font-medium text-muted-foreground">Status</span>
                            <span className="capitalize">{invoice.status}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

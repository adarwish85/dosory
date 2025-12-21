"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Client {
    id: string;
    company: string;
}

interface LineItem {
    id: string;
    description: string;
    quantity: number;
    rate: number;
}

export default function CreateInvoicePage() {
    const { profile } = useUserProfile();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState(searchParams.get("customerId") || "");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
    const [items, setItems] = useState<LineItem[]>([
        { id: "1", description: "Service", quantity: 1, rate: 100 },
    ]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchClients() {
            if (!profile?.orgId) return;
            const q = query(
                collection(db, "customers"),
                where("orgId", "==", profile.orgId)
            );
            const querySnapshot = await getDocs(q);
            const clientList: Client[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                clientList.push({ id: doc.id, company: data.company } as Client);
            });
            setClients(clientList);
        }
        fetchClients();
    }, [profile?.orgId]);

    const handleItemChange = (id: string, field: keyof LineItem, value: any) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const addItem = () => {
        setItems([
            ...items,
            { id: Date.now().toString(), description: "", quantity: 1, rate: 0 },
        ]);
    };

    const removeItem = (id: string) => {
        setItems(items.filter((item) => item.id !== id));
    };

    const calculateTotal = () => {
        return items.reduce((acc, item) => acc + item.quantity * item.rate, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.orgId || !selectedClient) return;

        setLoading(true);
        try {
            const client = clients.find(c => c.id === selectedClient);
            await addDoc(collection(db, "invoices"), {
                orgId: profile.orgId,
                customerId: selectedClient, // Changed from clientId
                customerName: client?.company, // Changed from clientName/companyName
                number: `INV-${Date.now()}`, // Simple ID generation
                date: date ? format(date, "yyyy-MM-dd") : "",
                dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : "",
                status: "draft",
                items: items,
                total: calculateTotal(),
                createdAt: new Date().toISOString(),
            });
            router.push("/dashboard/invoices");
        } catch (error) {
            console.error("Error creating invoice:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Create Invoice</h2>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Invoice Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Client</Label>
                                <Select onValueChange={setSelectedClient}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map((client) => (
                                            <SelectItem key={client.id} value={client.id}>
                                                {client.company}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Invoice Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="text-lg">Items</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addItem}>Add Item</Button>
                            </div>

                            {items.map((item) => (
                                <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                                    <div className="col-span-6 space-y-2">
                                        <Label>Description</Label>
                                        <Input
                                            value={item.description}
                                            onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                                            placeholder="Service description"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <Label>Qty</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(item.id, "quantity", parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="col-span-3 space-y-2">
                                        <Label>Rate</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={item.rate}
                                            onChange={(e) => handleItemChange(item.id, "rate", parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                                            <Trash className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end pt-4 border-t">
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Total Amount</p>
                                <p className="text-2xl font-bold">${calculateTotal().toFixed(2)}</p>
                            </div>
                        </div>
                    </CardContent>
                    <div className="flex justify-end p-6">
                        <Button type="button" variant="outline" className="mr-2" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Invoice"}</Button>
                    </div>
                </Card>
            </form>
        </div>
    );
}

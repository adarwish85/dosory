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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface Client {
    id: string;
    company: string;
}

export default function CreateCreditNotePage() {
    const { profile } = useUserProfile();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [clients, setClients] = useState<Client[]>([]);
    const [formData, setFormData] = useState({
        clientId: searchParams.get("customerId") || "",
        amount: 0,
        reason: "",
        status: "open",
    });
    const [date, setDate] = useState<Date | undefined>(new Date());
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.orgId || !formData.clientId) return;

        setLoading(true);
        try {
            const client = clients.find(c => c.id === formData.clientId);
            await addDoc(collection(db, "credit_notes"), {
                ...formData,
                orgId: profile.orgId,
                clientName: client?.company || "",
                number: `CN-${Date.now()}`,
                date: date ? format(date, "yyyy-MM-dd") : "",
                createdAt: new Date().toISOString(),
            });
            router.push("/dashboard/sales/credit-notes");
        } catch (error) {
            console.error("Error creating credit note:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Create Credit Note</h2>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Credit Note Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Client</Label>
                                <Select
                                    value={formData.clientId}
                                    onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                                >
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
                                <Label>Date</Label>
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

                        <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Reason / Description</Label>
                            <Textarea
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="Reason for credit note..."
                                className="h-24"
                            />
                        </div>
                    </CardContent>
                    <div className="flex justify-end p-6">
                        <Button type="button" variant="outline" className="mr-2" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Credit Note"}</Button>
                    </div>
                </Card>
            </form>
        </div>
    );
}

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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Client {
    id: string;
    company: string;
}

export default function CreateContractPage() {
    const { profile } = useUserProfile();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState(searchParams.get("customerId") || "");
    const [startDate, setStartDate] = useState<Date | undefined>(new Date());
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [subject, setSubject] = useState("");
    const [contractValue, setContractValue] = useState<number>(0);
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchClients() {
            if (!profile?.orgId) return;
            const q = query(collection(db, "customers"), where("orgId", "==", profile.orgId));
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
        if (!profile?.orgId || !selectedClient) return;

        setLoading(true);
        try {
            const client = clients.find((c) => c.id === selectedClient);
            await addDoc(collection(db, "contracts"), {
                orgId: profile.orgId,
                customerId: selectedClient,
                customerName: client?.company,
                subject: subject || "New Contract",
                contractValue: contractValue,
                startDate: startDate ? format(startDate, "yyyy-MM-dd") : "",
                endDate: endDate ? format(endDate, "yyyy-MM-dd") : "",
                description: description,
                status: "draft",
                createdAt: new Date().toISOString(),
            });
            router.push("/dashboard/contracts");
        } catch (error) {
            console.error("Error creating contract:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Create Contract</h2>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Contract Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Subject</Label>
                            <Input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Contract subject..."
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Client</Label>
                            <Select onValueChange={setSelectedClient} value={selectedClient}>
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
                            <Label>Contract Value</Label>
                            <Input
                                type="number"
                                min="0"
                                value={contractValue}
                                onChange={(e) => setContractValue(parseFloat(e.target.value))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !startDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={startDate}
                                            onSelect={setStartDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !endDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Contract details..."
                                className="h-32"
                            />
                        </div>
                    </CardContent>
                    <div className="flex justify-end p-6">
                        <Button type="button" variant="outline" className="mr-2" onClick={() => router.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create Contract"}
                        </Button>
                    </div>
                </Card>
            </form>
        </div>
    );
}

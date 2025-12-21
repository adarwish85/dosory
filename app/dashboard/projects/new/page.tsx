"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

interface Client {
    id: string;
    companyName: string;
}

export default function CreateProjectPage() {
    const { profile } = useUserProfile();
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        clientId: "",
        status: "in_progress",
        description: "",
    });
    const [deadline, setDeadline] = useState<Date | undefined>(new Date());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchClients() {
            if (!profile?.orgId) return;
            const q = query(
                collection(db, "clients"),
                where("orgId", "==", profile.orgId)
            );
            const querySnapshot = await getDocs(q);
            const clientList: Client[] = [];
            querySnapshot.forEach((doc) => {
                clientList.push({ id: doc.id, ...doc.data() } as Client);
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
            await addDoc(collection(db, "projects"), {
                ...formData,
                orgId: profile.orgId,
                clientName: client?.companyName,
                deadline: deadline ? format(deadline, "yyyy-MM-dd") : "",
                createdAt: new Date().toISOString(),
            });
            router.push("/dashboard/projects");
        } catch (error) {
            console.error("Error creating project:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Create Project</h2>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Project Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Project Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Client</Label>
                                <Select onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map((client) => (
                                            <SelectItem key={client.id} value={client.id}>
                                                {client.companyName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Deadline</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !deadline && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {deadline ? format(deadline, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={deadline}
                                            onSelect={setDeadline}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="h-20"
                            />
                        </div>
                    </CardContent>
                    <div className="flex justify-end p-6">
                        <Button type="button" variant="outline" className="mr-2" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Project"}</Button>
                    </div>
                </Card>
            </form>
        </div>
    );
}

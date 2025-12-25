"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Phone, Mail, Calendar, FileText, CheckSquare, Bell, Target, TrendingUp } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLead } from "./lead-context";
import { LEAD_STATUSES, LEAD_SOURCES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// World Countries
const COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
    "Bahrain", "Bangladesh", "Belarus", "Belgium", "Bolivia", "Bosnia and Herzegovina", "Brazil", "Brunei", "Bulgaria",
    "Cambodia", "Cameroon", "Canada", "Chile", "China", "Colombia", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
    "Denmark", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Estonia", "Ethiopia",
    "Finland", "France", "Georgia", "Germany", "Ghana", "Greece", "Guatemala",
    "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
    "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Latvia", "Lebanon", "Libya", "Lithuania", "Luxembourg",
    "Malaysia", "Mexico", "Moldova", "Monaco", "Morocco", "Netherlands", "New Zealand", "Nigeria", "North Korea", "Norway",
    "Oman", "Pakistan", "Palestine", "Panama", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
    "Romania", "Russia", "Saudi Arabia", "Serbia", "Singapore", "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain",
    "Sri Lanka", "Sudan", "Sweden", "Switzerland", "Syria", "Taiwan", "Thailand", "Tunisia", "Turkey",
    "UAE", "UK", "Ukraine", "Uruguay", "USA", "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zimbabwe"
];

// Score calculation
function calculateLeadScore(lead: any): number {
    let score = 0;
    if (lead?.email) score += 15;
    if (lead?.phone) score += 15;
    if (lead?.company) score += 10;
    if (lead?.position) score += 5;
    if (lead?.website) score += 5;
    if (lead?.address?.country) score += 5;
    if (lead?.address?.city) score += 5;
    if (lead?.value && lead.value > 0) score += 15;
    if (lead?.source) score += 10;
    if (lead?.tags?.length > 0) score += 5;
    if (lead?.status === "qualified" || lead?.status === "proposal" || lead?.status === "negotiation") score += 10;
    return Math.min(score, 100);
}

// Status pipeline position
const STATUS_ORDER = ["new", "contacted", "qualified", "proposal", "negotiation", "won"];

export function LeadProfileForm() {
    const router = useRouter();
    const { lead, loading, leadId, refreshLead } = useLead();
    const { register, handleSubmit, setValue, watch } = useForm();

    useEffect(() => {
        if (lead) {
            setValue("name", lead.name || "");
            setValue("company", lead.company || "");
            setValue("email", lead.email || "");
            setValue("phone", lead.phone || "");
            setValue("website", lead.website || "");
            setValue("position", lead.position || "");
            setValue("status", lead.status || "new");
            setValue("source", lead.source || "");
            setValue("value", lead.value || 0);
            setValue("tags", lead.tags?.join(", ") || "");
            setValue("description", lead.description || "");
            setValue("address.street", lead.address?.street || "");
            setValue("address.city", lead.address?.city || "");
            setValue("address.state", lead.address?.state || "");
            setValue("address.country", lead.address?.country || "");
            setValue("address.zipCode", lead.address?.zipCode || "");
        }
    }, [lead, setValue]);

    const onSave = async (data: any) => {
        if (!leadId) return;

        try {
            const docRef = doc(db, "leads", leadId);
            await updateDoc(docRef, {
                name: data.name,
                company: data.company,
                email: data.email,
                phone: data.phone,
                website: data.website,
                position: data.position,
                status: data.status,
                source: data.source,
                value: parseFloat(data.value) || 0,
                tags: data.tags?.split(",").map((t: string) => t.trim()).filter(Boolean) || [],
                description: data.description,
                address: {
                    street: data["address.street"],
                    city: data["address.city"],
                    state: data["address.state"],
                    country: data["address.country"],
                    zipCode: data["address.zipCode"],
                },
                updatedAt: new Date(),
            });
            refreshLead();
            alert("Lead updated successfully!");
        } catch (error) {
            console.error("Error updating lead:", error);
            alert("Failed to update lead");
        }
    };

    if (loading) {
        return <div className="p-8">Loading lead...</div>;
    }

    if (!lead) {
        return <div className="p-8">Lead not found</div>;
    }

    const score = calculateLeadScore(lead);
    const statusIndex = STATUS_ORDER.indexOf(lead.status || "new");
    const pipelineProgress = statusIndex >= 0 ? ((statusIndex + 1) / STATUS_ORDER.length) * 100 : 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/leads")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-xl font-bold text-gray-900">Lead Profile</h2>
            </div>

            <form onSubmit={handleSubmit(onSave)}>
                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                        <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent px-4 py-2">
                            Lead Details
                        </TabsTrigger>
                        <TabsTrigger value="score" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent px-4 py-2">
                            Score & Pipeline
                        </TabsTrigger>
                        <TabsTrigger value="actions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent px-4 py-2">
                            Quick Actions
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="mt-6 space-y-6 max-w-3xl">
                        {/* Status & Source Row */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-red-500">* Status</Label>
                                <Select defaultValue={lead.status} onValueChange={(val) => setValue("status", val)}>
                                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                    <SelectContent>
                                        {LEAD_STATUSES.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-red-500">* Source</Label>
                                <Select defaultValue={lead.source} onValueChange={(val) => setValue("source", val)}>
                                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                                    <SelectContent>
                                        {LEAD_SOURCES.map((s) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Lead Value (EGP)</Label>
                                <Input type="number" {...register("value")} />
                            </div>
                        </div>

                        {/* Name & Contact */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-red-500">* Name</Label>
                                <Input {...register("name", { required: true })} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Company</Label>
                                <Input {...register("company")} />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label>Email</Label>
                                <Input {...register("email")} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Phone</Label>
                                <Input {...register("phone")} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Position</Label>
                                <Input {...register("position")} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Website</Label>
                                <Input {...register("website")} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Tags</Label>
                                <Input placeholder="Comma-separated" {...register("tags")} />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Country</Label>
                                <Select defaultValue={lead.address?.country || ""} onValueChange={(val) => setValue("address.country", val)}>
                                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {COUNTRIES.map((c) => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>City</Label>
                                <Input {...register("address.city")} />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label>Street Address</Label>
                                <Input {...register("address.street")} />
                            </div>
                            <div className="grid gap-2">
                                <Label>State</Label>
                                <Input {...register("address.state")} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Zip Code</Label>
                                <Input {...register("address.zipCode")} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Description</Label>
                            <Textarea className="min-h-[100px]" {...register("description")} />
                        </div>

                        <div className="flex gap-2">
                            <Button type="submit">Save Changes</Button>
                            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/leads")}>
                                Cancel
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="score" className="mt-6 space-y-6 max-w-3xl">
                        {/* Lead Score */}
                        <div className="p-6 border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                            <div className="flex items-center gap-3 mb-4">
                                <Target className="h-6 w-6 text-blue-600" />
                                <h3 className="text-lg font-semibold">Lead Score</h3>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-5xl font-bold text-blue-600">{score}</div>
                                <div className="flex-1">
                                    <Progress value={score} className="h-3" />
                                    <p className="text-sm text-gray-500 mt-2">
                                        {score >= 80 ? "Hot Lead - Ready for conversion" :
                                            score >= 60 ? "Warm Lead - Good potential" :
                                                score >= 40 ? "Developing - Needs nurturing" :
                                                    "Cold Lead - More info needed"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Pipeline Progress */}
                        <div className="p-6 border rounded-lg">
                            <div className="flex items-center gap-3 mb-4">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                                <h3 className="text-lg font-semibold">Conversion Pipeline</h3>
                            </div>
                            <Progress value={pipelineProgress} className="h-3 mb-4" />
                            <div className="flex justify-between">
                                {STATUS_ORDER.map((status, idx) => {
                                    const isActive = lead.status === status;
                                    const isPassed = statusIndex > idx;
                                    return (
                                        <div key={status} className={`text-xs font-medium ${isActive ? "text-green-600" : isPassed ? "text-gray-600" : "text-gray-400"}`}>
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Score Breakdown */}
                        <div className="p-6 border rounded-lg">
                            <h3 className="text-lg font-semibold mb-4">Score Breakdown</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex justify-between"><span>Email</span><Badge variant={lead.email ? "default" : "secondary"}>{lead.email ? "+15" : "0"}</Badge></div>
                                <div className="flex justify-between"><span>Phone</span><Badge variant={lead.phone ? "default" : "secondary"}>{lead.phone ? "+15" : "0"}</Badge></div>
                                <div className="flex justify-between"><span>Company</span><Badge variant={lead.company ? "default" : "secondary"}>{lead.company ? "+10" : "0"}</Badge></div>
                                <div className="flex justify-between"><span>Lead Value</span><Badge variant={lead.value ? "default" : "secondary"}>{lead.value ? "+15" : "0"}</Badge></div>
                                <div className="flex justify-between"><span>Source</span><Badge variant={lead.source ? "default" : "secondary"}>{lead.source ? "+10" : "0"}</Badge></div>
                                <div className="flex justify-between"><span>Status</span><Badge variant={["qualified", "proposal", "negotiation"].includes(lead.status || "") ? "default" : "secondary"}>{["qualified", "proposal", "negotiation"].includes(lead.status || "") ? "+10" : "0"}</Badge></div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="actions" className="mt-6 space-y-6 max-w-3xl">
                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => lead?.phone && window.open(`tel:${lead.phone}`)}>
                                <Phone className="h-6 w-6 text-green-600" />
                                <span>Call Lead</span>
                            </Button>
                            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => lead?.email && window.open(`mailto:${lead.email}`)}>
                                <Mail className="h-6 w-6 text-blue-600" />
                                <span>Send Email</span>
                            </Button>
                            <Button variant="outline" className="h-20 flex-col gap-2">
                                <Calendar className="h-6 w-6 text-purple-600" />
                                <span>Schedule Meeting</span>
                            </Button>
                            <Button variant="outline" className="h-20 flex-col gap-2">
                                <FileText className="h-6 w-6 text-orange-600" />
                                <span>Create Proposal</span>
                            </Button>
                            <Button variant="outline" className="h-20 flex-col gap-2">
                                <CheckSquare className="h-6 w-6 text-teal-600" />
                                <span>Add Task</span>
                            </Button>
                            <Button variant="outline" className="h-20 flex-col gap-2">
                                <Bell className="h-6 w-6 text-pink-600" />
                                <span>Set Reminder</span>
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </form>
        </div>
    );
}

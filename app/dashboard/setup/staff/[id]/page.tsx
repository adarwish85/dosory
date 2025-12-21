"use client";

import { useEffect, useState } from "react";
import { StaffForm } from "@/components/dashboard/setup/staff/staff-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface StaffMember {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    image?: string;
    [key: string]: any;
}

export default function EditStaffPage() {
    const params = useParams();
    const rawStaffId = params?.id as string;
    // Decode the URL parameter (handles %40 for @ and other encoded chars)
    const staffId = rawStaffId ? decodeURIComponent(rawStaffId) : "";
    const [staff, setStaff] = useState<StaffMember | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!staffId) return;

        async function loadStaff() {
            try {
                // First try direct document lookup (email-based ID)
                const docRef = doc(db, "staff", staffId);
                let docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = { id: docSnap.id, ...docSnap.data() } as StaffMember;
                    setStaff(data);
                    return;
                }

                // Fallback: Query by email field (for backward compatibility with UID-based docs)
                const { collection, query, where, getDocs } = await import("firebase/firestore");
                const q = query(collection(db, "staff"), where("email", "==", staffId));
                const querySnap = await getDocs(q);

                if (!querySnap.empty) {
                    const docData = querySnap.docs[0];
                    const data = { id: docData.id, ...docData.data() } as StaffMember;
                    setStaff(data);
                } else {
                    console.error("Staff member not found:", staffId);
                }
            } catch (error) {
                console.error("Error loading staff:", error);
            } finally {
                setLoading(false);
            }
        }

        loadStaff();
    }, [staffId]);

    if (loading) {
        return <div className="p-8">Loading staff member...</div>;
    }

    if (!staff) {
        return <div className="p-8">Staff member not found</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-5 gap-4">
                <StatCard label="Total Logged Time" value="00:00" />
                <StatCard label="Last Month Logged Time" value="00:00" />
                <StatCard label="This Month Logged Time" value="00:00" highlight />
                <StatCard label="Last Week Logged Time" value="00:00" />
                <StatCard label="This Week Logged Time" value="00:00" />
            </div>

            <div className="flex items-center gap-4">
                <Link href="/dashboard/setup/staff">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">
                    {staff.firstName} {staff.lastName}
                    <span className="text-sm font-normal text-gray-500 ml-2">- Staff Member</span>
                </h1>
            </div>

            <Tabs defaultValue="staff" className="flex flex-col">
                <div className="bg-gray-100 p-1 rounded-md mb-6 w-full inline-flex">
                    <TabsList className="bg-transparent h-auto p-0 space-x-1 w-full justify-start">
                        <TabTrigger value="staff">Staff</TabTrigger>
                        <TabTrigger value="notes">Notes</TabTrigger>
                        <TabTrigger value="timesheets">Timesheets & Reports</TabTrigger>
                        <TabTrigger value="projects">Projects</TabTrigger>
                    </TabsList>
                </div>

                <TabsContent value="staff" className="m-0 bg-transparent border rounded-md shadow-sm overflow-hidden">
                    <StaffForm mode="edit" defaultValues={staff} staffId={staffId} />
                </TabsContent>

                <TabsContent value="notes" className="m-0 p-6 bg-white border rounded-md min-h-[400px]">
                    <p className="text-gray-500">Notes content placeholder</p>
                </TabsContent>
                <TabsContent value="timesheets" className="m-0 p-6 bg-white border rounded-md min-h-[400px]">
                    <p className="text-gray-500">Timesheets content placeholder</p>
                </TabsContent>
                <TabsContent value="projects" className="m-0 p-6 bg-white border rounded-md min-h-[400px]">
                    <p className="text-gray-500">Projects content placeholder</p>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function StatCard({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) {
    return (
        <Card className="shadow-sm">
            <CardContent className="p-4">
                <div className={`text-sm font-medium mb-1 ${highlight ? 'text-blue-600' : 'text-gray-500'}`}>
                    {label}
                </div>
                <div className="text-lg font-bold text-gray-900">
                    {value}
                </div>
            </CardContent>
        </Card>
    );
}

function TabTrigger({ value, children }: { value: string, children: React.ReactNode }) {
    return (
        <TabsTrigger
            value={value}
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-sm font-medium text-gray-600 data-[state=active]:text-gray-900 rounded-md transition-all"
        >
            {children}
        </TabsTrigger>
    )
}

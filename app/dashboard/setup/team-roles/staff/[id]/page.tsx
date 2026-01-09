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
                const docSnap = await getDoc(docRef);

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
            <div className="flex items-center gap-4">
                <Link href="/dashboard/setup/team-roles/staff">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">
                    {staff.firstName} {staff.lastName}
                    <span className="text-sm font-normal text-gray-500 ml-2">- Staff Member</span>
                </h1>
            </div>

            <StaffForm mode="edit" defaultValues={staff} staffId={staffId} />
        </div>
    );
}

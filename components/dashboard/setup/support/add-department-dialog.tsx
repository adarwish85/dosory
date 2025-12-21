"use client";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";

export function AddDepartmentDialog() {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [calendarId, setCalendarId] = useState("");
    const [saving, setSaving] = useState(false);
    const { profile } = useUserProfile();

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            setName("");
            setEmail("");
            setCalendarId("");
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Department name is required");
            return;
        }

        setSaving(true);
        try {
            await addDoc(collection(db, "supportDepartments"), {
                name: name.trim(),
                email: email.trim(),
                calendarId: calendarId.trim(),
                orgId: profile?.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile?.uid,
            });

            toast.success("Department created successfully!");
            handleOpenChange(false);
        } catch (error) {
            console.error("Error creating department:", error);
            toast.error("Failed to create department");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button className="bg-gray-900 text-white hover:bg-gray-800">
                    <Plus className="mr-2 h-4 w-4" /> New Department
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md bg-white p-0 flex flex-col">
                <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
                    <SheetTitle>Add New Department</SheetTitle>
                </SheetHeader>

                <div className="flex-1 p-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-red-500">* Name</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Technical Support, Sales"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Department Email</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="support@company.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Google Calendar ID</Label>
                            <Input
                                value={calendarId}
                                onChange={(e) => setCalendarId(e.target.value)}
                                placeholder="Optional calendar integration"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-white flex justify-end gap-2 flex-shrink-0">
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="bg-gray-900 text-white hover:bg-gray-800"
                        disabled={saving}
                    >
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

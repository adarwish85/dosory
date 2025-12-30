"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";

export function AddTaxDialog() {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [rate, setRate] = useState("");
    const [saving, setSaving] = useState(false);
    const { profile } = useUserProfile();

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            setName("");
            setRate("");
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Tax name is required");
            return;
        }
        if (!rate.trim()) {
            toast.error("Tax rate is required");
            return;
        }

        setSaving(true);
        try {
            await addDoc(collection(db, "taxes"), {
                name: name.trim(),
                rate: parseFloat(rate) || 0,
                orgId: profile?.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile?.uid,
            });

            toast.success("Tax created successfully!");
            handleOpenChange(false);
        } catch (error) {
            console.error("Error creating tax:", error);
            toast.error("Failed to create tax");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button className="bg-gray-900 text-white hover:bg-gray-800">
                    <Plus className="mr-2 h-4 w-4" /> New Tax
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md bg-white p-0 flex flex-col">
                <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
                    <SheetTitle>Add New Tax</SheetTitle>
                </SheetHeader>

                <div className="flex-1 p-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-red-500">* Tax Name</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. VAT"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-red-500">* Tax Rate (%)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={rate}
                                onChange={(e) => setRate(e.target.value)}
                                placeholder="e.g. 14"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-white flex justify-end gap-2 flex-shrink-0">
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} className="bg-gray-900 text-white hover:bg-gray-800" disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

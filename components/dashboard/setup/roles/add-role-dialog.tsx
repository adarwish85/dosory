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
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Plus, HelpCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";

type PermissionOption = {
    label: string;
    id: string;
    help?: boolean;
};

type PermissionModule = {
    label: string;
    options: PermissionOption[];
};

const permissionsData: PermissionModule[] = [
    { label: "Contracts", options: [{ label: "View", id: "view" }, { label: "Create", id: "create" }, { label: "Edit", id: "edit" }, { label: "Delete", id: "delete" }] },
    { label: "Credit Notes", options: [{ label: "View", id: "view" }, { label: "Create", id: "create" }, { label: "Edit", id: "edit" }, { label: "Delete", id: "delete" }] },
    { label: "Customers", options: [{ label: "View", id: "view" }, { label: "Create", id: "create" }, { label: "Edit", id: "edit" }, { label: "Delete", id: "delete" }] },
    { label: "Estimates", options: [{ label: "View", id: "view" }, { label: "Create", id: "create" }, { label: "Edit", id: "edit" }, { label: "Delete", id: "delete" }] },
    { label: "Expenses", options: [{ label: "View", id: "view" }, { label: "Create", id: "create" }, { label: "Edit", id: "edit" }, { label: "Delete", id: "delete" }] },
    { label: "Invoices", options: [{ label: "View", id: "view" }, { label: "Create", id: "create" }, { label: "Edit", id: "edit" }, { label: "Delete", id: "delete" }] },
    { label: "Projects", options: [{ label: "View", id: "view" }, { label: "Create", id: "create" }, { label: "Edit", id: "edit" }, { label: "Delete", id: "delete" }] },
    { label: "Tasks", options: [{ label: "View", id: "view" }, { label: "Create", id: "create" }, { label: "Edit", id: "edit" }, { label: "Delete", id: "delete" }] },
    { label: "Reports", options: [{ label: "View", id: "view" }] },
    { label: "Settings", options: [{ label: "View", id: "view" }, { label: "Edit", id: "edit" }] },
    { label: "Staff", options: [{ label: "View", id: "view" }, { label: "Create", id: "create" }, { label: "Edit", id: "edit" }, { label: "Delete", id: "delete" }] },
];

export function AddRoleDialog() {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [roleName, setRoleName] = useState("");
    const [permissions, setPermissions] = useState<string[]>([]);
    const { profile } = useUserProfile();

    const totalSteps = 2;

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            setTimeout(() => {
                setStep(1);
                setRoleName("");
                setPermissions([]);
            }, 300);
        }
    };

    const togglePermission = (perm: string) => {
        setPermissions(prev =>
            prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
        );
    };

    const nextStep = () => {
        if (!roleName.trim()) {
            toast.error("Role name is required");
            return;
        }
        setStep(prev => Math.min(prev + 1, totalSteps));
    };

    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const handleSave = async () => {
        if (!roleName.trim()) {
            toast.error("Role name is required");
            setStep(1);
            return;
        }

        setSaving(true);
        try {
            await addDoc(collection(db, "roles"), {
                name: roleName.trim(),
                permissions,
                orgId: profile?.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile?.uid,
            });

            toast.success("Role created successfully!");
            handleOpenChange(false);
        } catch (error) {
            console.error("Error creating role:", error);
            toast.error("Failed to create role");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button className="bg-gray-900 text-white hover:bg-gray-800">
                    <Plus className="mr-2 h-4 w-4" /> New Role
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xl bg-white p-0 flex flex-col">
                <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <SheetTitle>Add New Role</SheetTitle>
                        <span className="text-sm text-gray-500">Step {step} of {totalSteps}</span>
                    </div>
                </SheetHeader>

                <div className="flex-1 p-6 overflow-hidden">
                    {step === 1 && (
                        <div className="space-y-5">
                            <h3 className="font-semibold text-gray-900">Role Information</h3>
                            <div className="space-y-2">
                                <Label className="text-red-500">* Role Name</Label>
                                <Input
                                    value={roleName}
                                    onChange={(e) => setRoleName(e.target.value)}
                                    placeholder="e.g. Project Manager"
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 h-full overflow-y-auto">
                            <h3 className="font-semibold text-gray-900">Permissions</h3>
                            <div className="space-y-4">
                                {permissionsData.map((module) => (
                                    <div key={module.label} className="border rounded-lg p-3">
                                        <h4 className="font-medium text-gray-900 mb-2">{module.label}</h4>
                                        <div className="flex flex-wrap gap-3">
                                            {module.options.map((opt) => {
                                                const permId = `${module.label.toLowerCase().replace(/\s/g, "-")}-${opt.id}`;
                                                return (
                                                    <div key={permId} className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={permId}
                                                            checked={permissions.includes(permId)}
                                                            onCheckedChange={() => togglePermission(permId)}
                                                            className="h-4 w-4"
                                                        />
                                                        <Label htmlFor={permId} className="font-normal text-gray-700 text-sm cursor-pointer">
                                                            {opt.label}
                                                        </Label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-white flex justify-between items-center flex-shrink-0">
                    <div>
                        {step > 1 && (
                            <Button variant="outline" onClick={prevStep} className="gap-1">
                                <ChevronLeft className="h-4 w-4" /> Back
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleOpenChange(false)}>
                            Cancel
                        </Button>
                        {step < totalSteps ? (
                            <Button onClick={nextStep} className="bg-gray-900 text-white hover:bg-gray-800 gap-1">
                                Next <ChevronRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSave}
                                className="bg-gray-900 text-white hover:bg-gray-800"
                                disabled={saving}
                            >
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Role
                            </Button>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

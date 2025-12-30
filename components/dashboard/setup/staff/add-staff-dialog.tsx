"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useRef } from "react";
import { Plus, Eye, RefreshCw, ChevronLeft, ChevronRight, Loader2, Camera, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";

interface StaffFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    hourlyRate: string;
    isAdmin: boolean;
    isNotStaff: boolean;
    departments: string[];
    image: string;
    roleId: string;
    permissions: string[];
}

const defaultFormData: StaffFormData = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    hourlyRate: "0",
    isAdmin: false,
    isNotStaff: false,
    departments: [],
    image: "",
    roleId: "employee",
    permissions: [],
};

export function AddStaffDialog() {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [password, setPassword] = useState("");
    const [formData, setFormData] = useState<StaffFormData>(defaultFormData);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { profile } = useUserProfile();

    const totalSteps = 2;

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            setTimeout(() => {
                setStep(1);
                setFormData(defaultFormData);
                setPassword("");
            }, 300);
        }
    };

    const updateField = (field: keyof StaffFormData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const toggleDepartment = (dept: string) => {
        setFormData((prev) => ({
            ...prev,
            departments: prev.departments.includes(dept)
                ? prev.departments.filter((d) => d !== dept)
                : [...prev.departments, dept],
        }));
    };

    const togglePermission = (perm: string) => {
        setFormData((prev) => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter((p) => p !== perm)
                : [...prev.permissions, perm],
        }));
    };

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        setUploading(true);
        try {
            const fileRef = ref(storage, `staff-photos/${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(fileRef);
            updateField("image", downloadURL);
            toast.success("Photo uploaded");
        } catch (error) {
            console.error("Error uploading photo:", error);
            toast.error("Failed to upload photo");
        } finally {
            setUploading(false);
        }
    };

    const validateStep = (currentStep: number): boolean => {
        if (currentStep === 1) {
            if (!formData.firstName.trim()) {
                toast.error("First name is required");
                return false;
            }
            if (!formData.lastName.trim()) {
                toast.error("Last name is required");
                return false;
            }
            if (!formData.email.trim()) {
                toast.error("Email is required");
                return false;
            }
            if (!password.trim()) {
                toast.error("Password is required");
                return false;
            }
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep((prev) => Math.min(prev + 1, totalSteps));
        }
    };

    const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

    const handleSave = async () => {
        if (!validateStep(1)) {
            setStep(1);
            return;
        }

        if (!password || password.length < 6) {
            toast.error("Password must be at least 6 characters");
            setStep(1);
            return;
        }

        setSaving(true);
        try {
            const response = await fetch("/api/admin/create-staff", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phone,
                    hourlyRate: parseFloat(formData.hourlyRate) || 0,
                    isAdmin: formData.isAdmin,
                    isNotStaff: formData.isNotStaff,
                    departmentIds: formData.departments,
                    profileImageUrl: formData.image,
                    roleId: formData.roleId,
                    permissions: formData.permissions,
                    orgId: profile?.orgId,
                    createdBy: profile?.uid,
                    sendWelcomeEmail: true,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create staff member");
            }

            if (data.emailSent) {
                toast.success("Staff member created and welcome email sent!");
            } else {
                toast.success("Staff member created successfully!");
            }
            handleOpenChange(false);
        } catch (error: any) {
            console.error("Error creating staff:", error);
            toast.error(error.message || "Failed to create staff member");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button className="bg-gray-900 text-white hover:bg-gray-800">
                    <Plus className="mr-2 h-4 w-4" /> New Staff Member
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xl bg-white p-0 flex flex-col">
                <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
                    <SheetTitle>Add New Staff Member</SheetTitle>
                </SheetHeader>

                {/* Step Indicator */}
                <div className="px-6 py-3 border-b bg-gray-50 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                            Step {step} of {totalSteps}
                        </span>
                    </div>
                    <div className="flex gap-1">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-1 flex-1 rounded-full ${i + 1 <= step ? "bg-gray-900" : "bg-gray-200"}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex-1 px-6 py-4">
                    {step === 1 && (
                        <div className="space-y-3">
                            <div className="flex items-start gap-4">
                                {/* Photo Upload - Compact */}
                                <div className="relative group shrink-0">
                                    {formData.image && (
                                        <button
                                            onClick={() => updateField("image", "")}
                                            className="absolute -top-1 -right-1 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow-md"
                                        >
                                            <X className="h-2.5 w-2.5" />
                                        </button>
                                    )}
                                    <div
                                        className="relative cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Avatar className="h-14 w-14 border-2 border-white shadow">
                                            <AvatarImage src={formData.image} />
                                            <AvatarFallback className="text-lg bg-gray-200">
                                                {formData.firstName?.charAt(0) || "+"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            {uploading ? (
                                                <Loader2 className="h-4 w-4 text-white animate-spin" />
                                            ) : (
                                                <Camera className="h-4 w-4 text-white" />
                                            )}
                                        </div>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handlePhotoUpload}
                                        disabled={uploading}
                                    />
                                </div>

                                {/* Role Checkboxes - Next to photo */}
                                <div className="flex items-center gap-4 pt-4">
                                    <div className="flex items-center gap-1.5">
                                        <Checkbox
                                            id="admin"
                                            checked={formData.isAdmin}
                                            onCheckedChange={(checked) => updateField("isAdmin", !!checked)}
                                        />
                                        <Label htmlFor="admin" className="font-normal text-gray-600 text-xs">
                                            Administrator
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Checkbox
                                            id="not-staff"
                                            checked={formData.isNotStaff}
                                            onCheckedChange={(checked) => updateField("isNotStaff", !!checked)}
                                        />
                                        <Label htmlFor="not-staff" className="font-normal text-gray-600 text-xs">
                                            Not Staff Member
                                        </Label>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-0.5">
                                    <Label className="text-red-500 text-xs">* First Name</Label>
                                    <Input
                                        value={formData.firstName}
                                        onChange={(e) => updateField("firstName", e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <Label className="text-red-500 text-xs">* Last Name</Label>
                                    <Input
                                        value={formData.lastName}
                                        onChange={(e) => updateField("lastName", e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-0.5">
                                    <Label className="text-red-500 text-xs">* Email</Label>
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => updateField("email", e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <Label className="text-xs">Phone</Label>
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => updateField("phone", e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-0.5">
                                    <Label className="text-xs">Hourly Rate (EGP)</Label>
                                    <Input
                                        type="number"
                                        value={formData.hourlyRate}
                                        onChange={(e) => updateField("hourlyRate", e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <Label className="text-red-500 text-xs">* Password</Label>
                                    <div className="flex gap-1">
                                        <div className="relative flex-1">
                                            <Input
                                                type={passwordVisible ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="h-8 text-sm pr-8"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-0 top-0 h-8 w-8 text-gray-500 hover:text-gray-700"
                                                onClick={() => setPasswordVisible(!passwordVisible)}
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="shrink-0 h-8 w-8"
                                            title="Generate"
                                        >
                                            <RefreshCw className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-3">
                            <div className="space-y-0.5">
                                <Label className="text-xs">Role</Label>
                                <Select value={formData.roleId} onValueChange={(value) => updateField("roleId", value)}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="employee">Employee</SelectItem>
                                        <SelectItem value="pm">Project Manager</SelectItem>
                                        <SelectItem value="admin">Administrator</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Permissions</Label>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    {[
                                        { id: "customers-view", label: "View Customers" },
                                        { id: "customers-create", label: "Create Customers" },
                                        { id: "customers-edit", label: "Edit Customers" },
                                        { id: "customers-delete", label: "Delete Customers" },
                                        { id: "invoices-view", label: "View Invoices" },
                                        { id: "invoices-create", label: "Create Invoices" },
                                        { id: "invoices-edit", label: "Edit Invoices" },
                                        { id: "invoices-delete", label: "Delete Invoices" },
                                        { id: "projects-view", label: "View Projects" },
                                        { id: "projects-create", label: "Create Projects" },
                                        { id: "projects-edit", label: "Edit Projects" },
                                        { id: "projects-delete", label: "Delete Projects" },
                                        { id: "expenses-view", label: "View Expenses" },
                                        { id: "expenses-create", label: "Create Expenses" },
                                        { id: "reports-view", label: "View Reports" },
                                        { id: "settings-view", label: "View Settings" },
                                    ].map((perm) => (
                                        <div key={perm.id} className="flex items-center gap-1.5">
                                            <Checkbox
                                                id={perm.id}
                                                checked={formData.permissions.includes(perm.id)}
                                                onCheckedChange={() => togglePermission(perm.id)}
                                                className="h-3.5 w-3.5"
                                            />
                                            <Label
                                                htmlFor={perm.id}
                                                className="font-normal text-gray-700 text-xs cursor-pointer"
                                            >
                                                {perm.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 pt-2 border-t">
                                <Checkbox id="welcome-email" defaultChecked className="h-3.5 w-3.5" />
                                <Label htmlFor="welcome-email" className="font-medium text-gray-900 text-xs">
                                    Send welcome email
                                </Label>
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
                                Create Staff
                            </Button>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

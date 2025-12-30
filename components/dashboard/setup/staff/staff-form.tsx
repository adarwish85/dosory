"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
import { Eye, RefreshCw, HelpCircle, Loader2, Camera, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";

interface StaffFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    hourlyRate: string;
    facebook: string;
    linkedin: string;
    skype: string;
    signature: string;
    defaultLanguage: string;
    direction: string;
    isAdmin: boolean;
    isNotStaff: boolean;
    departments: string[];
    image: string;
}

interface StaffFormProps {
    mode: "create" | "edit";
    defaultValues?: any;
    staffId?: string;
    onCancel?: () => void;
}

export function StaffForm({ mode, defaultValues, staffId, onCancel }: StaffFormProps) {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState<StaffFormData>({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        hourlyRate: "0.00",
        facebook: "",
        linkedin: "",
        skype: "",
        signature: "",
        defaultLanguage: "system",
        direction: "system",
        isAdmin: false,
        isNotStaff: false,
        departments: [],
        image: "",
    });

    // Initialize form with defaultValues when they change
    useEffect(() => {
        if (defaultValues) {
            setFormData({
                firstName: defaultValues.firstName || "",
                lastName: defaultValues.lastName || "",
                email: defaultValues.email || "",
                phone: defaultValues.phone || "",
                hourlyRate: defaultValues.hourlyRate?.toString() || "0.00",
                facebook: defaultValues.facebook || "",
                linkedin: defaultValues.linkedin || "",
                skype: defaultValues.skype || "",
                signature: defaultValues.signature || "",
                defaultLanguage: defaultValues.defaultLanguage || "system",
                direction: defaultValues.direction || "system",
                isAdmin: defaultValues.isAdmin || false,
                isNotStaff: defaultValues.isNotStaff || false,
                departments: defaultValues.departments || [],
                image: defaultValues.image || "",
            });
        }
    }, [defaultValues]);

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        setUploading(true);
        try {
            const fileRef = ref(storage, `staff-photos/${staffId || Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(fileRef);

            setFormData((prev) => ({ ...prev, image: downloadURL }));
            toast.success("Photo uploaded successfully");
        } catch (error) {
            console.error("Error uploading photo:", error);
            toast.error("Failed to upload photo");
        } finally {
            setUploading(false);
        }
    };

    const handleRemovePhoto = async () => {
        if (!formData.image) return;

        try {
            // Try to delete from storage if it's a Firebase Storage URL
            if (formData.image.includes("firebase")) {
                const fileRef = ref(storage, formData.image);
                await deleteObject(fileRef).catch(() => {
                    // Ignore errors if file doesn't exist
                });
            }
            setFormData((prev) => ({ ...prev, image: "" }));
            toast.success("Photo removed");
        } catch (error) {
            console.error("Error removing photo:", error);
            setFormData((prev) => ({ ...prev, image: "" }));
        }
    };

    const handleSave = async () => {
        if (!formData.firstName.trim()) {
            toast.error("First name is required");
            return;
        }
        if (!formData.lastName.trim()) {
            toast.error("Last name is required");
            return;
        }
        if (!formData.email.trim()) {
            toast.error("Email is required");
            return;
        }

        setSaving(true);
        try {
            const { doc, updateDoc, addDoc, collection, serverTimestamp } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");

            const staffData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                hourlyRate: parseFloat(formData.hourlyRate) || 0,
                facebook: formData.facebook,
                linkedin: formData.linkedin,
                skype: formData.skype,
                signature: formData.signature,
                defaultLanguage: formData.defaultLanguage,
                direction: formData.direction,
                isAdmin: formData.isAdmin,
                isNotStaff: formData.isNotStaff,
                departments: formData.departments,
                image: formData.image,
                updatedAt: serverTimestamp(),
            };

            if (mode === "edit" && staffId) {
                const docRef = doc(db, "staff", staffId);
                await updateDoc(docRef, staffData);
                toast.success("Staff member updated successfully!");
            } else {
                await addDoc(collection(db, "staff"), {
                    ...staffData,
                    createdAt: serverTimestamp(),
                });
                toast.success("Staff member created successfully!");
                onCancel?.();
            }
        } catch (error) {
            console.error("Error saving staff:", error);
            toast.error(mode === "edit" ? "Failed to update staff member" : "Failed to create staff member");
        } finally {
            setSaving(false);
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

    return (
        <Tabs defaultValue="profile" className="flex flex-col flex-1">
            <div className="border-b bg-white px-6">
                <TabsList className="bg-transparent h-auto p-0 space-x-6">
                    <TabsTrigger
                        value="profile"
                        className="bg-transparent border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:shadow-none rounded-none px-0 py-3 text-gray-500 data-[state=active]:text-gray-900 font-medium"
                    >
                        Profile
                    </TabsTrigger>
                    <TabsTrigger
                        value="permissions"
                        className="bg-transparent border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:shadow-none rounded-none px-0 py-3 text-gray-500 data-[state=active]:text-gray-900 font-medium"
                    >
                        Permissions
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="flex-1 bg-gray-50/50 p-6">
                <TabsContent value="profile" className="m-0 space-y-6 max-w-full">
                    <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
                        <div className="flex flex-wrap gap-6 justify-between items-start">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="admin"
                                        checked={formData.isAdmin}
                                        onCheckedChange={(checked) => updateField("isAdmin", !!checked)}
                                    />
                                    <Label htmlFor="admin" className="font-normal text-gray-600">
                                        Administrator
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="not-staff"
                                        checked={formData.isNotStaff}
                                        onCheckedChange={(checked) => updateField("isNotStaff", !!checked)}
                                    />
                                    <Label htmlFor="not-staff" className="font-normal text-gray-600">
                                        Not Staff Member
                                    </Label>
                                </div>
                            </div>

                            {/* Profile Photo Section - Compact */}
                            <div className="flex items-center gap-4">
                                <div className="relative group">
                                    {formData.image && (
                                        <button
                                            onClick={handleRemovePhoto}
                                            className="absolute -top-1 -right-1 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow-md transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                    <div
                                        className="relative cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Avatar className="h-20 w-20 border-2 border-white shadow-md">
                                            <AvatarImage src={formData.image} />
                                            <AvatarFallback className="text-2xl bg-gray-200">
                                                {formData.firstName?.charAt(0) || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            {uploading ? (
                                                <Loader2 className="h-6 w-6 text-white animate-spin" />
                                            ) : (
                                                <Camera className="h-6 w-6 text-white" />
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
                                {mode === "create" && !formData.image && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                    >
                                        Upload Photo
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-red-500">* First Name</Label>
                                <Input
                                    required
                                    className="focus-visible:ring-blue-600 border-blue-200"
                                    value={formData.firstName}
                                    onChange={(e) => updateField("firstName", e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-red-500">* Last Name</Label>
                                <Input
                                    required
                                    value={formData.lastName}
                                    onChange={(e) => updateField("lastName", e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-red-500">* Email</Label>
                                <Input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => updateField("email", e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <Label>Hourly Rate</Label>
                                <div className="relative">
                                    <Input
                                        value={formData.hourlyRate}
                                        type="number"
                                        step="0.01"
                                        onChange={(e) => updateField("hourlyRate", e.target.value)}
                                    />
                                    <span className="absolute right-3 top-2.5 text-sm text-gray-500">EGP</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Default Language</Label>
                                <Select
                                    value={formData.defaultLanguage}
                                    onValueChange={(value) => updateField("defaultLanguage", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="System Default" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="system">System Default</SelectItem>
                                        <SelectItem value="en">English</SelectItem>
                                        <SelectItem value="ar">Arabic</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Direction</Label>
                                <Select
                                    value={formData.direction}
                                    onValueChange={(value) => updateField("direction", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="System Default" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="system">System Default</SelectItem>
                                        <SelectItem value="ltr">LTR</SelectItem>
                                        <SelectItem value="rtl">RTL</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">Skype</Label>
                                <Input value={formData.skype} onChange={(e) => updateField("skype", e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">Facebook</Label>
                                <Input
                                    value={formData.facebook}
                                    onChange={(e) => updateField("facebook", e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">LinkedIn</Label>
                                <Input
                                    value={formData.linkedin}
                                    onChange={(e) => updateField("linkedin", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                                <HelpCircle className="h-3 w-3 text-gray-500" /> Email Signature
                            </Label>
                            <Textarea
                                className="min-h-[100px]"
                                value={formData.signature}
                                onChange={(e) => updateField("signature", e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Member departments</Label>
                            <div className="flex flex-wrap gap-4 mt-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="dept-tech"
                                        checked={formData.departments.includes("tech")}
                                        onCheckedChange={() => toggleDepartment("tech")}
                                    />
                                    <Label htmlFor="dept-tech" className="font-normal text-gray-700">
                                        Technical Support
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="dept-dev"
                                        checked={formData.departments.includes("dev")}
                                        onCheckedChange={() => toggleDepartment("dev")}
                                    />
                                    <Label htmlFor="dept-dev" className="font-normal text-gray-700">
                                        Development
                                    </Label>
                                </div>
                            </div>
                        </div>

                        {mode === "create" && (
                            <div className="flex items-center gap-2 pt-2">
                                <Checkbox id="welcome-email" defaultChecked />
                                <Label htmlFor="welcome-email" className="font-medium text-gray-900">
                                    Send welcome email
                                </Label>
                            </div>
                        )}

                        <div className="space-y-2 pt-4 border-t border-dashed">
                            <Label className="text-red-500">* Password</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input type={passwordVisible ? "text" : "password"} required={mode === "create"} />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-gray-700"
                                        onClick={() => setPasswordVisible(!passwordVisible)}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Button variant="outline" size="icon" className="shrink-0" title="Generate Password">
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                            {mode === "edit" && (
                                <p className="text-xs text-gray-500">
                                    Note: if you populate this field, password will be changed on this member.
                                </p>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="permissions" className="m-0 space-y-6 max-w-full">
                    <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select defaultValue="employee">
                                <SelectTrigger>
                                    <SelectValue placeholder="Employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="employee">Employee</SelectItem>
                                    <SelectItem value="pm">Project Manager</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Permissions</h3>

                            <div className="border rounded-md overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 border-b border-r w-1/3">Features</th>
                                            <th className="px-4 py-3 border-b">Capabilities</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        <PermissionRow
                                            label="Bulk PDF Export"
                                            options={[{ label: "View(Global)", id: "bulk-view" }]}
                                        />
                                        <PermissionRow
                                            label="Contracts"
                                            options={[
                                                { label: "View (Own)", id: "contracts-view-own" },
                                                { label: "View(Global)", id: "contracts-view-global" },
                                                { label: "Create", id: "contracts-create" },
                                                { label: "Edit", id: "contracts-edit" },
                                                { label: "Delete", id: "contracts-delete" },
                                                { label: "View All Templates", id: "contracts-templates" },
                                            ]}
                                        />
                                        <PermissionRow
                                            label="Credit Notes"
                                            options={[
                                                { label: "View (Own)", id: "cn-view-own" },
                                                { label: "View(Global)", id: "cn-view-global" },
                                                { label: "Create", id: "cn-create" },
                                                { label: "Edit", id: "cn-edit" },
                                                { label: "Delete", id: "cn-delete" },
                                            ]}
                                        />
                                        <PermissionRow
                                            label="Customers"
                                            options={[
                                                { label: "View (Own)", id: "customers-view-own", help: true },
                                                { label: "View(Global)", id: "customers-view-global" },
                                                { label: "Create", id: "customers-create" },
                                                { label: "Edit", id: "customers-edit" },
                                                { label: "Delete", id: "customers-delete" },
                                            ]}
                                        />
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <div className="flex justify-end gap-2 pt-6">
                    {onCancel && (
                        <Button variant="outline" onClick={onCancel}>
                            Close
                        </Button>
                    )}
                    <Button
                        className="bg-gray-900 text-white hover:bg-gray-800"
                        onClick={handleSave}
                        disabled={saving || uploading}
                    >
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </div>
            </div>
        </Tabs>
    );
}

function PermissionRow({
    label,
    options,
}: {
    label: string;
    options: { label: string; id: string; help?: boolean }[];
}) {
    return (
        <tr className="hover:bg-gray-50/50">
            <td className="px-4 py-3 font-medium text-gray-900 border-r align-top bg-white">{label}</td>
            <td className="px-4 py-3 bg-white">
                <div className="space-y-2">
                    {options.map((opt) => (
                        <div key={opt.id} className="flex items-center gap-2">
                            <Checkbox id={opt.id} className="h-4 w-4" />
                            <Label
                                htmlFor={opt.id}
                                className="font-normal text-gray-700 cursor-pointer flex items-center gap-1"
                            >
                                {opt.label}
                                {opt.help && <HelpCircle className="h-3 w-3 text-gray-400" />}
                            </Label>
                        </div>
                    ))}
                </div>
            </td>
        </tr>
    );
}

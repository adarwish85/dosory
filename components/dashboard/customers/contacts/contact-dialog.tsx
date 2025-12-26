import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, Eye, EyeOff, RefreshCw, Send, Lock, Shield } from "lucide-react";
import { useContacts } from "@/lib/hooks/use-customers";
import { toast } from "sonner";
import { setContactAuthPassword } from "@/app/actions/contact-auth";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface ContactFormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
    direction: string;
    isPrimary: boolean;
    portalAccess: boolean;
    permissions: {
        invoices: boolean;
        estimates: boolean;
        contracts: boolean;
        proposals: boolean;
        support: boolean;
        projects: boolean;
    };
    notifications: {
        invoice: boolean;
        estimate: boolean;
        creditNote: boolean;
        project: boolean;
        tickets: boolean;
        contract: boolean;
        task: boolean;
    };
    password?: string;
}

const defaultFormData: ContactFormData = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
    direction: "default",
    isPrimary: false,
    portalAccess: false,
    permissions: {
        invoices: true,
        estimates: true,
        contracts: true,
        proposals: true,
        support: true,
        projects: true,
    },
    notifications: {
        invoice: true,
        estimate: true,
        creditNote: true,
        project: true,
        tickets: true,
        contract: true,
        task: true,
    },
    password: "",
};

export function ContactDialog({
    children,
    customerId,
    customerName,
    contact,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    onSuccess,
    initialStep = 1
}: {
    children?: React.ReactNode;
    customerId?: string;
    customerName?: string;
    contact?: any;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
    initialStep?: number;
}) {
    const [step, setStep] = useState(initialStep);
    const [internalOpen, setInternalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [sendingReset, setSendingReset] = useState(false);

    // Initialize form data with correct permissions mapping
    const getInitialFormData = (): ContactFormData => {
        if (!contact) return defaultFormData;

        let initialPermissions = { ...defaultFormData.permissions };

        // Handle array of strings from DB
        if (Array.isArray(contact.permissions)) {
            // Reset all to false first, since the array only contains enabled permissions
            Object.keys(initialPermissions).forEach(key => {
                (initialPermissions as any)[key] = false;
            });
            // Enable only the ones present in the array
            contact.permissions.forEach((perm: string) => {
                if (perm in initialPermissions) {
                    (initialPermissions as any)[perm] = true;
                }
            });
        } else if (contact.permissions && typeof contact.permissions === 'object') {
            // Handle legacy object format if needed
            initialPermissions = { ...initialPermissions, ...contact.permissions };
        }

        return {
            ...defaultFormData,
            firstName: contact.firstName || "",
            lastName: contact.lastName || "",
            email: contact.email || "",
            phone: contact.phone || "",
            position: contact.position || "",
            direction: contact.direction || "default",
            isPrimary: contact.isPrimary || false,
            portalAccess: contact.portalAccess || false,
            permissions: initialPermissions,
            notifications: contact.notifications || defaultFormData.notifications,
            password: "",
        };
    };

    const [formData, setFormData] = useState<ContactFormData>(getInitialFormData());

    const { createContact, updateContact } = useContacts({ customerId });
    const totalSteps = 3; // Info -> Permissions & Portal Access -> Notifications
    const isEditing = !!contact?.id;

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = controlledOnOpenChange || setInternalOpen;

    const nextStep = () => setStep((prev) => Math.min(prev + 1, totalSteps));
    const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (newOpen) {
            // Re-initialize data and step when opening
            setFormData(getInitialFormData());
            setStep(initialStep);
        } else {
            // Reset state slightly delayed for animation
            setTimeout(() => {
                setStep(initialStep);
                setShowPassword(false);
                if (!contact) {
                    setFormData(defaultFormData);
                }
            }, 300);
        }
    };

    const handleSave = useCallback(async () => {
        if (!formData.firstName.trim()) {
            toast.error("First name is required");
            setStep(1);
            return;
        }
        if (!formData.lastName.trim()) {
            toast.error("Last name is required");
            setStep(1);
            return;
        }
        if (!formData.email.trim()) {
            toast.error("Email is required");
            setStep(1);
            return;
        }
        if (!customerId) {
            toast.error("Customer ID is required");
            return;
        }

        setSaving(true);
        try {
            // Convert permissions object to array of enabled permissions
            const permissionsArray = Object.entries(formData.permissions)
                .filter(([_, enabled]) => enabled)
                .map(([key]) => key) as ("invoices" | "estimates" | "contracts" | "proposals" | "support" | "projects")[];

            const contactData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone || undefined,
                position: formData.position || undefined,
                direction: formData.direction,
                isPrimary: formData.isPrimary,
                portalAccess: formData.portalAccess,
                permissions: permissionsArray,
                notifications: formData.notifications,
                status: "active" as const,
                customerId,
            };

            if (isEditing) {
                await updateContact(contact.id, contactData);
                toast.success("Contact updated successfully");
            } else {
                await createContact(contactData);
                toast.success("Contact created successfully");
            }

            // Handle Password Setting (only if portal access is enabled)
            if (formData.portalAccess && formData.password) {
                const result = await setContactAuthPassword(formData.email, formData.password, `${formData.firstName} ${formData.lastName}`);
                if (result.success) {
                    toast.success(result.action === "created" ? "Auth user created with password" : "Password updated successfully");
                } else {
                    toast.error(`Failed to set password: ${result.error}`);
                }
            }

            handleOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error("Error saving contact:", error);
            toast.error(isEditing ? "Failed to update contact" : "Failed to create contact");
        } finally {
            setSaving(false);
        }
    }, [formData, customerId, isEditing, contact?.id, createContact, updateContact, onSuccess]);

    const updatePermission = (key: keyof ContactFormData["permissions"], value: boolean) => {
        setFormData(prev => ({
            ...prev,
            permissions: { ...prev.permissions, [key]: value }
        }));
    };

    const updateNotification = (key: keyof ContactFormData["notifications"], value: boolean) => {
        setFormData(prev => ({
            ...prev,
            notifications: { ...prev.notifications, [key]: value }
        }));
    };

    const handleGeneratePassword = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let pass = "";
        for (let i = 0; i < 12; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, password: pass }));
        setShowPassword(true);
    };

    const handleSendResetEmail = async () => {
        if (!formData.email) {
            toast.error("Please enter an email address first");
            return;
        }
        setSendingReset(true);
        try {
            await sendPasswordResetEmail(auth, formData.email);
            toast.success(`Password reset email sent to ${formData.email}`);
        } catch (error: any) {
            console.error("Error sending reset email:", error);
            toast.error(error.message || "Failed to send reset email");
        } finally {
            setSendingReset(false);
        }
    };

    // Display name for header
    const displayName = isEditing
        ? `${formData.firstName || contact?.firstName || ""} ${formData.lastName || contact?.lastName || ""}`.trim() || "Edit Contact"
        : formData.firstName
            ? `${formData.firstName} ${formData.lastName}`.trim()
            : "New Contact";

    return (
        <Sheet open={isOpen} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                {children || (
                    <Button className="bg-gray-900 text-white hover:bg-gray-800">
                        <Plus className="mr-2 h-4 w-4" />
                        New Contact
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xl bg-white p-0 flex flex-col">
                <SheetHeader className="p-6 pb-4 border-b bg-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <SheetTitle className="text-xl font-bold">
                                {displayName}
                            </SheetTitle>
                            {customerName && <p className="text-sm text-muted-foreground mt-1">{customerName}</p>}
                        </div>
                        <span className="text-xs font-normal text-muted-foreground bg-gray-100 px-2 py-1 rounded-full">
                            Step {step} of {totalSteps}
                        </span>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 bg-white">
                    {/* STEP 1: Basic Info */}
                    {step === 1 && (
                        <div className="space-y-5">
                            {/* Profile Image */}
                            <div className="space-y-2">
                                <Label>Profile image</Label>
                                <div className="flex w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                                    <Button variant="secondary" size="sm" className="h-6 text-xs">Choose File</Button>
                                    <span className="text-muted-foreground">No file chosen</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fname" className="text-red-500 font-semibold">* <span className="text-gray-700">First Name</span></Label>
                                    <Input
                                        id="fname"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lname" className="text-red-500 font-semibold">* <span className="text-gray-700">Last Name</span></Label>
                                    <Input
                                        id="lname"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="position">Position</Label>
                                <Input
                                    id="position"
                                    value={formData.position}
                                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-red-500 font-semibold">* <span className="text-gray-700">Email</span></Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Direction</Label>
                                <Select
                                    value={formData.direction}
                                    onValueChange={(value) => setFormData({ ...formData, direction: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="System Default" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">System Default</SelectItem>
                                        <SelectItem value="ltr">LTR</SelectItem>
                                        <SelectItem value="rtl">RTL</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 pt-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="primary"
                                        checked={formData.isPrimary}
                                        onCheckedChange={(checked) => setFormData({ ...formData, isPrimary: !!checked })}
                                    />
                                    <label htmlFor="primary" className="text-sm font-medium leading-none">Primary Contact</label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Portal Access, Permissions & Password */}
                    {step === 2 && (
                        <div className="space-y-6">
                            {/* Portal Access Toggle */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg text-gray-900 border-b pb-2 flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-blue-600" />
                                    Portal Access
                                </h3>
                                <div className="flex items-center justify-between p-4 border rounded-md bg-blue-50/50">
                                    <div>
                                        <span className="font-medium text-gray-900">Enable Portal Access</span>
                                        <p className="text-xs text-gray-500 mt-0.5">Allow this contact to log in to the client portal</p>
                                    </div>
                                    <Switch
                                        className="data-[state=checked]:bg-blue-600"
                                        checked={formData.portalAccess}
                                        onCheckedChange={(checked) => setFormData({ ...formData, portalAccess: checked })}
                                    />
                                </div>
                            </div>

                            {/* Permissions (using Checkboxes) */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Module Permissions</h3>
                                <p className="text-sm text-gray-500">Select which modules this contact can access in the portal</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {(["invoices", "estimates", "contracts", "proposals", "support", "projects"] as const).map(perm => (
                                        <div key={perm} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`perm-${perm}`}
                                                checked={formData.permissions[perm]}
                                                onCheckedChange={(checked) => updatePermission(perm, !!checked)}
                                                disabled={!formData.portalAccess}
                                            />
                                            <label
                                                htmlFor={`perm-${perm}`}
                                                className={`text-sm font-medium capitalize ${!formData.portalAccess ? 'text-gray-400' : 'text-gray-700'}`}
                                            >
                                                {perm}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Password Section (only shown if portal access enabled) */}
                            {formData.portalAccess && (
                                <div className="space-y-3 border-t pt-4">
                                    <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Portal Password</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label>Password</Label>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs text-blue-600"
                                                onClick={handleGeneratePassword}
                                            >
                                                <RefreshCw className="w-3 h-3 mr-1" />
                                                Generate
                                            </Button>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    placeholder="Set password manually"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Leave empty to keep current password. Populate to set/change password.
                                        </p>
                                    </div>

                                    <div className="pt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full sm:w-auto"
                                            onClick={handleSendResetEmail}
                                            disabled={sendingReset || !formData.email}
                                        >
                                            {sendingReset ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4 mr-2" />
                                            )}
                                            Send Reset Password Email
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: Notifications */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Email Notifications</h3>
                            <p className="text-sm text-gray-500">Select which email notifications this contact should receive</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {([
                                    { key: "invoice", label: "Invoice" },
                                    { key: "estimate", label: "Estimate" },
                                    { key: "creditNote", label: "Credit Note" },
                                    { key: "project", label: "Project" },
                                    { key: "tickets", label: "Tickets" },
                                    { key: "contract", label: "Contract" },
                                    { key: "task", label: "Task" }
                                ] as const).map(({ key, label }) => (
                                    <div key={key} className="flex items-center justify-between p-3 border rounded-md bg-gray-50/50">
                                        <span className="text-sm font-medium text-gray-700">{label}</span>
                                        <Switch
                                            className="data-[state=checked]:bg-blue-600"
                                            checked={formData.notifications[key]}
                                            onCheckedChange={(checked) => updateNotification(key, checked)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <SheetFooter className="p-6 border-t bg-white flex justify-between sm:justify-between items-center w-full">
                    {step > 1 ? (
                        <Button variant="outline" onClick={prevStep} disabled={saving}>Previous</Button>
                    ) : (
                        <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>Close</Button>
                    )}

                    {step < totalSteps ? (
                        <Button className="bg-gray-900 text-white hover:bg-gray-800" onClick={nextStep}>Next</Button>
                    ) : (
                        <Button
                            className="bg-gray-900 text-white hover:bg-gray-800"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditing ? "Update" : "Save"}
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

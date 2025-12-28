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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { Plus, Pen, Loader2, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useRoles } from "@/lib/hooks";
import type { Role } from "@/lib/types";

// Permission modules and their available actions
const PERMISSION_MODULES = [
    { id: "contracts", label: "Contracts", actions: ["view", "create", "edit", "delete"] },
    { id: "credit-notes", label: "Credit Notes", actions: ["view", "create", "edit", "delete"] },
    { id: "customers", label: "Customers", actions: ["view", "create", "edit", "delete"] },
    { id: "estimates", label: "Estimates", actions: ["view", "create", "edit", "delete"] },
    { id: "expenses", label: "Expenses", actions: ["view", "create", "edit", "delete"] },
    { id: "invoices", label: "Invoices", actions: ["view", "create", "edit", "delete"] },
    { id: "leads", label: "Leads", actions: ["view", "create", "edit", "delete"] },
    { id: "projects", label: "Projects", actions: ["view", "create", "edit", "delete"] },
    { id: "tasks", label: "Tasks", actions: ["view", "create", "edit", "delete"] },
    { id: "reports", label: "Reports", actions: ["view"] },
    { id: "settings", label: "Settings", actions: ["view", "edit"] },
    { id: "staff", label: "Staff", actions: ["view", "create", "edit", "delete"] },
    { id: "support", label: "Support", actions: ["view", "create", "edit", "delete"] },
];

// Action columns for the matrix header
const ACTION_COLUMNS = ["view", "create", "edit", "delete"];

// Role templates for quick setup
const ROLE_TEMPLATES: { name: string; description: string; permissions: string[] }[] = [
    {
        name: "Sales Manager",
        description: "Full access to leads, customers, invoices, and estimates",
        permissions: [
            "leads-view", "leads-create", "leads-edit", "leads-delete",
            "customers-view", "customers-create", "customers-edit",
            "invoices-view", "invoices-create", "invoices-edit",
            "estimates-view", "estimates-create", "estimates-edit",
            "contracts-view", "contracts-create",
            "reports-view",
        ],
    },
    {
        name: "Accountant",
        description: "Full access to financial modules",
        permissions: [
            "invoices-view", "invoices-create", "invoices-edit", "invoices-delete",
            "expenses-view", "expenses-create", "expenses-edit", "expenses-delete",
            "credit-notes-view", "credit-notes-create", "credit-notes-edit",
            "customers-view",
            "reports-view",
        ],
    },
    {
        name: "Support Agent",
        description: "Handle support tickets and view customers",
        permissions: [
            "support-view", "support-create", "support-edit",
            "customers-view",
            "tasks-view", "tasks-create", "tasks-edit",
        ],
    },
    {
        name: "Project Manager",
        description: "Manage projects, tasks, and team assignments",
        permissions: [
            "projects-view", "projects-create", "projects-edit",
            "tasks-view", "tasks-create", "tasks-edit", "tasks-delete",
            "staff-view",
            "customers-view",
            "reports-view",
        ],
    },
];

interface RoleFormProps {
    role?: Role; // If provided, we're editing
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

export function RoleForm({ role, trigger, onSuccess }: RoleFormProps) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [roleName, setRoleName] = useState("");
    const [description, setDescription] = useState("");
    const [permissions, setPermissions] = useState<string[]>([]);
    const { createRole, updateRole } = useRoles();

    const isEditing = !!role;

    // Initialize form when opening or when role changes
    useEffect(() => {
        if (open && role) {
            setRoleName(role.name || "");
            setDescription(role.description || "");
            setPermissions(role.permissions || []);
        } else if (open && !role) {
            setRoleName("");
            setDescription("");
            setPermissions([]);
        }
    }, [open, role]);

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            // Reset form on close
            setTimeout(() => {
                setRoleName("");
                setDescription("");
                setPermissions([]);
            }, 300);
        }
    };

    // Toggle a single permission
    const togglePermission = (permId: string) => {
        setPermissions(prev =>
            prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
        );
    };

    // Toggle all actions for a module
    const toggleModule = (moduleId: string, actions: string[]) => {
        const modulePerms = actions.map(a => `${moduleId}-${a}`);
        const allSelected = modulePerms.every(p => permissions.includes(p));

        if (allSelected) {
            setPermissions(prev => prev.filter(p => !modulePerms.includes(p)));
        } else {
            setPermissions(prev => [...new Set([...prev, ...modulePerms])]);
        }
    };

    // Check if all actions for a module are selected
    const isModuleFullySelected = (moduleId: string, actions: string[]) => {
        return actions.every(a => permissions.includes(`${moduleId}-${a}`));
    };

    // Check if some (but not all) actions for a module are selected
    const isModulePartiallySelected = (moduleId: string, actions: string[]) => {
        const selected = actions.filter(a => permissions.includes(`${moduleId}-${a}`));
        return selected.length > 0 && selected.length < actions.length;
    };

    // Select All / Deselect All
    const allPermissions = useMemo(() => {
        return PERMISSION_MODULES.flatMap(m => m.actions.map(a => `${m.id}-${a}`));
    }, []);

    const isAllSelected = allPermissions.every(p => permissions.includes(p));

    const toggleAll = () => {
        if (isAllSelected) {
            setPermissions([]);
        } else {
            setPermissions(allPermissions);
        }
    };

    // Apply a template
    const applyTemplate = (templateName: string) => {
        const template = ROLE_TEMPLATES.find(t => t.name === templateName);
        if (template) {
            setRoleName(template.name);
            setDescription(template.description);
            setPermissions(template.permissions);
            toast.success(`Applied "${template.name}" template`);
        }
    };

    const handleSave = async () => {
        if (!roleName.trim()) {
            toast.error("Role name is required");
            return;
        }

        setSaving(true);
        try {
            if (isEditing && role) {
                await updateRole(role.id, {
                    name: roleName.trim(),
                    description: description.trim(),
                    permissions,
                });
                toast.success("Role updated successfully!");
            } else {
                await createRole({
                    name: roleName.trim(),
                    description: description.trim(),
                    permissions,
                });
                toast.success("Role created successfully!");
            }
            handleOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error("Error saving role:", error);
            toast.error(isEditing ? "Failed to update role" : "Failed to create role");
        } finally {
            setSaving(false);
        }
    };

    const defaultTrigger = isEditing ? (
        <Pen className="h-4 w-4 cursor-pointer hover:text-blue-600" />
    ) : (
        <Button className="bg-gray-900 text-white hover:bg-gray-800">
            <Plus className="mr-2 h-4 w-4" /> New Role
        </Button>
    );

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                {trigger || defaultTrigger}
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-2xl bg-white p-0 flex flex-col">
                <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-gray-600" />
                            {isEditing ? "Edit Role" : "Create New Role"}
                        </SheetTitle>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Role Information */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            Role Information
                        </h3>

                        {/* Template Selector (only for new roles) */}
                        {!isEditing && (
                            <div className="space-y-2">
                                <Label>Start from Template</Label>
                                <Select onValueChange={applyTemplate}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a template (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLE_TEMPLATES.map(t => (
                                            <SelectItem key={t.name} value={t.name}>
                                                {t.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label className="text-red-500">* Role Name</Label>
                                <Input
                                    value={roleName}
                                    onChange={(e) => setRoleName(e.target.value)}
                                    placeholder="e.g. Project Manager"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe what this role is for..."
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Permission Matrix */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Permissions</h3>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={toggleAll}
                                className="text-xs"
                            >
                                {isAllSelected ? "Deselect All" : "Select All"}
                            </Button>
                        </div>

                        {/* Matrix Table */}
                        <div className="border rounded-lg overflow-hidden">
                            {/* Header */}
                            <div className="grid grid-cols-6 bg-gray-100 border-b">
                                <div className="col-span-2 px-4 py-3 font-medium text-gray-700">
                                    Module
                                </div>
                                {ACTION_COLUMNS.map(action => (
                                    <div
                                        key={action}
                                        className="px-2 py-3 text-center font-medium text-gray-700 capitalize text-sm"
                                    >
                                        {action}
                                    </div>
                                ))}
                            </div>

                            {/* Rows */}
                            <div className="divide-y">
                                {PERMISSION_MODULES.map((module) => {
                                    const isFullySelected = isModuleFullySelected(module.id, module.actions);
                                    const isPartiallySelected = isModulePartiallySelected(module.id, module.actions);

                                    return (
                                        <div
                                            key={module.id}
                                            className="grid grid-cols-6 hover:bg-gray-50 transition-colors"
                                        >
                                            {/* Module Name with Toggle */}
                                            <div className="col-span-2 px-4 py-3 flex items-center gap-3">
                                                <Checkbox
                                                    checked={isFullySelected}
                                                    className={isPartiallySelected ? "data-[state=unchecked]:bg-gray-300" : ""}
                                                    onCheckedChange={() => toggleModule(module.id, module.actions)}
                                                />
                                                <span className="font-medium text-gray-800">
                                                    {module.label}
                                                </span>
                                            </div>

                                            {/* Action Checkboxes */}
                                            {ACTION_COLUMNS.map(action => {
                                                const permId = `${module.id}-${action}`;
                                                const hasAction = module.actions.includes(action);
                                                const isChecked = permissions.includes(permId);

                                                return (
                                                    <div
                                                        key={action}
                                                        className="px-2 py-3 flex items-center justify-center"
                                                    >
                                                        {hasAction ? (
                                                            <Checkbox
                                                                checked={isChecked}
                                                                onCheckedChange={() => togglePermission(permId)}
                                                                className="h-5 w-5"
                                                            />
                                                        ) : (
                                                            <span className="text-gray-300">—</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Permission Summary */}
                        <div className="text-sm text-gray-500">
                            {permissions.length} permission{permissions.length !== 1 ? "s" : ""} selected
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-white flex justify-between items-center flex-shrink-0">
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="bg-gray-900 text-white hover:bg-gray-800"
                        disabled={saving}
                    >
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? "Save Changes" : "Create Role"}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { Plus, Pen, Loader2, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useRoles } from "@/lib/hooks";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

import { PERMISSION_MODULES } from "@/lib/rbac/definitions";

// Role templates for quick setup
const ROLE_TEMPLATES: { name: string; description: string; permissions: string[] }[] = [
    {
        name: "Sales Manager",
        description: "Full access to leads, customers, invoices, and estimates",
        permissions: [
            "leads-view-global",
            "leads-delete",
            "customers-view-own",
            "customers-view-global",
            "customers-create",
            "customers-edit",
            "invoices-view-own",
            "invoices-view-global",
            "invoices-create",
            "invoices-edit",
            "estimates-view-own",
            "estimates-view-global",
            "estimates-create",
            "estimates-edit",
            "contracts-view-own",
            "contracts-view-global",
            "contracts-create",
            "reports-view-global",
        ],
    },
    {
        name: "Accountant",
        description: "Full access to financial modules",
        permissions: [
            "invoices-view-own",
            "invoices-view-global",
            "invoices-create",
            "invoices-edit",
            "invoices-delete",
            "expenses-view-own",
            "expenses-view-global",
            "expenses-create",
            "expenses-edit",
            "expenses-delete",
            "credit-notes-view-own",
            "credit-notes-view-global",
            "credit-notes-create",
            "credit-notes-edit",
            "payments-view-own",
            "payments-view-global",
            "payments-create",
            "payments-edit",
            "customers-view-global",
            "reports-view-global",
        ],
    },
    {
        name: "Support Agent",
        description: "Handle support tickets and view customers",
        permissions: [
            "customers-view-own",
            "customers-view-global",
            "tasks-view-own",
            "tasks-create",
            "tasks-edit",
            "knowledge-base-view-global",
        ],
    },
    {
        name: "Project Manager",
        description: "Manage projects, tasks, and team assignments",
        permissions: [
            "projects-view-own",
            "projects-view-global",
            "projects-create",
            "projects-edit",
            "projects-create-timesheets",
            "projects-edit-milestones",
            "projects-delete-milestones",
            "tasks-view-own",
            "tasks-view-global",
            "tasks-create",
            "tasks-edit",
            "tasks-delete",
            "tasks-edit-timesheets-global",
            "tasks-edit-own-timesheets",
            "staff-view-global",
            "customers-view-global",
            "reports-view-global",
            "reports-view-timesheets-report",
        ],
    },
];

interface RoleFormProps {
    role?: Role;
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

export function RoleForm({ role, trigger, onSuccess }: RoleFormProps) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [roleName, setRoleName] = useState("");
    const [description, setDescription] = useState("");
    const [permissions, setPermissions] = useState<string[]>([]);
    const [expandedModules, setExpandedModules] = useState<string[]>([]);
    const { createRole, updateRole } = useRoles();

    const isEditing = !!role;

    // Initialize form when opening or when role changes
    useEffect(() => {
        if (open && role) {
            setRoleName(role.name || "");
            setDescription(role.description || "");
            setPermissions(role.permissions || []);
            // Expand modules that have permissions
            const modulesWithPerms = PERMISSION_MODULES.filter((m) =>
                m.actions.some((a) => (role.permissions || []).includes(`${m.id}-${a.id}`))
            ).map((m) => m.id);
            setExpandedModules(modulesWithPerms);
        } else if (open && !role) {
            setRoleName("");
            setDescription("");
            setPermissions([]);
            setExpandedModules([]);
        }
    }, [open, role]);

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            setTimeout(() => {
                setRoleName("");
                setDescription("");
                setPermissions([]);
                setExpandedModules([]);
            }, 300);
        }
    };

    // Toggle module expansion
    const toggleExpanded = (moduleId: string) => {
        setExpandedModules((prev) =>
            prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
        );
    };

    // Toggle a single permission
    const togglePermission = (permId: string) => {
        setPermissions((prev) => (prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]));
    };

    // Toggle all actions for a module
    const toggleModule = (moduleId: string, actions: readonly { id: string }[]) => {
        const modulePerms = actions.map((a) => `${moduleId}-${a.id}`);
        const allSelected = modulePerms.every((p) => permissions.includes(p));

        if (allSelected) {
            setPermissions((prev) => prev.filter((p) => !modulePerms.includes(p)));
        } else {
            setPermissions((prev) => [...new Set([...prev, ...modulePerms])]);
        }
    };

    // Check if all actions for a module are selected
    const isModuleFullySelected = (moduleId: string, actions: readonly { id: string }[]) => {
        return actions.every((a) => permissions.includes(`${moduleId}-${a.id}`));
    };

    // Check selection count for module
    const getModuleSelectionCount = (moduleId: string, actions: readonly { id: string }[]) => {
        return actions.filter((a) => permissions.includes(`${moduleId}-${a.id}`)).length;
    };

    // Select All / Deselect All
    const allPermissions = useMemo(() => {
        return PERMISSION_MODULES.flatMap((m) => m.actions.map((a) => `${m.id}-${a.id}`));
    }, []);

    const isAllSelected = allPermissions.every((p) => permissions.includes(p));

    const toggleAll = () => {
        if (isAllSelected) {
            setPermissions([]);
        } else {
            setPermissions(allPermissions);
        }
    };

    // Apply a template
    const applyTemplate = (templateName: string) => {
        const template = ROLE_TEMPLATES.find((t) => t.name === templateName);
        if (template) {
            setRoleName(template.name);
            setDescription(template.description);
            setPermissions(template.permissions);
            // Expand modules with permissions
            const modulesWithPerms = PERMISSION_MODULES.filter((m) =>
                m.actions.some((a) => template.permissions.includes(`${m.id}-${a.id}`))
            ).map((m) => m.id);
            setExpandedModules(modulesWithPerms);
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
            <SheetTrigger asChild>{trigger || defaultTrigger}</SheetTrigger>
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
                        <h3 className="font-semibold text-gray-900">Role Information</h3>

                        {/* Template Selector (only for new roles) */}
                        {!isEditing && (
                            <div className="space-y-2">
                                <Label>Start from Template</Label>
                                <Select onValueChange={applyTemplate}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a template (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLE_TEMPLATES.map((t) => (
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
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">{permissions.length} selected</span>
                                <Button variant="outline" size="sm" onClick={toggleAll} className="text-xs">
                                    {isAllSelected ? "Deselect All" : "Select All"}
                                </Button>
                            </div>
                        </div>

                        {/* Accordion-style Module List */}
                        <div className="border rounded-lg overflow-hidden divide-y">
                            {PERMISSION_MODULES.map((module) => {
                                const isExpanded = expandedModules.includes(module.id);
                                const isFullySelected = isModuleFullySelected(module.id, module.actions);
                                const selectionCount = getModuleSelectionCount(module.id, module.actions);

                                return (
                                    <div key={module.id}>
                                        {/* Module Header */}
                                        <div
                                            className={cn(
                                                "flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors",
                                                isExpanded && "bg-gray-50"
                                            )}
                                            onClick={() => toggleExpanded(module.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    checked={isFullySelected}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onCheckedChange={() => toggleModule(module.id, module.actions)}
                                                />
                                                <span className="font-medium text-gray-800">{module.label}</span>
                                                {selectionCount > 0 && !isFullySelected && (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                                        {selectionCount}/{module.actions.length}
                                                    </span>
                                                )}
                                                {isFullySelected && (
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                                        All
                                                    </span>
                                                )}
                                            </div>
                                            {isExpanded ? (
                                                <ChevronUp className="h-4 w-4 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-gray-400" />
                                            )}
                                        </div>

                                        {/* Module Actions (Expanded) */}
                                        {isExpanded && (
                                            <div className="px-4 py-3 bg-gray-50 border-t">
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    {module.actions.map((action) => {
                                                        const permId = `${module.id}-${action.id}`;
                                                        const isChecked = permissions.includes(permId);

                                                        return (
                                                            <label
                                                                key={action.id}
                                                                className="flex items-center gap-2 cursor-pointer"
                                                            >
                                                                <Checkbox
                                                                    checked={isChecked}
                                                                    onCheckedChange={() => togglePermission(permId)}
                                                                />
                                                                <span className="text-sm text-gray-700">
                                                                    {action.label}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-white flex justify-between items-center flex-shrink-0">
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} className="bg-gray-900 text-white hover:bg-gray-800" disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? "Save Changes" : "Create Role"}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Play, CheckCircle, AlertCircle } from "lucide-react";
import { useStaff, useRoles } from "@/lib/hooks";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export function MigrateUsersDialog() {
    const [open, setOpen] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<{ total: number; success: number; failed: number } | null>(null);

    const { staff, updateStaff } = useStaff();
    const { roles } = useRoles();

    // Identify users needing migration (missing roleId)
    // Note: We might want to be more specific, e.g., missing roleId OR using legacy role field
    // For now, let's assume we are targeting users without a valid roleId matching a current role
    const usersToMigrate = staff.filter((user) => {
        // If they have a roleId that exists in our roles list, they are good.
        // If missing roleId, or roleId not found in roles list, they need migration.
        const validRole = roles.find((r) => r.id === user.roleId);
        return !validRole;
    });

    const handleMigrate = async () => {
        if (usersToMigrate.length === 0) return;

        setMigrating(true);
        setProgress(0);
        setResults(null);

        let successCount = 0;
        let failedCount = 0;

        // Find target role IDs
        const adminRole =
            roles.find((r) => r.name.toLowerCase() === "admin") || roles.find((r) => r.name.toLowerCase() === "owner");
        const staffRole =
            roles.find((r) => r.name.toLowerCase() === "staff") ||
            roles.find((r) => r.name.toLowerCase() === "employee");

        // Fallback: if no "Staff" role, pick the first non-admin role, or just the first role available
        const defaultRole = staffRole || roles.find((r) => r.id !== adminRole?.id) || roles[0];

        if (!defaultRole) {
            toast.error("No roles found to assign users to. Please create a role first.");
            setMigrating(false);
            return;
        }

        const total = usersToMigrate.length;

        for (let i = 0; i < total; i++) {
            const user = usersToMigrate[i];
            try {
                // Heuristic: Check legacy 'role' field or 'isAdmin' flag if they exist on the user object (even if not in type def strict)
                // We'll cast to unknown first then check props safely
                const legacyUser = user as unknown as Record<string, unknown>;
                let targetRoleId = defaultRole.id;

                if (legacyUser.role === "admin" || legacyUser.isAdmin === true || user.isAdmin) {
                    targetRoleId = adminRole?.id || defaultRole.id;
                }

                await updateStaff(user.id, { roleId: targetRoleId });
                successCount++;
            } catch (error) {
                console.error(`Failed to migrate user ${user.email}:`, error);
                failedCount++;
            }

            setProgress(Math.round(((i + 1) / total) * 100));
        }

        setResults({ total, success: successCount, failed: failedCount });
        setMigrating(false);
        toast.success(`Migration completed. ${successCount} users updated.`);
    };

    if (usersToMigrate.length === 0 && !open) {
        return null; // Hide button if no one to migrate
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="gap-2 border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-800"
                >
                    <AlertCircle className="h-4 w-4" />
                    Migrate Legacy Users ({usersToMigrate.length})
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Migrate Legacy Users</DialogTitle>
                    <DialogDescription>
                        Update users who are missing a valid Role ID. They will be assigned to a role based on their
                        legacy settings.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-md">
                        <span className="text-gray-600">Users requiring migration:</span>
                        <span className="font-semibold">{usersToMigrate.length}</span>
                    </div>

                    {migrating && (
                        <div className="space-y-2">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-center text-gray-500">Processing... {progress}%</p>
                        </div>
                    )}

                    {results && (
                        <div className="bg-green-50 p-3 rounded-md border border-green-100 text-sm space-y-1">
                            <div className="flex items-center gap-2 text-green-700 font-medium">
                                <CheckCircle className="h-4 w-4" />
                                Migration Complete
                            </div>
                            <div className="text-green-600 pl-6">
                                Successfully updated {results.success} users.
                                {results.failed > 0 && ` (${results.failed} failed)`}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={migrating}>
                        {results ? "Close" : "Cancel"}
                    </Button>
                    {!results && (
                        <Button
                            onClick={handleMigrate}
                            disabled={migrating || usersToMigrate.length === 0}
                            className="gap-2"
                        >
                            {migrating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                            Start Migration
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

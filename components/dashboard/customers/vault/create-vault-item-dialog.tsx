"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm, Controller } from "react-hook-form";
import { useVault } from "@/lib/hooks/use-customer-data";
import { useCustomer } from "../customer-context";
import { toast } from "sonner";
import { Loader2, Lock, Users } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

interface CreateVaultItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface FormData {
    name: string;
    value: string;
    isShared: boolean;
}

export function CreateVaultItemDialog({ open, onOpenChange }: CreateVaultItemDialogProps) {
    const { customerId } = useCustomer();
    const { createVaultItem } = useVault();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            isShared: false
        }
    });

    const onSubmit = async (data: FormData) => {
        if (!customerId) return;

        setLoading(true);
        try {
            await createVaultItem({
                name: data.name,
                value: data.value,
                visibility: data.isShared ? "shared" : "private",
                customerId,
                type: "text",
                username: "",
                url: "",
            });

            toast.success("Vault item added successfully");
            onOpenChange(false);
            reset();
        } catch (error) {
            console.error(error);
            toast.error("Failed to add vault item");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add to Vault</DialogTitle>
                    <DialogDescription>Securely store sensitive information.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            {...register("name", { required: "Name is required" })}
                            placeholder="e.g., WiFi Password"
                        />
                        {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="value">Value</Label>
                        <Textarea
                            id="value"
                            {...register("value", { required: "Value is required" })}
                            placeholder="Enter sensitive data..."
                            className="font-mono text-sm"
                        />
                        {errors.value && <p className="text-red-500 text-xs">{errors.value.message}</p>}
                    </div>

                    <div className="flex items-center justify-between border rounded-lg p-3">
                        <div className="space-y-0.5">
                            <Label className="text-base">Visibility</Label>
                            <p className="text-xs text-gray-500">
                                {control._formValues.isShared ? "Shared with team" : "Private to you"}
                            </p>
                        </div>
                        <Controller
                            control={control}
                            name="isShared"
                            render={({ field }) => (
                                <div className="flex items-center gap-2">
                                    {field.value ? <Users className="h-4 w-4 text-blue-500" /> : <Lock className="h-4 w-4 text-gray-400" />}
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </div>
                            )}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Securely"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

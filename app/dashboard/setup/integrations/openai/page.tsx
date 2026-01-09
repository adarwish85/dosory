"use client";

import { useState, useEffect } from "react";
import { Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useOrganizationSettings, OrganizationSettings } from "@/lib/hooks/use-organization-settings";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/setup/settings/SettingsSection";
import { SettingsSaveButton } from "@/components/dashboard/setup/settings/SettingsSaveButton";

export default function OpenAiSettingsPage() {
    const { settings, saveSettings, saving, loading } = useOrganizationSettings();
    const [openaiForm, setOpenaiForm] = useState({
        openaiApiKey: "",
        openaiModel: "gpt-3.5-turbo",
        openaiMaxTokens: 0,
    });

    useEffect(() => {
        if (!loading) {
            setOpenaiForm({
                openaiApiKey: settings.openaiApiKey ?? "",
                openaiModel: settings.openaiModel ?? "gpt-3.5-turbo",
                openaiMaxTokens: settings.openaiMaxTokens ?? 0,
            });
        }
    }, [loading, settings]);

    const handleSave = async () => {
        try {
            await saveSettings({
                ...openaiForm,
                openaiMaxTokens: parseInt(openaiForm.openaiMaxTokens.toString()) || 0,
            } as Partial<OrganizationSettings>);
            toast.success("OpenAI settings saved successfully");
        } catch (error) {
            toast.error("Failed to save settings");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">OpenAI Configuration</h1>
                <p className="text-gray-500 mt-1">
                    Configure AI model settings and API keys
                </p>
            </div>

            <SettingsSection title="API Connection" description="Connect to OpenAI API">
                <div className="space-y-4">
                    <div>
                        <Label>OpenAI API Key</Label>
                        <div className="mt-1">
                            <Input
                                type="password"
                                value={openaiForm.openaiApiKey}
                                onChange={(e) => setOpenaiForm({ ...openaiForm, openaiApiKey: e.target.value })}
                                placeholder="sk-..."
                            />
                        </div>
                    </div>

                    <div>
                        <Label>OpenAI Model</Label>
                        <Select
                            value={openaiForm.openaiModel}
                            onValueChange={(val) => setOpenaiForm({ ...openaiForm, openaiModel: val })}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                <SelectItem value="gpt-4">GPT-4</SelectItem>
                                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Max Output Tokens</Label>
                        <Input
                            type="number"
                            value={openaiForm.openaiMaxTokens}
                            onChange={(e) => setOpenaiForm({ ...openaiForm, openaiMaxTokens: parseInt(e.target.value) || 0 })}
                            className="mt-1"
                        />
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="Features" description="AI capabilities">
                <div className="flex items-center gap-4">
                    <Button variant="outline" className="gap-2">
                        <Zap className="h-4 w-4" />
                        OpenAI Fine-Tuning
                    </Button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                    Fine-tune OpenAI models with your knowledge base and predefined replies content for more
                    accurate responses.
                </p>

                <SettingsSaveButton onClick={handleSave} loading={saving} />
            </SettingsSection>
        </div>
    );
}

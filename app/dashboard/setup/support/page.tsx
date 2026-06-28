"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { SupportSettingsService } from "@/lib/services/support-settings-service";
import { SupportSettings, CannedResponse, SupportTicketPriority } from "@/lib/types/support";
import { toast } from "sonner";
import { useStaff } from "@/lib/hooks";
import { Trash2, Edit2, Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";

export default function SupportSetupPage() {
    const { t } = useTranslation();
    const { profile } = useUserProfile();
    const { staff } = useStaff();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("general");

    // SLA Config State
    const [slaRules, setSlaRules] = useState<NonNullable<SupportSettings["slaRules"]>>({
        low: { responseHours: 24, resolutionHours: 72 },
        medium: { responseHours: 8, resolutionHours: 48 },
        high: { responseHours: 4, resolutionHours: 24 },
        critical: { responseHours: 1, resolutionHours: 8 },
    });

    // Auto-Assign State
    const [categories, setCategories] = useState<string[]>([]);
    const [newCategory, setNewCategory] = useState("");
    const [autoAssignRules, setAutoAssignRules] = useState<NonNullable<SupportSettings["autoAssignRules"]>>([]);
    const [selectedCategoryForRule, setSelectedCategoryForRule] = useState("");
    const [selectedAgentForRule, setSelectedAgentForRule] = useState("unassigned");

    // Canned Response State
    const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
    const [isEditingResponse, setIsEditingResponse] = useState(false);
    const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
    const [responseForm, setResponseForm] = useState({ title: "", body: "", category: "General" });

    useEffect(() => {
        if (profile?.orgId) {
            loadSettings();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.orgId]);

    const loadSettings = async () => {
        if (!profile?.orgId) return;
        setLoading(true);
        try {
            const data = await SupportSettingsService.getSettings(profile.orgId);
            if (data.slaRules) setSlaRules(data.slaRules);
            if (data.categories) setCategories(data.categories);
            if (data.autoAssignRules) setAutoAssignRules(data.autoAssignRules);
            if (data.cannedResponses) setCannedResponses(data.cannedResponses);
        } catch (error) {
            toast.error(t("setup.support.loadFailed"));
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const saveSla = async () => {
        if (!profile?.orgId) return;
        try {
            await SupportSettingsService.saveSettings(profile.orgId, { slaRules });
            toast.success(t("setup.support.slaSaved"));
        } catch (e) {
            toast.error(t("setup.support.slaSaveFailed"));
        }
    };

    const addCategory = async () => {
        if (!newCategory.trim() || !profile?.orgId) return;
        if (categories.includes(newCategory)) return;

        const updated = [...categories, newCategory];
        setCategories(updated);
        setNewCategory("");
        await SupportSettingsService.saveSettings(profile.orgId, { categories: updated });
    };

    const removeCategory = async (cat: string) => {
        if (!profile?.orgId) return;
        const updated = categories.filter((c) => c !== cat);
        setCategories(updated);

        // Also remove related auto-assign rules
        const updatedRules = autoAssignRules.filter((r) => r.category !== cat);
        setAutoAssignRules(updatedRules);

        await SupportSettingsService.saveSettings(profile.orgId, {
            categories: updated,
            autoAssignRules: updatedRules,
        });
    };

    const addAutoAssignRule = async () => {
        if (!selectedCategoryForRule || selectedAgentForRule === "unassigned" || !profile?.orgId) return;

        // Remove existing rule for this category if any
        const filtered = autoAssignRules.filter((r) => r.category !== selectedCategoryForRule);
        const newRule = { category: selectedCategoryForRule, agentId: selectedAgentForRule };
        const updated = [...filtered, newRule];

        setAutoAssignRules(updated);
        setSelectedCategoryForRule("");
        setSelectedAgentForRule("unassigned");

        await SupportSettingsService.saveSettings(profile.orgId, { autoAssignRules: updated });
    };

    const removeAutoAssignRule = async (category: string) => {
        if (!profile?.orgId) return;
        const updated = autoAssignRules.filter((r) => r.category !== category);
        setAutoAssignRules(updated);
        await SupportSettingsService.saveSettings(profile.orgId, { autoAssignRules: updated });
    };

    const handleSaveResponse = async () => {
        if (!profile?.orgId || !responseForm.title || !responseForm.body) return;

        try {
            if (isEditingResponse && editingResponseId) {
                await SupportSettingsService.updateCannedResponse(profile.orgId, editingResponseId, responseForm);
                toast.success(t("setup.support.responseUpdated"));
            } else {
                await SupportSettingsService.addCannedResponse(profile.orgId, responseForm, profile.uid);
                toast.success(t("setup.support.responseCreated"));
            }

            // Reset form
            setResponseForm({ title: "", body: "", category: "General" });
            setIsEditingResponse(false);
            setEditingResponseId(null);
            loadSettings(); // Reload to get updated list
        } catch (e) {
            toast.error(t("setup.support.responseSaveFailed"));
        }
    };

    const handleEditResponse = (response: CannedResponse) => {
        setResponseForm({
            title: response.title,
            body: response.body,
            category: response.category || "General",
        });
        setEditingResponseId(response.id);
        setIsEditingResponse(true);
    };

    const handleDeleteResponse = async (id: string) => {
        if (!profile?.orgId) return;
        if (!confirm(t("setup.support.confirmDelete"))) return;

        try {
            await SupportSettingsService.deleteCannedResponse(profile.orgId, id);
            loadSettings();
            toast.success(t("setup.support.responseDeleted"));
        } catch (e) {
            toast.error(t("setup.support.responseDeleteFailed"));
        }
    };

    if (loading) return <div>{t("setup.support.loading")}</div>;

    const priorities: SupportTicketPriority[] = ["low", "medium", "high", "critical"];

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t("setup.support.title")}</h1>
                <p className="text-muted-foreground">
                    {t("setup.support.description")}
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="general">{t("setup.support.tabGeneral")}</TabsTrigger>
                    <TabsTrigger value="sla">{t("setup.support.tabSla")}</TabsTrigger>
                    <TabsTrigger value="canned">{t("setup.support.tabCanned")}</TabsTrigger>
                </TabsList>

                {/* General Tab: Categories & Auto-Assignment */}
                <TabsContent value="general" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("setup.support.categoriesTitle")}</CardTitle>
                            <CardDescription>{t("setup.support.categoriesDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder={t("setup.support.newCategoryPlaceholder")}
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="max-w-sm"
                                />
                                <Button onClick={addCategory} disabled={!newCategory.trim()}>
                                    {t("common.add")}
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {categories.map((cat) => (
                                    <Badge
                                        key={cat}
                                        variant="secondary"
                                        className="px-3 py-1 text-sm flex gap-2 items-center"
                                    >
                                        {cat}
                                        <button onClick={() => removeCategory(cat)} className="hover:text-red-600">
                                            ×
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t("setup.support.autoAssignTitle")}</CardTitle>
                            <CardDescription>{t("setup.support.autoAssignDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex gap-4 items-end border-b pb-6">
                                <div className="space-y-2 w-1/3">
                                    <Label>{t("setup.support.ifCategoryIs")}</Label>
                                    <Select value={selectedCategoryForRule} onValueChange={setSelectedCategoryForRule}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("setup.support.selectCategory")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((c) => (
                                                <SelectItem key={c} value={c}>
                                                    {c}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 w-1/3">
                                    <Label>{t("setup.support.assignToAgent")}</Label>
                                    <Select value={selectedAgentForRule} onValueChange={setSelectedAgentForRule}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("setup.support.selectAgent")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {staff.map((s: { id: string; firstName?: string; lastName?: string }) => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {s.firstName} {s.lastName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    onClick={addAutoAssignRule}
                                    disabled={!selectedCategoryForRule || selectedAgentForRule === "unassigned"}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> {t("setup.support.addRule")}
                                </Button>
                            </div>

                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("setup.support.colCategory")}</TableHead>
                                            <TableHead>{t("setup.support.colAssignedAgent")}</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {autoAssignRules.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={3}
                                                    className="text-center text-muted-foreground p-4"
                                                >
                                                    {t("setup.support.noRules")}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            autoAssignRules.map((rule, idx) => {
                                                const agent = staff.find(
                                                    (s: { id: string; firstName?: string; lastName?: string }) =>
                                                        s.id === rule.agentId
                                                );
                                                return (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">{rule.category}</TableCell>
                                                        <TableCell>
                                                            {agent
                                                                ? `${agent.firstName} ${agent.lastName}`
                                                                : t("setup.support.unknownAgent")}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => removeAutoAssignRule(rule.category)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SLA Tab */}
                <TabsContent value="sla" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("setup.support.slaTitle")}</CardTitle>
                            <CardDescription>
                                {t("setup.support.slaDescription")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-4 font-medium text-sm text-muted-foreground mb-2">
                                    <div>{t("setup.support.priorityLevel")}</div>
                                    <div>{t("setup.support.firstResponseHours")}</div>
                                    <div>{t("setup.support.resolutionHours")}</div>
                                </div>

                                {priorities.map((priority) => (
                                    <div key={priority} className="grid grid-cols-3 gap-4 items-center">
                                        <div className="capitalize font-medium flex items-center gap-2">
                                            <Badge variant={priority === "critical" ? "destructive" : "secondary"}>
                                                {priority}
                                            </Badge>
                                        </div>
                                        <div>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={slaRules[priority].responseHours}
                                                onChange={(e) =>
                                                    setSlaRules({
                                                        ...slaRules,
                                                        [priority]: {
                                                            ...slaRules[priority],
                                                            responseHours: parseInt(e.target.value) || 0,
                                                        },
                                                    })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={slaRules[priority].resolutionHours}
                                                onChange={(e) =>
                                                    setSlaRules({
                                                        ...slaRules,
                                                        [priority]: {
                                                            ...slaRules[priority],
                                                            resolutionHours: parseInt(e.target.value) || 0,
                                                        },
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                ))}

                                <div className="pt-4 flex justify-end">
                                    <Button onClick={saveSla}>
                                        <Save className="mr-2 h-4 w-4" /> {t("setup.support.saveSla")}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Canned Responses Tab */}
                <TabsContent value="canned" className="grid gap-6 md:grid-cols-2">
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>{isEditingResponse ? t("setup.support.editTemplate") : t("setup.support.newTemplate")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t("setup.support.templateTitle")}</Label>
                                <Input
                                    placeholder={t("setup.support.templateTitlePlaceholder")}
                                    value={responseForm.title}
                                    onChange={(e) => setResponseForm({ ...responseForm, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("setup.support.category")}</Label>
                                <Select
                                    value={responseForm.category}
                                    onValueChange={(v) => setResponseForm({ ...responseForm, category: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("setup.support.selectCategory")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c} value={c}>
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("setup.support.responseBody")}</Label>
                                <Textarea
                                    className="h-40 font-mono text-sm"
                                    placeholder="Hello {{customer_name}}, ..."
                                    value={responseForm.body}
                                    onChange={(e) => setResponseForm({ ...responseForm, body: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t("setup.support.availableVariables")} {"{{customer_name}}, {{ticket_id}}, {{agent_name}}"}
                                </p>
                            </div>
                            <div className="flex gap-2 justify-end">
                                {isEditingResponse && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setIsEditingResponse(false);
                                            setEditingResponseId(null);
                                            setResponseForm({ title: "", body: "", category: "General" });
                                        }}
                                    >
                                        {t("common.cancel")}
                                    </Button>
                                )}
                                <Button
                                    onClick={handleSaveResponse}
                                    disabled={!responseForm.title || !responseForm.body}
                                >
                                    {isEditingResponse ? t("setup.support.updateTemplate") : t("setup.support.createTemplate")}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>{t("setup.support.templatesLibrary")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {cannedResponses.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground border rounded-md border-dashed">
                                        {t("setup.support.noTemplates")}
                                    </div>
                                ) : (
                                    cannedResponses.map((response) => (
                                        <div
                                            key={response.id}
                                            className="border rounded-lg p-3 hover:bg-muted/50 transition-colors group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-medium text-sm">{response.title}</h4>
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 mt-1">
                                                        {response.category}
                                                    </Badge>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => handleEditResponse(response)}
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDeleteResponse(response.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded">
                                                {response.body}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    ArrowLeft, Save, Loader2, Plus, Trash2, GripVertical, Eye,
    ChevronUp, ChevronDown, Settings, ExternalLink,
    Layout, Type, BarChart3, MessageSquare, HelpCircle, Megaphone, DollarSign, Zap
} from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { usePage, useSiteDesign } from "@/lib/hooks/use-site-pages";
import type { Block, BlockType, SitePage } from "@/lib/types/site-builder";
import { createBlock, defaultBlockData } from "@/lib/types/site-builder";

// Block type metadata
const blockTypes: { type: BlockType; label: string; icon: React.ElementType; description: string }[] = [
    { type: "hero", label: "Hero", icon: Layout, description: "Main headline with CTAs" },
    { type: "features", label: "Features", icon: Zap, description: "Feature cards grid" },
    { type: "stats", label: "Stats", icon: BarChart3, description: "Statistics row" },
    { type: "testimonial", label: "Testimonial", icon: MessageSquare, description: "Customer quote" },
    { type: "faq", label: "FAQ", icon: HelpCircle, description: "Accordion questions" },
    { type: "cta", label: "Call to Action", icon: Megaphone, description: "CTA banner" },
    { type: "text", label: "Text", icon: Type, description: "Rich text content" },
    { type: "pricing", label: "Pricing", icon: DollarSign, description: "Pricing cards" },
];

// Icon options for feature/stat blocks
const iconOptions = [
    "Users", "FileText", "BarChart3", "FolderKanban", "Headphones",
    "CreditCard", "Zap", "Target", "TrendingUp", "Building2", "Shield", "Globe"
];

interface PageProps {
    params: Promise<{ pageId: string }>;
}

export default function BlockEditorPage({ params }: PageProps) {
    const { pageId } = use(params);
    const router = useRouter();
    const { page, loading, updateBlocks, updatePageData } = usePage(pageId);
    const { design } = useSiteDesign();

    const [blocks, setBlocks] = useState<Block[]>([]);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [showAddBlockDialog, setShowAddBlockDialog] = useState(false);
    const [showSettingsSheet, setShowSettingsSheet] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Page settings form
    const [pageSettings, setPageSettings] = useState({
        title: "",
        slug: "",
        seoTitle: "",
        seoDescription: "",
        isPublished: false,
    });

    // Initialize blocks from page data
    useEffect(() => {
        if (page) {
            setBlocks(page.blocks || []);
            setPageSettings({
                title: page.title || "",
                slug: page.slug || "",
                seoTitle: page.seoTitle || "",
                seoDescription: page.seoDescription || "",
                isPublished: page.isPublished || false,
            });
        }
    }, [page]);

    const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

    const handleAddBlock = (type: BlockType) => {
        const newBlock = createBlock(type);
        setBlocks([...blocks, newBlock]);
        setSelectedBlockId(newBlock.id);
        setShowAddBlockDialog(false);
        setHasChanges(true);
    };

    const handleRemoveBlock = (blockId: string) => {
        setBlocks(blocks.filter((b) => b.id !== blockId));
        if (selectedBlockId === blockId) {
            setSelectedBlockId(null);
        }
        setHasChanges(true);
    };

    const handleMoveBlock = (blockId: string, direction: "up" | "down") => {
        const index = blocks.findIndex((b) => b.id === blockId);
        if (index === -1) return;

        const newIndex = direction === "up" ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= blocks.length) return;

        const newBlocks = [...blocks];
        [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
        setBlocks(newBlocks);
        setHasChanges(true);
    };

    const handleUpdateBlockData = (blockId: string, data: Block["data"]) => {
        setBlocks(blocks.map((b) => (b.id === blockId ? { ...b, data } : b)));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateBlocks(blocks);
            await updatePageData(pageSettings);
            setHasChanges(false);
        } catch (err) {
            console.error("Error saving:", err);
            alert("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!page) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Page not found</p>
                <Button variant="outline" onClick={() => router.push("/bunny/landing-builder")} className="mt-4">
                    Back to Pages
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => router.push("/bunny/landing-builder")}>
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back
                        </Button>
                        <div>
                            <h1 className="font-semibold text-gray-900">{page.title}</h1>
                            <p className="text-sm text-gray-500">/{page.slug || "(home)"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {hasChanges && (
                            <span className="text-sm text-orange-600">Unsaved changes</span>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/${page.slug}`, "_blank")}
                        >
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSettingsSheet(true)}
                        >
                            <Settings className="h-4 w-4 mr-1" />
                            Settings
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                            Save
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex">
                {/* Blocks List (Left Panel) */}
                <div className="w-72 bg-gray-50 border-r border-gray-200 min-h-[calc(100vh-73px)] p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-medium text-gray-900">Blocks</h2>
                        <Button size="sm" onClick={() => setShowAddBlockDialog(true)}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {blocks.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            <p className="mb-2">No blocks yet</p>
                            <Button variant="outline" size="sm" onClick={() => setShowAddBlockDialog(true)}>
                                Add First Block
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {blocks.map((block, index) => {
                                const blockMeta = blockTypes.find((t) => t.type === block.type);
                                const Icon = blockMeta?.icon || Layout;
                                return (
                                    <div
                                        key={block.id}
                                        className={`group flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${selectedBlockId === block.id
                                                ? "bg-blue-50 border-blue-200"
                                                : "bg-white border-gray-200 hover:border-gray-300"
                                            }`}
                                        onClick={() => setSelectedBlockId(block.id)}
                                    >
                                        <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                        <Icon className="h-4 w-4 text-gray-600 flex-shrink-0" />
                                        <span className="text-sm font-medium text-gray-900 flex-1 truncate">
                                            {blockMeta?.label || block.type}
                                        </span>
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveBlock(block.id, "up"); }}
                                                disabled={index === 0}
                                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                            >
                                                <ChevronUp className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveBlock(block.id, "down"); }}
                                                disabled={index === blocks.length - 1}
                                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                            >
                                                <ChevronDown className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRemoveBlock(block.id); }}
                                                className="p-1 text-red-400 hover:text-red-600"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Block Editor (Main Panel) */}
                <div className="flex-1 p-6">
                    {selectedBlock ? (
                        <BlockDataEditor
                            block={selectedBlock}
                            design={design}
                            onUpdate={(data) => handleUpdateBlockData(selectedBlock.id, data)}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-64 text-gray-500">
                            <div className="text-center">
                                <Layout className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p>Select a block to edit</p>
                                {blocks.length === 0 && (
                                    <Button variant="outline" className="mt-4" onClick={() => setShowAddBlockDialog(true)}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Block
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Block Dialog */}
            <Dialog open={showAddBlockDialog} onOpenChange={setShowAddBlockDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Block</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3 py-4">
                        {blockTypes.map((bt) => {
                            const Icon = bt.icon;
                            return (
                                <button
                                    key={bt.type}
                                    onClick={() => handleAddBlock(bt.type)}
                                    className="flex items-start gap-3 p-4 text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                        <Icon className="h-5 w-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">{bt.label}</div>
                                        <div className="text-xs text-gray-500">{bt.description}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Page Settings Sheet */}
            <Sheet open={showSettingsSheet} onOpenChange={setShowSettingsSheet}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Page Settings</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-6 py-6">
                        <div>
                            <Label>Page Title</Label>
                            <Input
                                value={pageSettings.title}
                                onChange={(e) => {
                                    setPageSettings({ ...pageSettings, title: e.target.value });
                                    setHasChanges(true);
                                }}
                                className="mt-1.5"
                            />
                        </div>
                        {!page.isHome && (
                            <div>
                                <Label>URL Slug</Label>
                                <div className="flex items-center mt-1.5">
                                    <span className="text-gray-500 text-sm mr-1">/</span>
                                    <Input
                                        value={pageSettings.slug}
                                        onChange={(e) => {
                                            setPageSettings({ ...pageSettings, slug: e.target.value });
                                            setHasChanges(true);
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                        <div>
                            <Label>SEO Title</Label>
                            <Input
                                value={pageSettings.seoTitle}
                                onChange={(e) => {
                                    setPageSettings({ ...pageSettings, seoTitle: e.target.value });
                                    setHasChanges(true);
                                }}
                                placeholder="Page title for search engines"
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label>SEO Description</Label>
                            <Textarea
                                value={pageSettings.seoDescription}
                                onChange={(e) => {
                                    setPageSettings({ ...pageSettings, seoDescription: e.target.value });
                                    setHasChanges(true);
                                }}
                                placeholder="Description for search engines"
                                className="mt-1.5"
                                rows={3}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Published</Label>
                                <p className="text-xs text-gray-500">Make this page visible to visitors</p>
                            </div>
                            <Switch
                                checked={pageSettings.isPublished}
                                onCheckedChange={(checked) => {
                                    setPageSettings({ ...pageSettings, isPublished: checked });
                                    setHasChanges(true);
                                }}
                            />
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}

// ============================================
// Block Data Editor Components
// ============================================

function BlockDataEditor({
    block,
    design,
    onUpdate,
}: {
    block: Block;
    design: { primaryColor: string; secondaryColor: string; accentColor: string };
    onUpdate: (data: Block["data"]) => void;
}) {
    const blockMeta = blockTypes.find((t) => t.type === block.type);

    switch (block.type) {
        case "hero":
            return <HeroEditor data={block.data as any} onUpdate={onUpdate} />;
        case "features":
            return <FeaturesEditor data={block.data as any} onUpdate={onUpdate} />;
        case "stats":
            return <StatsEditor data={block.data as any} onUpdate={onUpdate} />;
        case "testimonial":
            return <TestimonialEditor data={block.data as any} onUpdate={onUpdate} />;
        case "faq":
            return <FaqEditor data={block.data as any} onUpdate={onUpdate} />;
        case "cta":
            return <CtaEditor data={block.data as any} onUpdate={onUpdate} />;
        case "text":
            return <TextEditor data={block.data as any} onUpdate={onUpdate} />;
        case "pricing":
            return <PricingEditor data={block.data as any} onUpdate={onUpdate} />;
        default:
            return <div className="text-gray-500">Unknown block type</div>;
    }
}

// Hero Editor
function HeroEditor({ data, onUpdate }: { data: any; onUpdate: (d: any) => void }) {
    return (
        <div className="space-y-4 max-w-2xl">
            <h3 className="font-semibold text-gray-900 text-lg">Hero Section</h3>
            <div>
                <Label>Badge Text</Label>
                <Input value={data.badge || ""} onChange={(e) => onUpdate({ ...data, badge: e.target.value })} className="mt-1.5" placeholder="e.g., #1 Rated CRM" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Headline</Label>
                    <Input value={data.headline || ""} onChange={(e) => onUpdate({ ...data, headline: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                    <Label>Headline Highlight</Label>
                    <Input value={data.headlineHighlight || ""} onChange={(e) => onUpdate({ ...data, headlineHighlight: e.target.value })} className="mt-1.5" placeholder="Colored text" />
                </div>
            </div>
            <div>
                <Label>Subheadline</Label>
                <Textarea value={data.subheadline || ""} onChange={(e) => onUpdate({ ...data, subheadline: e.target.value })} className="mt-1.5" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Primary CTA Text</Label>
                    <Input value={data.ctaPrimaryText || ""} onChange={(e) => onUpdate({ ...data, ctaPrimaryText: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                    <Label>Primary CTA Link</Label>
                    <Input value={data.ctaPrimaryLink || ""} onChange={(e) => onUpdate({ ...data, ctaPrimaryLink: e.target.value })} className="mt-1.5" placeholder="/signup" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Secondary CTA Text</Label>
                    <Input value={data.ctaSecondaryText || ""} onChange={(e) => onUpdate({ ...data, ctaSecondaryText: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                    <Label>Secondary CTA Link</Label>
                    <Input value={data.ctaSecondaryLink || ""} onChange={(e) => onUpdate({ ...data, ctaSecondaryLink: e.target.value })} className="mt-1.5" placeholder="#features" />
                </div>
            </div>
        </div>
    );
}

// Features Editor
function FeaturesEditor({ data, onUpdate }: { data: any; onUpdate: (d: any) => void }) {
    const items = data.items || [];

    const addItem = () => onUpdate({ ...data, items: [...items, { icon: "Zap", title: "", description: "" }] });
    const removeItem = (i: number) => onUpdate({ ...data, items: items.filter((_: any, idx: number) => idx !== i) });
    const updateItem = (i: number, field: string, value: string) => {
        const newItems = [...items];
        newItems[i] = { ...newItems[i], [field]: value };
        onUpdate({ ...data, items: newItems });
    };

    return (
        <div className="space-y-4 max-w-2xl">
            <h3 className="font-semibold text-gray-900 text-lg">Features Section</h3>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Section Title</Label>
                    <Input value={data.sectionTitle || ""} onChange={(e) => onUpdate({ ...data, sectionTitle: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                    <Label>Columns</Label>
                    <Select value={String(data.columns || 3)} onValueChange={(v) => onUpdate({ ...data, columns: Number(v) })}>
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2">2 Columns</SelectItem>
                            <SelectItem value="3">3 Columns</SelectItem>
                            <SelectItem value="4">4 Columns</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div>
                <Label>Section Subtitle</Label>
                <Input value={data.sectionSubtitle || ""} onChange={(e) => onUpdate({ ...data, sectionSubtitle: e.target.value })} className="mt-1.5" />
            </div>
            <div className="flex items-center justify-between">
                <Label>Feature Items</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add</Button>
            </div>
            <div className="space-y-3">
                {items.map((item: any, i: number) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg border space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Feature {i + 1}</span>
                            <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Select value={item.icon || "Zap"} onValueChange={(v) => updateItem(i, "icon", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{iconOptions.map((ic) => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}</SelectContent>
                            </Select>
                            <Input value={item.title || ""} onChange={(e) => updateItem(i, "title", e.target.value)} placeholder="Title" />
                            <Input value={item.description || ""} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Description" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Stats Editor
function StatsEditor({ data, onUpdate }: { data: any; onUpdate: (d: any) => void }) {
    const items = data.items || [];

    const addItem = () => onUpdate({ ...data, items: [...items, { value: "", label: "", icon: "TrendingUp" }] });
    const removeItem = (i: number) => onUpdate({ ...data, items: items.filter((_: any, idx: number) => idx !== i) });
    const updateItem = (i: number, field: string, value: string) => {
        const newItems = [...items];
        newItems[i] = { ...newItems[i], [field]: value };
        onUpdate({ ...data, items: newItems });
    };

    return (
        <div className="space-y-4 max-w-2xl">
            <h3 className="font-semibold text-gray-900 text-lg">Stats Section</h3>
            <div>
                <Label>Background</Label>
                <Select value={data.backgroundColor || "primary"} onValueChange={(v) => onUpdate({ ...data, backgroundColor: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="primary">Primary Color</SelectItem>
                        <SelectItem value="secondary">Secondary Color</SelectItem>
                        <SelectItem value="white">White</SelectItem>
                        <SelectItem value="gray">Gray</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center justify-between">
                <Label>Stat Items</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add</Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {items.map((item: any, i: number) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg border space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Stat {i + 1}</span>
                            <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                        </div>
                        <Input value={item.value || ""} onChange={(e) => updateItem(i, "value", e.target.value)} placeholder="10K+" />
                        <Input value={item.label || ""} onChange={(e) => updateItem(i, "label", e.target.value)} placeholder="Active Users" />
                        <Select value={item.icon || "TrendingUp"} onValueChange={(v) => updateItem(i, "icon", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{iconOptions.map((ic) => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Testimonial Editor
function TestimonialEditor({ data, onUpdate }: { data: any; onUpdate: (d: any) => void }) {
    return (
        <div className="space-y-4 max-w-2xl">
            <h3 className="font-semibold text-gray-900 text-lg">Testimonial</h3>
            <div>
                <Label>Quote</Label>
                <Textarea value={data.quote || ""} onChange={(e) => onUpdate({ ...data, quote: e.target.value })} className="mt-1.5" rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Author Name</Label>
                    <Input value={data.author || ""} onChange={(e) => onUpdate({ ...data, author: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                    <Label>Author Role</Label>
                    <Input value={data.role || ""} onChange={(e) => onUpdate({ ...data, role: e.target.value })} className="mt-1.5" placeholder="CEO, Company" />
                </div>
            </div>
            <div>
                <Label>Rating (1-5)</Label>
                <Select value={String(data.rating || 5)} onValueChange={(v) => onUpdate({ ...data, rating: Number(v) })}>
                    <SelectTrigger className="mt-1.5 w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n} Star{n > 1 ? "s" : ""}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

// FAQ Editor
function FaqEditor({ data, onUpdate }: { data: any; onUpdate: (d: any) => void }) {
    const items = data.items || [];

    const addItem = () => onUpdate({ ...data, items: [...items, { question: "", answer: "" }] });
    const removeItem = (i: number) => onUpdate({ ...data, items: items.filter((_: any, idx: number) => idx !== i) });
    const updateItem = (i: number, field: string, value: string) => {
        const newItems = [...items];
        newItems[i] = { ...newItems[i], [field]: value };
        onUpdate({ ...data, items: newItems });
    };

    return (
        <div className="space-y-4 max-w-2xl">
            <h3 className="font-semibold text-gray-900 text-lg">FAQ Section</h3>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Section Title</Label>
                    <Input value={data.sectionTitle || ""} onChange={(e) => onUpdate({ ...data, sectionTitle: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                    <Label>Section Subtitle</Label>
                    <Input value={data.sectionSubtitle || ""} onChange={(e) => onUpdate({ ...data, sectionSubtitle: e.target.value })} className="mt-1.5" />
                </div>
            </div>
            <div className="flex items-center justify-between">
                <Label>FAQ Items</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add</Button>
            </div>
            <div className="space-y-3">
                {items.map((item: any, i: number) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg border space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">FAQ {i + 1}</span>
                            <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                        </div>
                        <Input value={item.question || ""} onChange={(e) => updateItem(i, "question", e.target.value)} placeholder="Question" />
                        <Textarea value={item.answer || ""} onChange={(e) => updateItem(i, "answer", e.target.value)} placeholder="Answer" rows={2} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// CTA Editor
function CtaEditor({ data, onUpdate }: { data: any; onUpdate: (d: any) => void }) {
    return (
        <div className="space-y-4 max-w-2xl">
            <h3 className="font-semibold text-gray-900 text-lg">Call to Action</h3>
            <div>
                <Label>Headline</Label>
                <Input value={data.headline || ""} onChange={(e) => onUpdate({ ...data, headline: e.target.value })} className="mt-1.5" />
            </div>
            <div>
                <Label>Subheadline</Label>
                <Textarea value={data.subheadline || ""} onChange={(e) => onUpdate({ ...data, subheadline: e.target.value })} className="mt-1.5" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>CTA Button Text</Label>
                    <Input value={data.ctaText || ""} onChange={(e) => onUpdate({ ...data, ctaText: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                    <Label>CTA Button Link</Label>
                    <Input value={data.ctaLink || ""} onChange={(e) => onUpdate({ ...data, ctaLink: e.target.value })} className="mt-1.5" placeholder="/signup" />
                </div>
            </div>
            <div>
                <Label>Background</Label>
                <Select value={data.backgroundColor || "gray"} onValueChange={(v) => onUpdate({ ...data, backgroundColor: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="primary">Primary Color</SelectItem>
                        <SelectItem value="secondary">Secondary Color</SelectItem>
                        <SelectItem value="gray">Gray</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

// Text Editor
function TextEditor({ data, onUpdate }: { data: any; onUpdate: (d: any) => void }) {
    return (
        <div className="space-y-4 max-w-2xl">
            <h3 className="font-semibold text-gray-900 text-lg">Text Block</h3>
            <div>
                <Label>Content</Label>
                <Textarea value={data.content || ""} onChange={(e) => onUpdate({ ...data, content: e.target.value })} className="mt-1.5 font-mono text-sm" rows={10} placeholder="Markdown or HTML content..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Alignment</Label>
                    <Select value={data.alignment || "left"} onValueChange={(v) => onUpdate({ ...data, alignment: v })}>
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Max Width</Label>
                    <Select value={data.maxWidth || "lg"} onValueChange={(v) => onUpdate({ ...data, maxWidth: v })}>
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sm">Small</SelectItem>
                            <SelectItem value="md">Medium</SelectItem>
                            <SelectItem value="lg">Large</SelectItem>
                            <SelectItem value="full">Full Width</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}

// Pricing Editor
function PricingEditor({ data, onUpdate }: { data: any; onUpdate: (d: any) => void }) {
    return (
        <div className="space-y-4 max-w-2xl">
            <h3 className="font-semibold text-gray-900 text-lg">Pricing Section</h3>
            <p className="text-sm text-gray-500">This block automatically pulls pricing plans from your subscription settings.</p>
            <div>
                <Label>Section Title</Label>
                <Input value={data.sectionTitle || ""} onChange={(e) => onUpdate({ ...data, sectionTitle: e.target.value })} className="mt-1.5" />
            </div>
            <div>
                <Label>Section Subtitle</Label>
                <Input value={data.sectionSubtitle || ""} onChange={(e) => onUpdate({ ...data, sectionSubtitle: e.target.value })} className="mt-1.5" />
            </div>
            <div className="flex items-center gap-3">
                <Switch checked={data.showAnnualToggle || false} onCheckedChange={(v) => onUpdate({ ...data, showAnnualToggle: v })} />
                <Label>Show Monthly/Annual Toggle</Label>
            </div>
        </div>
    );
}

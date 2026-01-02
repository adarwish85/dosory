"use client";

import { useEditor } from "@/app/sa/website-builder/editor-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { MediaLibrary } from "@/components/sa/media-library";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon } from "lucide-react";

export function EditorProperties() {
    const { sections, selectedSectionId, updateSection } = useEditor();

    const selectedSection = sections.find(s => s.id === selectedSectionId);

    if (!selectedSectionId || !selectedSection) {
        return (
            <div className="p-8 text-center text-muted-foreground text-sm">
                Select a section to edit its properties.
            </div>
        );
    }

    const { type, config } = selectedSection;

    const handleChange = (key: string, value: any) => {
        updateSection(selectedSectionId, {
            config: { ...config, [key]: value }
        });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b bg-muted/10">
                <h2 className="font-semibold text-sm capitalize">{type} Properties</h2>
                <p className="text-xs text-muted-foreground truncate">ID: {selectedSectionId}</p>
            </div>

            <div className="p-4 space-y-6 flex-1 overflow-auto">
                {type === "hero" && (
                    <>
                        <div className="space-y-2">
                            <Label>Headline</Label>
                            <Input
                                value={config.headline || ""}
                                onChange={(e) => handleChange("headline", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Subheadline</Label>
                            <Textarea
                                value={config.subheadline || ""}
                                onChange={(e) => handleChange("subheadline", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>CTA Text</Label>
                            <Input
                                value={config.ctaText || ""}
                                onChange={(e) => handleChange("ctaText", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>CTA Link</Label>
                            <Input
                                value={config.ctaLink || ""}
                                onChange={(e) => handleChange("ctaLink", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Background Image</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={config.backgroundImage || ""}
                                    onChange={(e) => handleChange("backgroundImage", e.target.value)}
                                    placeholder="https://..."
                                />
                                <MediaLibrary
                                    onSelect={(url) => handleChange("backgroundImage", url)}
                                    trigger={<Button size="icon" variant="outline"><ImageIcon className="h-4 w-4" /></Button>}
                                />
                            </div>
                        </div>
                    </>
                )}

                {type === "features" && (
                    <>
                        <div className="space-y-2">
                            <Label>Section Title</Label>
                            <Input
                                value={config.title || ""}
                                onChange={(e) => handleChange("title", e.target.value)}
                            />
                        </div>
                        <div className="space-y-4 pt-4">
                            <Label>Features List</Label>
                            {(config.features || []).map((f: any, i: number) => (
                                <div key={i} className="p-3 border rounded-md space-y-2 bg-muted/20">
                                    <Input
                                        placeholder="Feature Title"
                                        value={f.title}
                                        onChange={(e) => {
                                            const newFeatures = [...(config.features || [])];
                                            newFeatures[i].title = e.target.value;
                                            handleChange("features", newFeatures);
                                        }}
                                    />
                                    <Textarea
                                        placeholder="Description"
                                        value={f.description}
                                        onChange={(e) => {
                                            const newFeatures = [...(config.features || [])];
                                            newFeatures[i].description = e.target.value;
                                            handleChange("features", newFeatures);
                                        }}
                                        className="h-16 text-xs"
                                    />
                                </div>
                            ))}
                            <button
                                className="text-xs text-primary hover:underline w-full text-center"
                                onClick={() => {
                                    const newFeatures = [...(config.features || []), { title: "New Feature", description: "" }];
                                    handleChange("features", newFeatures);
                                }}
                            >
                                + Add Feature
                            </button>
                        </div>
                    </>
                )}

                {type === "text" && (
                    <div className="space-y-2">
                        <Label>Content (HTML)</Label>
                        <Textarea
                            className="font-mono text-xs h-60"
                            value={config.content || ""}
                            onChange={(e) => handleChange("content", e.target.value)}
                        />
                    </div>
                )}

                {type === "cta" && (
                    <>
                        <div className="space-y-2">
                            <Label>Headline</Label>
                            <Input value={config.headline || ""} onChange={(e) => handleChange("headline", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Subheadline</Label>
                            <Textarea value={config.subheadline || ""} onChange={(e) => handleChange("subheadline", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Button Text</Label>
                            <Input value={config.buttonText || ""} onChange={(e) => handleChange("buttonText", e.target.value)} />
                        </div>
                    </>
                )}

                {type === "pricing" && (
                    <>
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={config.title || ""} onChange={(e) => handleChange("title", e.target.value)} />
                        </div>
                        <div className="space-y-4 pt-4">
                            <Label>Plans (JSON)</Label>
                            <Textarea
                                className="font-mono text-xs h-40"
                                placeholder='[{"name": "Pro", "price": "$10"}]'
                                value={JSON.stringify(config.plans || [], null, 2)}
                                onChange={(e) => {
                                    try {
                                        handleChange("plans", JSON.parse(e.target.value));
                                    } catch (err) {
                                        // Ignore parse errors while typing
                                    }
                                }}
                            />
                            <p className="text-[10px] text-muted-foreground">Edit as JSON for V1. Visual list builder coming soon.</p>
                        </div>
                    </>
                )}

                {type === "testimonials" && (
                    <>
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={config.title || ""} onChange={(e) => handleChange("title", e.target.value)} />
                        </div>
                        <div className="space-y-4 pt-4">
                            <Label>Testimonials (JSON)</Label>
                            <Textarea
                                className="font-mono text-xs h-40"
                                value={JSON.stringify(config.testimonials || [], null, 2)}
                                onChange={(e) => {
                                    try { handleChange("testimonials", JSON.parse(e.target.value)); } catch (err) { }
                                }}
                            />
                        </div>
                    </>
                )}

                {type === "faq" && (
                    <>
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={config.title || ""} onChange={(e) => handleChange("title", e.target.value)} />
                        </div>
                        <div className="space-y-4 pt-4">
                            <Label>FAQ Items (JSON)</Label>
                            <Textarea
                                className="font-mono text-xs h-40"
                                value={JSON.stringify(config.items || [], null, 2)}
                                onChange={(e) => {
                                    try { handleChange("items", JSON.parse(e.target.value)); } catch (err) { }
                                }}
                            />
                        </div>
                    </>
                )}

                {/* Fallback for other types */}
                {!["hero", "features", "text", "cta", "pricing", "testimonials", "faq"].includes(type) && (
                    <div className="text-sm text-muted-foreground p-4 border border-dashed rounded bg-muted/10">
                        Generic Config Editor coming soon.
                    </div>
                )}

                <Separator />

                <div className="space-y-2">
                    <Label>Styles (CSS Class)</Label>
                    <Input
                        placeholder="e.g. bg-blue-50"
                        value={config.className || ""}
                        onChange={(e) => handleChange("className", e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}

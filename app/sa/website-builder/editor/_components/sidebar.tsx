"use client";

import { useEditor } from "@/app/sa/website-builder/editor-context";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Type, Layout, Image, Youtube, AlignJustify,
    GripVertical, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const SECTIONS = [
    { type: "hero", labelKey: "sa.websiteBuilder.sidebar.heroBanner", icon: Layout },
    { type: "features", labelKey: "sa.websiteBuilder.sidebar.featuresGrid", icon: AlignJustify },
    { type: "text", labelKey: "sa.websiteBuilder.sidebar.richText", icon: Type },
    { type: "cta", labelKey: "sa.websiteBuilder.sidebar.callToAction", icon: Layout },
    { type: "testimonials", labelKey: "sa.websiteBuilder.sidebar.testimonials", icon: Layout },
    { type: "faq", labelKey: "sa.websiteBuilder.sidebar.faqAccordion", icon: AlignJustify },
];

export function EditorSidebar() {
    const { t } = useTranslation();
    const {
        sections, selectedSectionId, selectSection,
        addSection, deleteSection, reorderSections
    } = useEditor();

    // In V2: Implement Drag and Drop reordering using dnd-kit
    // For V1: Simple list with click to select

    return (
        <div className="flex flex-col h-full bg-muted/10">
            <div className="p-4 border-b">
                <h2 className="font-semibold text-sm mb-2">{t("sa.websiteBuilder.sidebar.addContent")}</h2>
                <div className="grid grid-cols-2 gap-2">
                    {SECTIONS.map(item => (
                        <Button
                            key={item.type}
                            variant="outline"
                            size="sm"
                            className="justify-start h-8 text-xs"
                            onClick={() => addSection(item.type as any)}
                        >
                            <item.icon className="mr-2 h-3 w-3" />
                            {t(item.labelKey)}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="p-2 bg-muted/20 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("sa.websiteBuilder.sidebar.layers", { count: sections.length })}
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {sections.length === 0 && (
                            <div className="text-xs text-center p-4 text-muted-foreground">
                                {t("sa.websiteBuilder.sidebar.emptyLayers")}
                            </div>
                        )}
                        {sections.map((section, index) => (
                            <div
                                key={section.id}
                                className={cn(
                                    "flex items-center gap-2 p-2 rounded-md text-sm border hover:bg-muted/50 cursor-pointer group transition-colors",
                                    selectedSectionId === section.id
                                        ? "bg-primary/10 border-primary/50 text-primary"
                                        : "bg-background border-transparent"
                                )}
                                onClick={() => selectSection(section.id)}
                            >
                                <span className="text-xs text-muted-foreground w-4 text-center">{index + 1}</span>
                                <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                                <span className="flex-1 truncate font-medium capitalize">
                                    {t("sa.websiteBuilder.sidebar.sectionLabel", { type: section.type })}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSection(section.id);
                                    }}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

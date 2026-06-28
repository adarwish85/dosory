"use client";

import { use, useEffect } from "react";
import { EditorProvider, useEditor } from "@/app/sa/website-builder/editor-context";
import { Button } from "@/components/ui/button";
import { Loader2, Monitor, Smartphone, Tablet, ChevronLeft, Save, Globe } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

// Sub-components (mocked for now, will extract)
import { EditorSidebar } from "../_components/sidebar";
import { EditorCanvas } from "../_components/canvas";
import { EditorProperties } from "../_components/properties";

export default function EditorPage({ params }: { params: Promise<{ pageId: string }> }) {
    const resolvedParams = use(params);
    return (
        <EditorProvider pageId={resolvedParams.pageId}>
            <EditorShell />
        </EditorProvider>
    );
}

function EditorShell() {
    const { t } = useTranslation();
    const { page, deviceMode, setDeviceMode, savePage, publishPage, isLoading, isSaving } = useEditor();

    if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    if (!page) return <div>{t("sa.websiteBuilder.pageNotFound")}</div>;

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-background">
            {/* Top Bar */}
            <header className="h-14 border-b flex items-center justify-between px-4 bg-background shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <Link href="/sa/website-builder">
                        <Button variant="ghost" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
                    </Link>
                    <div>
                        <h1 className="font-semibold text-sm">{page.title}</h1>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {page.status === "published" && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                            {page.status === "draft" && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
                            {page.status}
                        </p>
                    </div>
                </div>

                <div className="flex bg-muted/50 p-1 rounded-md">
                    <Button
                        variant={deviceMode === "desktop" ? "secondary" : "ghost"}
                        size="icon" className="h-7 w-7"
                        onClick={() => setDeviceMode("desktop")}
                    ><Monitor className="h-4 w-4" /></Button>
                    <Button
                        variant={deviceMode === "tablet" ? "secondary" : "ghost"}
                        size="icon" className="h-7 w-7"
                        onClick={() => setDeviceMode("tablet")}
                    ><Tablet className="h-4 w-4" /></Button>
                    <Button
                        variant={deviceMode === "mobile" ? "secondary" : "ghost"}
                        size="icon" className="h-7 w-7"
                        onClick={() => setDeviceMode("mobile")}
                    ><Smartphone className="h-4 w-4" /></Button>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => savePage()} disabled={isSaving}>
                        <Save className="mr-2 h-3.5 w-3.5" /> {t("common.save")}
                    </Button>
                    <Button size="sm" onClick={() => publishPage()} disabled={isSaving}>
                        <Globe className="mr-2 h-3.5 w-3.5" /> {t("sa.websiteBuilder.publish")}
                    </Button>
                </div>
            </header>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Components/Layers */}
                <div className="w-[280px] border-r bg-muted/5 flex flex-col shrink-0">
                    <EditorSidebar />
                </div>

                {/* Center Canvas */}
                <div className="flex-1 bg-muted/20 overflow-auto p-8 relative flex flex-col items-center">
                    <EditorCanvas />
                </div>

                {/* Right Sidebar: Properties */}
                <div className="w-[320px] border-l bg-background flex flex-col shrink-0 overflow-y-auto">
                    <EditorProperties />
                </div>
            </div>
        </div>
    );
}

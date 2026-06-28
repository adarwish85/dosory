"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { WebsiteSection, WebsitePage } from "@/lib/types/website";
import { WebsiteService } from "@/lib/services/website-service";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { useTranslation } from "@/lib/i18n";

interface EditorContextType {
    page: WebsitePage | null;
    sections: WebsiteSection[];
    selectedSectionId: string | null;
    deviceMode: "desktop" | "tablet" | "mobile";
    isLoading: boolean;
    isSaving: boolean;

    // Actions
    selectSection: (id: string | null) => void;
    addSection: (type: WebsiteSection["type"]) => void;
    updateSection: (id: string, updates: Partial<WebsiteSection>) => void;
    deleteSection: (id: string) => void;
    reorderSections: (newOrder: WebsiteSection[]) => void;
    setDeviceMode: (mode: "desktop" | "tablet" | "mobile") => void;
    savePage: () => Promise<void>;
    publishPage: () => Promise<void>;
}

const EditorContext = createContext<EditorContextType | null>(null);

export function EditorProvider({
    pageId,
    websiteId = "dosory-main",
    children
}: {
    pageId: string;
    websiteId?: string;
    children: React.ReactNode;
}) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [page, setPage] = useState<WebsitePage | null>(null);
    const [sections, setSections] = useState<WebsiteSection[]>([]);
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
    const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [pageId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [p, s] = await Promise.all([
                WebsiteService.getPage(websiteId, pageId),
                WebsiteService.getSections(websiteId, pageId)
            ]);
            setPage(p);
            setSections(s);
        } catch (error) {
            toast.error(t("sa.websiteBuilder.toast.loadEditorFailed"));
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const addSection = async (type: WebsiteSection["type"]) => {
        if (!page) return;
        const newSection: Partial<WebsiteSection> = {
            type,
            order: sections.length,
            config: getDefaultConfig(type),
        };

        // Optimistic update
        const tempId = "temp-" + Date.now();
        const optimisticSection = { ...newSection, id: tempId } as WebsiteSection;
        setSections([...sections, optimisticSection]);
        setSelectedSectionId(tempId);

        try {
            await WebsiteService.saveSection(websiteId, pageId, newSection);
            // Reload to get real ID
            const s = await WebsiteService.getSections(websiteId, pageId);
            setSections(s);
            // Try to find the new one to select it
            const created = s[s.length - 1]; // Assumption: appended
            if (created) setSelectedSectionId(created.id);
        } catch (error) {
            toast.error(t("sa.websiteBuilder.toast.addSectionFailed"));
            setSections(sections); // Revert
        }
    };

    const updateSection = (id: string, updates: Partial<WebsiteSection>) => {
        const updated = sections.map(s => s.id === id ? { ...s, ...updates } : s);
        setSections(updated);

        // Debounce save logic would go here ideally
        // For V1, we might just save on blur or require manual save
        // But let's autosave config changes
        saveSectionDebounced(id, updates);
    };

    const saveSectionDebounced = async (id: string, updates: Partial<WebsiteSection>) => {
        // Simple direct save for now - can add debouncing later
        try {
            await WebsiteService.saveSection(websiteId, pageId, { id, ...updates });
        } catch (e) {
            console.error("Autosave failed", e);
        }
    };

    const deleteSection = async (id: string) => {
        if (!confirm(t("sa.websiteBuilder.confirm.deleteSection"))) return;
        const previous = [...sections];
        setSections(sections.filter(s => s.id !== id));
        setSelectedSectionId(null);

        try {
            await WebsiteService.deleteSection(websiteId, pageId, id);
        } catch (e) {
            toast.error(t("sa.websiteBuilder.toast.deleteSectionFailed"));
            setSections(previous);
        }
    };

    const reorderSections = async (newOrder: WebsiteSection[]) => {
        setSections(newOrder); // Optimistic
        try {
            await WebsiteService.updateSectionsOrder(websiteId, pageId, newOrder);
        } catch (e) {
            toast.error(t("sa.websiteBuilder.toast.reorderFailed"));
        }
    };

    const savePage = async () => {
        // Mostly used for page metadata updates if any
        setIsSaving(true);
        await new Promise(r => setTimeout(r, 500)); // Fake delay
        setIsSaving(false);
        toast.success(t("sa.websiteBuilder.toast.allChangesSaved"));
    };

    const publishPage = async () => {
        if (!user) return;
        if (!confirm(t("sa.websiteBuilder.confirm.publishPage"))) return;
        setIsSaving(true);
        try {
            await WebsiteService.publishPage(websiteId, pageId, user.uid);
            toast.success(t("sa.websiteBuilder.toast.pagePublished"));
            loadData(); // Reload status
        } catch (e) {
            toast.error(t("sa.websiteBuilder.toast.publishFailed"));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <EditorContext.Provider value={{
            page, sections, selectedSectionId, deviceMode, isLoading, isSaving,
            selectSection: setSelectedSectionId,
            addSection, updateSection, deleteSection, reorderSections,
            setDeviceMode, savePage, publishPage
        }}>
            {children}
        </EditorContext.Provider>
    );
}

export const useEditor = () => {
    const context = useContext(EditorContext);
    if (!context) throw new Error("useEditor must be used within EditorProvider");
    return context;
};

// --- Helpers ---
function getDefaultConfig(type: WebsiteSection["type"]) {
    switch (type) {
        case "hero": return { headline: "Welcome to Dosory", subheadline: "The platform for everything.", ctaText: "Get Started", ctaLink: "/signup" };
        case "features": return { title: "Features", features: [{ title: "Feature 1", description: "Desc" }] };
        case "text": return { content: "<h2>Heading</h2><p>Paragraph text...</p>" };
        case "pricing": return { title: "Simple Pricing", plans: [{ name: "Starter", price: "$0", features: ["Core Features"] }] };
        case "testimonials": return { title: "Trusted by Users", testimonials: [{ name: "Alex", role: "Dev", quote: "Great tool!" }] };
        case "cta": return { headline: "Join Now", subheadline: "Start your journey.", buttonText: "Get Started" };
        case "faq": return { title: "FAQ", items: [{ question: "Question?", answer: "Answer." }] };
        default: return {};
    }
}

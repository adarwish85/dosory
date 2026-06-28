"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { SETUP_MENU_STRUCTURE, type SetupMenuItem } from "@/lib/setup-menu-config";
import { useTranslation } from "@/lib/i18n";

interface SetupSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    topOffset: string; // e.g. "top-14"
}

export function SetupSidebar({ isOpen, onClose, topOffset }: SetupSidebarProps) {
    const pathname = usePathname();
    const { t } = useTranslation();
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    // Auto-expand categories that contain the current page
    const isItemActive = (item: SetupMenuItem): boolean => {
        if (item.href && pathname.startsWith(item.href)) return true;
        if (item.children) {
            return item.children.some((child) => isItemActive(child));
        }
        return false;
    };

    // Toggle category expansion
    const toggleCategory = (id: string) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Render menu item recursively
    const renderMenuItem = (item: SetupMenuItem, level: number = 0) => {
        const isExpanded = expandedCategories.has(item.id);
        const isActive = isItemActive(item);
        const hasChildren = item.children && item.children.length > 0;
        const Icon = item.icon;

        // Category (no href, has children)
        if (!item.href && hasChildren) {
            return (
                <div key={item.id} className={cn("mb-0.5", level > 0 && "ml-4")}>
                    <button
                        onClick={() => toggleCategory(item.id)}
                        className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            level === 0 && "font-semibold",
                            isActive
                                ? "bg-white text-[#0A66C2] shadow-sm ring-1 ring-gray-100"
                                : "text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                        )}
                    >
                        <span className="flex items-center gap-2">
                            {Icon && <Icon className="h-4 w-4" />}
                            <span>{item.label}</span>
                            {item.badge && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">
                                    {item.badge}
                                </span>
                            )}
                        </span>
                        {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                    </button>
                    {isExpanded && (
                        <div className="mt-1 space-y-0.5">
                            {item.children?.map((child) => renderMenuItem(child, level + 1))}
                        </div>
                    )}
                </div>
            );
        }

        // Leaf item (has href)
        if (item.href) {
            const isLeafActive = pathname.startsWith(item.href);

            // If this item has children (submenu), show chevron
            if (hasChildren) {
                return (
                    <div key={item.id} className={cn("mb-0.5", level > 0 && "ml-4")}>
                        <button
                            onClick={() => toggleCategory(item.id)}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                                level === 0 ? "font-medium" : "font-normal",
                                isLeafActive
                                    ? "bg-white text-[#0A66C2] shadow-sm ring-1 ring-gray-100"
                                    : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                            )}
                        >
                            <Link href={item.href} className="flex-1 flex items-center gap-2">
                                {Icon && <Icon className="h-4 w-4" />}
                                <span>{item.label}</span>
                                {item.badge && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                        </button>
                        {isExpanded && (
                            <div className="mt-1 space-y-0.5">
                                {item.children?.map((child) => renderMenuItem(child, level + 1))}
                            </div>
                        )}
                    </div>
                );
            }

            // Simple leaf item (no children)
            return (
                <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5",
                        level === 0 ? "font-medium" : "font-normal",
                        level > 0 && "ml-4",
                        isLeafActive
                            ? "bg-white text-[#0A66C2] shadow-sm ring-1 ring-gray-100"
                            : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                    )}
                >
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{item.label}</span>
                    {item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">
                            {item.badge}
                        </span>
                    )}
                </Link>
            );
        }

        return null;
    };

    return (
        <aside
            className={cn(
                "fixed left-0 z-[60] bottom-0 w-[260px] bg-[#F8F9FB] border-r border-gray-200 shadow-2xl transition-transform duration-300 flex flex-col",
                topOffset,
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}
        >
            <div className="flex items-center justify-between px-4 py-4 border-b bg-white">
                <h2 className="font-bold text-lg text-gray-900">{t("dashboard.setup.title")}</h2>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="h-5 w-5 text-gray-500" />
                </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
                {SETUP_MENU_STRUCTURE.map((item) => renderMenuItem(item, 0))}
            </nav>
            <div className="px-4 py-3 border-t bg-white text-xs text-gray-500">
                <p>{t("dashboard.setup.footerTitle")}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{t("dashboard.setup.footerSubtitle")}</p>
            </div>
        </aside>
    );
}

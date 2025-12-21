"use client";

import { useState, useRef, useEffect } from "react";
import { X, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingTooltipProps {
    id: string;
    content: string;
    position?: "top" | "bottom" | "left" | "right";
    children: React.ReactNode;
    show?: boolean;
    onDismiss?: () => void;
}

export default function OnboardingTooltip({
    id,
    content,
    position = "bottom",
    children,
    show = true,
    onDismiss,
}: OnboardingTooltipProps) {
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Check if already dismissed from localStorage
        const dismissedTips = JSON.parse(localStorage.getItem("dismissed-tips") || "[]");
        if (dismissedTips.includes(id)) {
            setDismissed(true);
        } else if (show) {
            // Show tooltip after a short delay
            const timer = setTimeout(() => setVisible(true), 500);
            return () => clearTimeout(timer);
        }
    }, [id, show]);

    const handleDismiss = () => {
        setVisible(false);
        const dismissedTips = JSON.parse(localStorage.getItem("dismissed-tips") || "[]");
        localStorage.setItem("dismissed-tips", JSON.stringify([...dismissedTips, id]));
        setDismissed(true);
        onDismiss?.();
    };

    if (dismissed) return <>{children}</>;

    const positionClasses = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
        left: "right-full top-1/2 -translate-y-1/2 mr-2",
        right: "left-full top-1/2 -translate-y-1/2 ml-2",
    };

    const arrowClasses = {
        top: "bottom-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-blue-600",
        bottom: "top-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-blue-600",
        left: "right-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-blue-600",
        right: "left-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-blue-600",
    };

    return (
        <div className="relative inline-block">
            {children}
            {visible && (
                <div
                    ref={tooltipRef}
                    className={cn(
                        "absolute z-50 animate-in fade-in-0 zoom-in-95",
                        positionClasses[position]
                    )}
                >
                    <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-xl max-w-xs">
                        <div className="flex items-start gap-2">
                            <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm">{content}</p>
                            </div>
                            <button
                                onClick={handleDismiss}
                                className="p-1 hover:bg-white/20 rounded"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                    <div
                        className={cn(
                            "absolute w-0 h-0 border-[6px]",
                            arrowClasses[position]
                        )}
                    />
                </div>
            )}
        </div>
    );
}

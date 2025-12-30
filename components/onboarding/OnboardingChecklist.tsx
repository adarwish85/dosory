import { useState, useEffect } from "react";
import { CheckCircle, Circle, ChevronRight, X, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboardingContext } from "./OnboardingProvider";
import { ADMIN_STEPS, STAFF_STEPS } from "@/lib/onboarding-types";
import { cn } from "@/lib/utils";
import Link from "next/link";

const STEP_LINKS: Record<string, string> = {
    welcome: "/dashboard",
    companyProfile: "/dashboard/setup/settings",
    firstRecord: "/dashboard/customers",
    inviteTeam: "/dashboard/setup/staff",
    integrations: "/dashboard/setup/settings",
};

export default function OnboardingChecklist() {
    const { state, progress, completeStep, skipOnboarding } = useOnboardingContext();
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 24, y: 24 }); // Bottom-right offset
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging) return;

            const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

            const deltaX = dragStart.x - clientX;
            const deltaY = dragStart.y - clientY;

            setPosition((prev) => ({
                x: Math.max(24, prev.x + deltaX),
                y: Math.max(24, prev.y + deltaY),
            }));

            setDragStart({ x: clientX, y: clientY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
            window.addEventListener("touchmove", handleMouseMove);
            window.addEventListener("touchend", handleMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("touchmove", handleMouseMove);
            window.removeEventListener("touchend", handleMouseUp);
        };
    }, [isDragging, dragStart]);

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        // Only allow dragging the closed button
        if (isOpen) return;

        setIsDragging(true);
        const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        setDragStart({ x: clientX, y: clientY });
    };

    if (state.completed || state.skippedAt) return null;

    const steps = state.role === "admin" ? ADMIN_STEPS : STAFF_STEPS;
    const completedCount = Object.values(state.steps).filter(Boolean).length;
    const remainingCount = steps.length - completedCount;

    if (!isOpen) {
        return (
            <div
                style={{
                    position: "fixed",
                    bottom: position.y,
                    right: position.x,
                    touchAction: "none",
                    zIndex: 50,
                }}
            >
                <Button
                    className={cn(
                        "h-14 w-14 rounded-full shadow-xl bg-[#0A66C2] hover:bg-[#004182] text-white transition-all duration-300 hover:scale-105",
                        isDragging ? "cursor-grabbing scale-105" : "cursor-grab"
                    )}
                    onClick={(e) => {
                        // Prevent click if we just dragged
                        if (!isDragging) setIsOpen(true);
                    }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleMouseDown}
                >
                    <Sparkles className="h-6 w-6" />
                    {remainingCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold border-2 border-white">
                            {remainingCount}
                        </span>
                    )}
                </Button>
            </div>
        );
    }

    return (
        <div
            className="fixed z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-5 fade-in-0 duration-200"
            style={{
                bottom: position.y + 20, // Open above the button position
                right: position.x,
            }}
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0A66C2] to-[#004182] p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        <h3 className="font-semibold">Getting Started</h3>
                    </div>
                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/10"
                            onClick={() => setIsOpen(false)}
                        >
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/10"
                            onClick={skipOnboarding}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/20 rounded-full h-2">
                        <div
                            className="bg-white h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progress * 100}%` }}
                        />
                    </div>
                    <span className="text-sm font-medium">
                        {completedCount}/{steps.length}
                    </span>
                </div>
            </div>

            {/* Steps */}
            <div className="p-3 space-y-1 max-h-[60vh] overflow-y-auto">
                {steps.map((step, index) => {
                    const isComplete = state.steps[step.key as keyof typeof state.steps];
                    const isCurrent = state.currentStep === index;

                    return (
                        <Link
                            key={step.key}
                            href={STEP_LINKS[step.key] || "/dashboard"}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                                isComplete
                                    ? "bg-green-50 text-green-700"
                                    : isCurrent
                                      ? "bg-blue-50 text-blue-700"
                                      : "hover:bg-gray-50 text-gray-600"
                            )}
                        >
                            {isComplete ? (
                                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                            ) : (
                                <Circle
                                    className={cn(
                                        "h-5 w-5 flex-shrink-0",
                                        isCurrent ? "text-blue-500" : "text-gray-300"
                                    )}
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className={cn("text-sm font-medium", isComplete && "line-through opacity-70")}>
                                    {step.label}
                                </p>
                                <p className="text-xs opacity-70 truncate">{step.description}</p>
                            </div>
                            {!isComplete && <ChevronRight className="h-4 w-4 opacity-50 flex-shrink-0" />}
                        </Link>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="p-3 border-t bg-gray-50">
                <Button variant="ghost" size="sm" className="w-full text-gray-500 text-xs" onClick={skipOnboarding}>
                    Dismiss Guide
                </Button>
            </div>
        </div>
    );
}

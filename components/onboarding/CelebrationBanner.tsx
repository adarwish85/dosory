"use client";

import { useEffect, useState } from "react";
import { X, PartyPopper, CheckCircle, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CelebrationBannerProps {
    show: boolean;
    onClose: () => void;
    title: string;
    message: string;
    variant?: "milestone" | "complete";
}

export default function CelebrationBanner({
    show,
    onClose,
    title,
    message,
    variant = "milestone"
}: CelebrationBannerProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setVisible(true);
            // Auto-hide after 5 seconds
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(onClose, 300);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    if (!show) return null;

    return (
        <div
            className={cn(
                "fixed top-20 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300",
                visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
            )}
        >
            <div className={cn(
                "flex items-center gap-4 px-6 py-4 rounded-xl shadow-2xl",
                variant === "complete"
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                    : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
            )}>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    {variant === "complete" ? (
                        <Rocket className="h-6 w-6" />
                    ) : (
                        <PartyPopper className="h-6 w-6" />
                    )}
                </div>
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        {title}
                        <span className="text-2xl">🎉</span>
                    </h3>
                    <p className="text-sm opacity-90">{message}</p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="ml-4 text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => {
                        setVisible(false);
                        setTimeout(onClose, 300);
                    }}
                >
                    <X className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}

// Confetti effect animation (CSS-based)
export function ConfettiEffect({ show }: { show: boolean }) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[55]">
            <div className="confetti-container">
                {[...Array(50)].map((_, i) => (
                    <div
                        key={i}
                        className="confetti"
                        style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            backgroundColor: ["#FCD34D", "#60A5FA", "#34D399", "#F472B6", "#A78BFA"][
                                Math.floor(Math.random() * 5)
                            ],
                        }}
                    />
                ))}
            </div>
            <style jsx>{`
                .confetti-container {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                }
                .confetti {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    top: -10px;
                    animation: confetti-fall 3s ease-out forwards;
                }
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
}

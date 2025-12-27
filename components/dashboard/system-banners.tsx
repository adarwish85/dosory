"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AlertTriangle, AlertCircle, Info, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Banner {
    id: string;
    message: string;
    type: "info" | "warning" | "error" | "success";
    active: boolean;
}

export function SystemBanners() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Only fetch active banners
        const q = query(
            collection(db, "system_banners"),
            where("active", "==", true),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Banner[];
            setBanners(data);
        });

        return () => unsubscribe();
    }, []);

    const handleDismiss = (id: string) => {
        setDismissed(prev => new Set(prev).add(id));
    };

    const getBannerStyles = (type: string) => {
        switch (type) {
            case "warning": return "bg-orange-50 border-orange-100 text-orange-800";
            case "error": return "bg-red-50 border-red-100 text-red-800";
            case "success": return "bg-green-50 border-green-100 text-green-800";
            default: return "bg-blue-50 border-blue-100 text-blue-800";
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "warning": return <AlertTriangle className="h-4 w-4" />;
            case "error": return <AlertCircle className="h-4 w-4" />;
            case "success": return <CheckCircle className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    const visibleBanners = banners.filter(b => !dismissed.has(b.id));

    if (visibleBanners.length === 0) return null;

    return (
        <div className="flex flex-col gap-2 mb-4">
            {visibleBanners.map(banner => (
                <div
                    key={banner.id}
                    className={cn(
                        "flex items-center justify-between px-4 py-3 rounded-lg border shadow-sm animate-in fade-in slide-in-from-top-4 duration-300",
                        getBannerStyles(banner.type)
                    )}
                >
                    <div className="flex items-center gap-3">
                        {getIcon(banner.type)}
                        <span className="text-sm font-medium">{banner.message}</span>
                    </div>
                    <button
                        onClick={() => handleDismiss(banner.id)}
                        className="p-1 hover:bg-black/5 rounded-full transition-colors"
                    >
                        <X className="h-4 w-4 opacity-60" />
                    </button>
                </div>
            ))}
        </div>
    );
}

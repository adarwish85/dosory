"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualListProps<T> {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    height?: number | string;
    itemHeight?: number; // Estimated height
    className?: string;
    overscan?: number;
}

export function VirtualList<T>({
    items,
    renderItem,
    height = "100%",
    itemHeight = 50,
    className = "",
    overscan = 5,
}: VirtualListProps<T>) {
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => itemHeight,
        overscan,
    });

    return (
        <div ref={parentRef} className={`overflow-auto ${className}`} style={{ height }}>
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualItem) => (
                    <div
                        key={virtualItem.key}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                        }}
                    >
                        {renderItem(items[virtualItem.index])}
                    </div>
                ))}
            </div>
        </div>
    );
}

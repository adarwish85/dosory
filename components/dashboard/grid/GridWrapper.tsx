"use client";

import React, { useEffect, useRef, useState } from "react";
import RGL from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// Cast to any to bypass strict types that don't match actual component
const GridLayout = RGL as any;

export interface GridWrapperProps {
    layout: any[];
    cols?: number;
    rowHeight?: number;
    onLayoutChange?: (layout: any[]) => void;
    isDraggable?: boolean;
    isResizable?: boolean;
    draggableHandle?: string;
    margin?: [number, number];
    containerPadding?: [number, number];
    children: React.ReactNode;
    className?: string;
}

export function GridWrapper({
    layout,
    cols = 12,
    rowHeight = 80,
    onLayoutChange,
    isDraggable = false,
    isResizable = false,
    draggableHandle,
    margin = [16, 16],
    containerPadding = [0, 0],
    children,
    className,
}: GridWrapperProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(1200);

    // Measure container width for responsive behavior
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setWidth(containerRef.current.offsetWidth);
            }
        };

        updateWidth();
        window.addEventListener("resize", updateWidth);
        return () => window.removeEventListener("resize", updateWidth);
    }, []);

    return (
        <div ref={containerRef}>
            <GridLayout
                className={className}
                layout={layout}
                cols={cols}
                rowHeight={rowHeight}
                width={width}
                onLayoutChange={onLayoutChange as any}
                isDraggable={isDraggable}
                isResizable={isResizable}
                draggableHandle={draggableHandle}
                margin={margin}
                containerPadding={containerPadding}
            >
                {children}
            </GridLayout>
        </div>
    );
}

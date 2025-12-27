"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
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
    onDragStop?: (layout: any[]) => void;
    onResizeStop?: (layout: any[]) => void;
    isDraggable?: boolean;
    isResizable?: boolean;
    draggableHandle?: string;
    margin?: [number, number];
    containerPadding?: [number, number];
    children: React.ReactNode;
    className?: string;
}

// Breakpoints for responsive layout
const BREAKPOINTS = {
    lg: 1200,
    md: 996,
    sm: 768,
    xs: 480,
};

export function GridWrapper({
    layout,
    cols = 12,
    rowHeight = 80,
    onLayoutChange,
    onDragStop,
    onResizeStop,
    isDraggable = false,
    isResizable = false,
    draggableHandle,
    margin = [16, 16],
    containerPadding = [0, 0],
    children,
    className,
}: GridWrapperProps & { onDragStop?: (layout: any[]) => void; onResizeStop?: (layout: any[]) => void }) {
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

    // Responsive columns based on width
    const responsiveCols = useMemo(() => {
        if (width < BREAKPOINTS.xs) return 1;
        if (width < BREAKPOINTS.sm) return 2;
        if (width < BREAKPOINTS.md) return 6;
        return cols;
    }, [width, cols]);

    // Adjust layout for smaller screens - stack widgets
    const responsiveLayout = useMemo(() => {
        if (width < BREAKPOINTS.sm) {
            // Stack widgets vertically on mobile
            return layout.map((item, index) => ({
                ...item,
                x: 0,
                y: index * 3,
                w: responsiveCols,
                h: 3,
            }));
        }
        if (width < BREAKPOINTS.md) {
            // 2 columns on tablet
            return layout.map((item, index) => ({
                ...item,
                x: (index % 2) * 3,
                y: Math.floor(index / 2) * 3,
                w: 3,
                h: 3,
            }));
        }
        return layout;
    }, [layout, width, responsiveCols]);

    // Adjust row height for mobile
    const responsiveRowHeight = width < BREAKPOINTS.sm ? 100 : rowHeight;

    return (
        <div ref={containerRef} className="transition-all duration-300">
            <GridLayout
                className={className}
                layout={responsiveLayout}
                cols={responsiveCols}
                rowHeight={responsiveRowHeight}
                width={width}
                onLayoutChange={onLayoutChange as any}
                onDragStop={onDragStop}
                onResizeStop={onResizeStop}
                isDraggable={width >= BREAKPOINTS.sm && isDraggable}
                isResizable={width >= BREAKPOINTS.sm && isResizable}
                draggableHandle={draggableHandle}
                margin={width < BREAKPOINTS.sm ? [12, 12] : margin}
                containerPadding={containerPadding}
            >
                {children}
            </GridLayout>
        </div>
    );
}

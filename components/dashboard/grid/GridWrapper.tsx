"use client";

import React from "react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// Get WidthProvider from module
const ReactGridLayoutModule = require("react-grid-layout");
const WidthProvider = ReactGridLayoutModule.WidthProvider;
const ResponsiveGridLayout = WidthProvider(GridLayout);

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
    return (
        <ResponsiveGridLayout
            className={className}
            layout={layout}
            cols={cols}
            rowHeight={rowHeight}
            onLayoutChange={onLayoutChange}
            isDraggable={isDraggable}
            isResizable={isResizable}
            draggableHandle={draggableHandle}
            margin={margin}
            containerPadding={containerPadding}
        >
            {children}
        </ResponsiveGridLayout>
    );
}

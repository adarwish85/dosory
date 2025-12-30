"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type VariantProps } from "class-variance-authority";

export interface LoadingButtonProps
    extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
    /** Whether the button is in a loading state */
    loading?: boolean;
    /** Text to show while loading (optional, defaults to children) */
    loadingText?: string;
    /** Icon to show on the left side */
    icon?: React.ReactNode;
    /** Whether to render as child component */
    asChild?: boolean;
}

/**
 * Button component with built-in loading state
 * Automatically shows spinner and disables during async operations
 * 
 * @example
 * ```tsx
 * <LoadingButton loading={isSubmitting} onClick={handleSubmit}>
 *   Save Changes
 * </LoadingButton>
 * 
 * <LoadingButton 
 *   loading={isSubmitting} 
 *   loadingText="Saving..."
 *   icon={<Save className="h-4 w-4" />}
 * >
 *   Save
 * </LoadingButton>
 * ```
 */
const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
    ({ className, children, loading, loadingText, icon, disabled, variant, size, ...props }, ref) => {
        return (
            <Button
                ref={ref}
                className={cn("relative", className)}
                disabled={disabled || loading}
                variant={variant}
                size={size}
                {...props}
            >
                {/* Spinner overlay when loading */}
                {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}

                {/* Icon when not loading */}
                {!loading && icon && (
                    <span className="mr-2">{icon}</span>
                )}

                {/* Button text */}
                <span className={cn(loading && "opacity-80")}>
                    {loading && loadingText ? loadingText : children}
                </span>
            </Button>
        );
    }
);

LoadingButton.displayName = "LoadingButton";

export { LoadingButton };


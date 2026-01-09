import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SettingsSaveButtonProps {
    onClick: () => void;
    loading: boolean;
    disabled?: boolean;
    label?: string;
}

export function SettingsSaveButton({
    onClick,
    loading,
    disabled = false,
    label = "Save Changes"
}: SettingsSaveButtonProps) {
    return (
        <Button
            onClick={onClick}
            disabled={loading || disabled}
            className="bg-[#0A66C2] hover:bg-[#004182] text-white"
        >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {label}
        </Button>
    );
}

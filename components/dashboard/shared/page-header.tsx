import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface PageHeaderProps {
    title: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function PageHeader({ title, actionLabel, onAction }: PageHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h1>
            {actionLabel && (
                <Button onClick={onAction} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}

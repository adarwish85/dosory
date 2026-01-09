import React from "react";

interface SettingsSectionProps {
    title: string;
    description?: React.ReactNode;
    children: React.ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
    return (
        <div className="bg-white rounded-lg border p-6 space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
            </div>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

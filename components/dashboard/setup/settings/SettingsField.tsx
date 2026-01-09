import React from "react";

interface SettingsFieldProps {
    label: string;
    description?: React.ReactNode;
    children: React.ReactNode;
    required?: boolean;
}

export function SettingsField({ label, description, children, required }: SettingsFieldProps) {
    return (
        <div className="space-y-2">
            <div>
                <label className="text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
            </div>
            {children}
        </div>
    );
}

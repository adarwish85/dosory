"use client";

import { useState } from "react";
import {
    useEmailTemplates,
    useToggleTemplate,
    TEMPLATE_CATEGORIES,
    EmailTemplate,
} from "@/lib/hooks/use-email-templates";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Edit, Eye, Clock, Loader2, Mail, Filter } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function EmailTemplatesPage() {
    const { user } = useAuth();
    const { templates, loading, error } = useEmailTemplates();
    const { toggle, loading: toggleLoading } = useToggleTemplate();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    // Filter templates
    const filteredTemplates = templates.filter((template) => {
        const matchesSearch =
            template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            template.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Group by category for display
    const groupedByCategory = filteredTemplates.reduce(
        (acc, template) => {
            if (!acc[template.category]) {
                acc[template.category] = [];
            }
            acc[template.category].push(template);
            return acc;
        },
        {} as Record<string, EmailTemplate[]>
    );

    const handleToggle = async (template: EmailTemplate) => {
        if (user?.uid) {
            await toggle(template.id, template.enabled, user.uid);
        }
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            account: "bg-blue-100 text-blue-700 border-blue-200",
            team: "bg-green-100 text-green-700 border-green-200",
            billing: "bg-purple-100 text-purple-700 border-purple-200",
            invoices: "bg-orange-100 text-orange-700 border-orange-200",
            support: "bg-pink-100 text-pink-700 border-pink-200",
            projects: "bg-teal-100 text-teal-700 border-teal-200",
        };
        return colors[category] || "bg-gray-100 text-gray-700 border-gray-200";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error) {
        return <div className="p-8 text-center text-red-600">Error loading templates: {error}</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
                    <p className="text-gray-500 mt-1">Manage system transactional email templates</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                        <Mail className="h-3 w-3" />
                        {templates.length} Templates
                    </Badge>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Category Filter */}
                <div className="flex gap-2 flex-wrap">
                    <Button
                        variant={selectedCategory === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory("all")}
                        className="h-9"
                    >
                        All
                    </Button>
                    {Object.entries(TEMPLATE_CATEGORIES).map(([key, { label }]) => (
                        <Button
                            key={key}
                            variant={selectedCategory === key ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory(key)}
                            className="h-9"
                        >
                            {label.split(" ")[0]}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Templates List */}
            <div className="space-y-6">
                {Object.entries(groupedByCategory).map(([category, categoryTemplates]) => (
                    <div key={category} className="space-y-3">
                        {/* Category Header */}
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                                {TEMPLATE_CATEGORIES[category as keyof typeof TEMPLATE_CATEGORIES]?.label || category}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                                {categoryTemplates.length}
                            </Badge>
                        </div>

                        {/* Templates Grid */}
                        <div className="grid gap-3">
                            {categoryTemplates.map((template) => (
                                <div
                                    key={template.id}
                                    className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            {/* Toggle */}
                                            <Switch
                                                checked={template.enabled}
                                                onCheckedChange={() => handleToggle(template)}
                                                disabled={toggleLoading === template.id}
                                            />

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium text-gray-900 truncate">
                                                        {template.name}
                                                    </h4>
                                                    {!template.isDefault && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
                                                        >
                                                            Modified
                                                        </Badge>
                                                    )}
                                                    {!template.enabled && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs bg-gray-50 text-gray-500"
                                                        >
                                                            Disabled
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 truncate mt-0.5">
                                                    {template.description}
                                                </p>
                                                {template.updatedAt && (
                                                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        Updated{" "}
                                                        {formatDistanceToNow(template.updatedAt.toDate(), {
                                                            addSuffix: true,
                                                        })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <Link href={`/bunny/email-templates/${template.id}`}>
                                                <Button variant="outline" size="sm" className="gap-1">
                                                    <Edit className="h-3 w-3" />
                                                    Edit
                                                </Button>
                                            </Link>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/bunny/email-templates/${template.id}`}>
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Edit Template
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={`/bunny/email-templates/${template.id}?preview=true`}
                                                        >
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            Preview
                                                        </Link>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {filteredTemplates.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No templates found matching your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Plus,
    Loader2,
    FileText,
    Trash2,
    Eye,
    EyeOff,
    Home,
    Settings,
    ExternalLink,
    Pencil,
    MoreHorizontal,
    ArrowUpDown,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePages, useSiteDesign, migrateOldLandingConfig } from "@/lib/hooks/use-site-pages";
import type { SitePage } from "@/lib/types/site-builder";

export default function PagesManagerPage() {
    const router = useRouter();
    const { pages, loading, createPage, updatePage, deletePage } = usePages();
    const { design, updateDesign } = useSiteDesign();

    const [showNewPageDialog, setShowNewPageDialog] = useState(false);
    const [showDesignDialog, setShowDesignDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [pageToDelete, setPageToDelete] = useState<SitePage | null>(null);
    const [migrating, setMigrating] = useState(false);

    // New page form
    const [newPageTitle, setNewPageTitle] = useState("");
    const [newPageSlug, setNewPageSlug] = useState("");
    const [creating, setCreating] = useState(false);

    // Design form
    const [designForm, setDesignForm] = useState(design);

    useEffect(() => {
        setDesignForm(design);
    }, [design]);

    // Auto-generate slug from title
    useEffect(() => {
        const slug = newPageTitle
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim();
        setNewPageSlug(slug);
    }, [newPageTitle]);

    const handleCreatePage = async () => {
        if (!newPageTitle.trim()) return;
        setCreating(true);
        try {
            const pageId = await createPage({
                title: newPageTitle,
                slug: newPageSlug,
                seoTitle: newPageTitle,
                isPublished: false,
                isHome: false,
                sortOrder: pages.length,
                blocks: [],
            });
            setShowNewPageDialog(false);
            setNewPageTitle("");
            setNewPageSlug("");
            router.push(`/bunny/landing-builder/${pageId}`);
        } catch (err) {
            console.error("Error creating page:", err);
            alert("Failed to create page");
        } finally {
            setCreating(false);
        }
    };

    const handleDeletePage = async () => {
        if (!pageToDelete) return;
        try {
            await deletePage(pageToDelete.id);
            setShowDeleteDialog(false);
            setPageToDelete(null);
        } catch (err) {
            console.error("Error deleting page:", err);
            alert("Failed to delete page");
        }
    };

    const handleTogglePublish = async (page: SitePage) => {
        try {
            await updatePage(page.id, { isPublished: !page.isPublished });
        } catch (err) {
            console.error("Error updating page:", err);
        }
    };

    const handleMigrate = async () => {
        setMigrating(true);
        try {
            const pageId = await migrateOldLandingConfig();
            if (pageId) {
                alert("Migration complete! Home page created.");
            } else {
                alert("Migration skipped (pages already exist or no old config found).");
            }
        } catch (err) {
            console.error("Migration error:", err);
            alert("Migration failed. Check console for details.");
        } finally {
            setMigrating(false);
        }
    };

    const handleSaveDesign = async () => {
        try {
            await updateDesign(designForm);
            setShowDesignDialog(false);
        } catch (err) {
            console.error("Error saving design:", err);
            alert("Failed to save design settings");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Site Builder</h1>
                    <p className="text-gray-500 mt-1">Manage your landing pages and content</p>
                </div>
                <div className="flex items-center gap-3">
                    {pages.length === 0 && (
                        <Button
                            variant="outline"
                            onClick={handleMigrate}
                            disabled={migrating}
                            className="border-orange-300 text-orange-600 hover:bg-orange-50"
                        >
                            {migrating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Migrating...
                                </>
                            ) : (
                                <>
                                    <ArrowUpDown className="mr-2 h-4 w-4" />
                                    Import Existing Config
                                </>
                            )}
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setShowDesignDialog(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Design
                    </Button>
                    <Button onClick={() => setShowNewPageDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Page
                    </Button>
                </div>
            </div>

            {/* Pages List */}
            {pages.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No pages yet</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Create your first page or import your existing landing page configuration.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <Button variant="outline" onClick={handleMigrate} disabled={migrating}>
                            {migrating ? "Importing..." : "Import Existing"}
                        </Button>
                        <Button onClick={() => setShowNewPageDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Page
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {pages.map((page) => (
                        <div
                            key={page.id}
                            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                        page.isHome ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                                    }`}
                                >
                                    {page.isHome ? <Home className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">{page.title}</span>
                                        {page.isHome && (
                                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                                                Home
                                            </span>
                                        )}
                                        {!page.isPublished && (
                                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                                Draft
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        /{page.slug || "(home)"} · {page.blocks?.length || 0} blocks
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleTogglePublish(page)}
                                    className={page.isPublished ? "text-green-600" : "text-gray-400"}
                                >
                                    {page.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(`/${page.slug}`, "_blank")}
                                    disabled={!page.isPublished}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/bunny/landing-builder/${page.id}`)}
                                >
                                    <Pencil className="mr-1 h-3 w-3" />
                                    Edit
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => router.push(`/bunny/landing-builder/${page.id}`)}
                                        >
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Edit Page
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => window.open(`/${page.slug}`, "_blank")}>
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            View Live
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setPageToDelete(page);
                                                setShowDeleteDialog(true);
                                            }}
                                            className="text-red-600"
                                            disabled={page.isHome}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* New Page Dialog */}
            <Dialog open={showNewPageDialog} onOpenChange={setShowNewPageDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Page</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Page Title</Label>
                            <Input
                                value={newPageTitle}
                                onChange={(e) => setNewPageTitle(e.target.value)}
                                placeholder="About Us"
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label>URL Slug</Label>
                            <div className="flex items-center mt-1.5">
                                <span className="text-gray-500 text-sm mr-1">/</span>
                                <Input
                                    value={newPageSlug}
                                    onChange={(e) => setNewPageSlug(e.target.value)}
                                    placeholder="about-us"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">This will be the URL path for the page</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewPageDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreatePage} disabled={creating || !newPageTitle.trim()}>
                            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Create Page
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Design Settings Dialog */}
            <Dialog open={showDesignDialog} onOpenChange={setShowDesignDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Global Design Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Primary Color</Label>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <input
                                        type="color"
                                        value={designForm.primaryColor}
                                        onChange={(e) => setDesignForm({ ...designForm, primaryColor: e.target.value })}
                                        className="w-10 h-10 rounded cursor-pointer border-0"
                                    />
                                    <Input
                                        value={designForm.primaryColor}
                                        onChange={(e) => setDesignForm({ ...designForm, primaryColor: e.target.value })}
                                        className="uppercase text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Secondary Color</Label>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <input
                                        type="color"
                                        value={designForm.secondaryColor}
                                        onChange={(e) =>
                                            setDesignForm({ ...designForm, secondaryColor: e.target.value })
                                        }
                                        className="w-10 h-10 rounded cursor-pointer border-0"
                                    />
                                    <Input
                                        value={designForm.secondaryColor}
                                        onChange={(e) =>
                                            setDesignForm({ ...designForm, secondaryColor: e.target.value })
                                        }
                                        className="uppercase text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Accent Color</Label>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <input
                                        type="color"
                                        value={designForm.accentColor}
                                        onChange={(e) => setDesignForm({ ...designForm, accentColor: e.target.value })}
                                        className="w-10 h-10 rounded cursor-pointer border-0"
                                    />
                                    <Input
                                        value={designForm.accentColor}
                                        onChange={(e) => setDesignForm({ ...designForm, accentColor: e.target.value })}
                                        className="uppercase text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                            <p className="text-sm text-gray-500 mb-3">Preview</p>
                            <div className="flex items-center gap-3">
                                <button
                                    style={{ backgroundColor: designForm.primaryColor }}
                                    className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                                >
                                    Primary Button
                                </button>
                                <button
                                    style={{
                                        background: `linear-gradient(to right, ${designForm.primaryColor}, ${designForm.secondaryColor})`,
                                    }}
                                    className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                                >
                                    Gradient
                                </button>
                                <div
                                    style={{ backgroundColor: designForm.accentColor }}
                                    className="px-3 py-1 rounded-full text-sm"
                                >
                                    <span style={{ color: designForm.primaryColor }}>Badge</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDesignDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveDesign}>Save Design</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Page</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{pageToDelete?.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePage} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

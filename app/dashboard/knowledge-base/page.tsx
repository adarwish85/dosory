"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Search, RefreshCw, Loader2, Eye, Pencil, Trash2, FolderPlus, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useKnowledgeBase } from "@/lib/hooks";
import { format } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import type { KnowledgeArticle, KnowledgeGroup } from "@/lib/types";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

export default function KnowledgeBasePage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"articles" | "categories">("articles");
    const {
        articles,
        groups,
        loading,
        createArticle,
        updateArticle,
        deleteArticle,
        createGroup,
        updateGroup,
        deleteGroup
    } = useKnowledgeBase();

    // Article Dialog State
    const [articleDialogOpen, setArticleDialogOpen] = useState(false);
    const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
    const [articleForm, setArticleForm] = useState({
        subject: "",
        groupId: "",
        description: "",
        content: "",
        isActive: true,
        internalOnly: false,
    });

    // Category Dialog State
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<KnowledgeGroup | null>(null);
    const [categoryForm, setCategoryForm] = useState({
        name: "",
        description: "",
        color: "#3b82f6",
    });

    // Categories Management Dialog
    const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);

    const filteredArticles = articles.filter(article =>
        article.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getGroupName = (groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        return group?.name || "-";
    };

    const formatDate = (timestamp: { toDate: () => Date } | null | undefined) => {
        if (!timestamp) return "-";
        try {
            return format(timestamp.toDate(), "dd/MM/yyyy HH:mm");
        } catch {
            return "-";
        }
    };

    // Article Handlers
    const handleNewArticle = () => {
        setEditingArticle(null);
        setArticleForm({
            subject: "",
            groupId: groups[0]?.id || "",
            description: "",
            content: "",
            isActive: true,
            internalOnly: false,
        });
        setArticleDialogOpen(true);
    };

    const handleEditArticle = (article: KnowledgeArticle) => {
        setEditingArticle(article);
        setArticleForm({
            subject: article.subject || "",
            groupId: article.groupId || "",
            description: article.description || "",
            content: article.content || "",
            isActive: article.isActive ?? true,
            internalOnly: article.internalOnly ?? false,
        });
        setArticleDialogOpen(true);
    };

    const handleSaveArticle = async () => {
        try {
            if (editingArticle) {
                await updateArticle(editingArticle.id, articleForm);
                toast.success("Article updated successfully");
            } else {
                await createArticle(articleForm);
                toast.success("Article created successfully");
            }
            setArticleDialogOpen(false);
        } catch (error) {
            toast.error("Failed to save article");
            console.error(error);
        }
    };

    const handleDeleteArticle = async (id: string) => {
        if (!confirm("Are you sure you want to delete this article?")) return;
        try {
            await deleteArticle(id);
            toast.success("Article deleted");
        } catch (error) {
            toast.error("Failed to delete article");
        }
    };

    // Category Handlers
    const handleNewCategory = () => {
        setEditingCategory(null);
        setCategoryForm({ name: "", description: "", color: "#3b82f6" });
        setCategoryDialogOpen(true);
    };

    const handleEditCategory = (category: KnowledgeGroup) => {
        setEditingCategory(category);
        setCategoryForm({
            name: category.name || "",
            description: category.description || "",
            color: category.color || "#3b82f6",
        });
        setCategoryDialogOpen(true);
    };

    const handleSaveCategory = async () => {
        try {
            if (editingCategory) {
                await updateGroup(editingCategory.id, categoryForm);
                toast.success("Category updated successfully");
            } else {
                await createGroup(categoryForm);
                toast.success("Category created successfully");
            }
            setCategoryDialogOpen(false);
        } catch (error) {
            toast.error("Failed to save category");
            console.error(error);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("Are you sure you want to delete this category? Articles in this category will become uncategorized.")) return;
        try {
            await deleteGroup(id);
            toast.success("Category deleted");
        } catch (error) {
            toast.error("Failed to delete category");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="border-b">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setActiveTab("articles")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === "articles"
                            ? "border-gray-900 text-gray-900"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Articles ({articles.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("categories")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === "categories"
                            ? "border-gray-900 text-gray-900"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Categories ({groups.length})
                    </button>
                </div>
            </div>

            {/* Articles Tab */}
            {activeTab === "articles" && (
                <>
                    {/* Header Toolbar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button className="bg-gray-900 text-white hover:bg-gray-800" onClick={handleNewArticle}>
                                <Plus className="mr-2 h-4 w-4" />New Article
                            </Button>
                        </div>

                        <div className="flex items-center gap-2 flex-1 w-full max-w-md mx-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input placeholder="Search articles..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" /></Button>
                        </div>
                    </div>

                    {/* Articles Table */}
                    <div className="border rounded-md bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50 hover:bg-gray-50">
                                    <TableHead className="font-semibold text-gray-900">Article Name</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Category</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Views</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Status</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Published</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredArticles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                            {searchQuery ? "No articles match your search." : "No articles found. Create your first one!"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredArticles.map((article) => (
                                        <TableRow key={article.id} className="group hover:bg-gray-50">
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col gap-0.5">
                                                    <Link href={`/dashboard/knowledge-base/${article.id}`} className="text-blue-600 hover:underline w-fit">
                                                        {article.subject}
                                                    </Link>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity h-4 -ml-0.5">
                                                        <Link href={`/dashboard/knowledge-base/${article.id}`} className="hover:text-blue-600 hover:underline px-0.5">View</Link>
                                                        <span className="text-gray-300">|</span>
                                                        <button onClick={() => handleEditArticle(article)} className="hover:text-blue-600 hover:underline px-0.5">Edit</button>
                                                        <span className="text-gray-300">|</span>
                                                        <button onClick={() => handleDeleteArticle(article.id)} className="hover:text-red-600 hover:underline px-0.5">Delete</button>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-500">{getGroupName(article.groupId)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-gray-500">
                                                    <Eye className="h-4 w-4" />
                                                    {article.views || 0}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={article.isActive ? "bg-green-100 text-green-600 border-0" : "bg-gray-100 text-gray-600 border-0"}>
                                                    {article.isActive ? "Active" : "Draft"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-500">{formatDate(article.createdAt)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600 font-medium">Total: {filteredArticles.length}</span>
                    </div>
                </>
            )}

            {/* Categories Tab */}
            {activeTab === "categories" && (
                <>
                    {/* Header Toolbar */}
                    <div className="flex items-center justify-between gap-4">
                        <Button className="bg-gray-900 text-white hover:bg-gray-800" onClick={handleNewCategory}>
                            <Plus className="mr-2 h-4 w-4" />New Category
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" /></Button>
                    </div>

                    {/* Categories Table */}
                    <div className="border rounded-md bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50 hover:bg-gray-50">
                                    <TableHead className="font-semibold text-gray-900">Name</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Description</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Color</TableHead>
                                    <TableHead className="font-semibold text-gray-900">Articles</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groups.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                            No categories found. Create your first one!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    groups.map((group) => {
                                        const articleCount = articles.filter(a => a.groupId === group.id).length;
                                        return (
                                            <TableRow key={group.id} className="group hover:bg-gray-50">
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-gray-900">{group.name}</span>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity h-4 -ml-0.5">
                                                            <button onClick={() => handleEditCategory(group)} className="hover:text-blue-600 hover:underline px-0.5">Edit</button>
                                                            <span className="text-gray-300">|</span>
                                                            <button onClick={() => handleDeleteCategory(group.id)} className="hover:text-red-600 hover:underline px-0.5">Delete</button>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-gray-500 max-w-xs truncate">{group.description || "-"}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-5 h-5 rounded border"
                                                            style={{ backgroundColor: group.color || "#3b82f6" }}
                                                        />
                                                        <span className="text-gray-500 text-sm">{group.color || "#3b82f6"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="bg-blue-100 text-blue-600 border-0">{articleCount}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600 font-medium">Total: {groups.length}</span>
                    </div>
                </>
            )}

            {/* Article Dialog */}
            <Dialog open={articleDialogOpen} onOpenChange={setArticleDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingArticle ? "Edit Article" : "New Article"}</DialogTitle>
                        <DialogDescription>
                            {editingArticle ? "Update the article details below." : "Create a new knowledge base article."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">Title *</Label>
                            <Input
                                id="subject"
                                value={articleForm.subject}
                                onChange={(e) => setArticleForm({ ...articleForm, subject: e.target.value })}
                                placeholder="Article title"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Category *</Label>
                                <Select value={articleForm.groupId} onValueChange={(v) => setArticleForm({ ...articleForm, groupId: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {groups.map((g) => (
                                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <div className="flex items-center gap-4 h-10">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={articleForm.isActive}
                                            onCheckedChange={(v) => setArticleForm({ ...articleForm, isActive: v })}
                                        />
                                        <span className="text-sm">{articleForm.isActive ? "Active" : "Draft"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={articleForm.internalOnly}
                                            onCheckedChange={(v) => setArticleForm({ ...articleForm, internalOnly: v })}
                                        />
                                        <span className="text-sm">Internal Only</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={articleForm.description}
                                onChange={(e) => setArticleForm({ ...articleForm, description: e.target.value })}
                                placeholder="Short description"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="content">Content *</Label>
                            <Textarea
                                id="content"
                                value={articleForm.content}
                                onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                                placeholder="Article content..."
                                className="min-h-[200px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setArticleDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveArticle} disabled={!articleForm.subject || !articleForm.groupId || !articleForm.content}>
                            {editingArticle ? "Save Changes" : "Create Article"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Category Dialog */}
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
                        <DialogDescription>
                            {editingCategory ? "Update the category details." : "Create a new category to organize articles."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                placeholder="Category name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cat-description">Description</Label>
                            <Textarea
                                id="cat-description"
                                value={categoryForm.description}
                                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                placeholder="Optional description"
                                className="min-h-[80px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="color">Color</Label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    id="color"
                                    value={categoryForm.color}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                                    className="w-10 h-10 rounded border cursor-pointer"
                                />
                                <Input
                                    value={categoryForm.color}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                                    className="w-28"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveCategory} disabled={!categoryForm.name}>
                            {editingCategory ? "Save Changes" : "Create Category"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

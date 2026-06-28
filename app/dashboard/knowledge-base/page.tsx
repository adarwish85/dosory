"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const { t } = useTranslation();
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
        deleteGroup,
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

    const filteredArticles = articles.filter((article) =>
        article.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getGroupName = (groupId: string) => {
        const group = groups.find((g) => g.id === groupId);
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
                toast.success(t("knowledgeBase.toast.articleUpdated"));
            } else {
                await createArticle(articleForm);
                toast.success(t("knowledgeBase.toast.articleCreated"));
            }
            setArticleDialogOpen(false);
        } catch (error) {
            toast.error(t("knowledgeBase.toast.articleSaveFailed"));
            console.error(error);
        }
    };

    const handleDeleteArticle = async (id: string) => {
        if (!confirm(t("knowledgeBase.confirm.deleteArticle"))) return;
        try {
            await deleteArticle(id);
            toast.success(t("knowledgeBase.toast.articleDeleted"));
        } catch (error) {
            toast.error(t("knowledgeBase.toast.articleDeleteFailed"));
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
                toast.success(t("knowledgeBase.toast.categoryUpdated"));
            } else {
                await createGroup(categoryForm);
                toast.success(t("knowledgeBase.toast.categoryCreated"));
            }
            setCategoryDialogOpen(false);
        } catch (error) {
            toast.error(t("knowledgeBase.toast.categorySaveFailed"));
            console.error(error);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (
            !confirm(t("knowledgeBase.confirm.deleteCategory"))
        )
            return;
        try {
            await deleteGroup(id);
            toast.success(t("knowledgeBase.toast.categoryDeleted"));
        } catch (error) {
            toast.error(t("knowledgeBase.toast.categoryDeleteFailed"));
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
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === "articles"
                                ? "border-gray-900 text-gray-900"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        {t("knowledgeBase.tabs.articles")} ({articles.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("categories")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === "categories"
                                ? "border-gray-900 text-gray-900"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        {t("knowledgeBase.tabs.categories")} ({groups.length})
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
                                <Plus className="mr-2 h-4 w-4" />
                                {t("knowledgeBase.newArticle")}
                            </Button>
                        </div>

                        <div className="flex items-center gap-2 flex-1 w-full max-w-md mx-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder={t("knowledgeBase.searchArticles")}
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Articles Table */}
                    <div className="border rounded-md bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50 hover:bg-gray-50">
                                    <TableHead className="font-semibold text-gray-900">{t("knowledgeBase.table.articleName")}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t("knowledgeBase.table.category")}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t("knowledgeBase.table.views")}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t("common.status")}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t("knowledgeBase.table.published")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredArticles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                            {searchQuery
                                                ? t("knowledgeBase.empty.noArticlesMatch")
                                                : t("knowledgeBase.empty.noArticles")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredArticles.map((article) => (
                                        <TableRow key={article.id} className="group hover:bg-gray-50">
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col gap-0.5">
                                                    <Link
                                                        href={`/dashboard/knowledge-base/${article.id}`}
                                                        className="text-blue-600 hover:underline w-fit"
                                                    >
                                                        {article.subject}
                                                    </Link>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity h-4 -ml-0.5">
                                                        <Link
                                                            href={`/dashboard/knowledge-base/${article.id}`}
                                                            className="hover:text-blue-600 hover:underline px-0.5"
                                                        >
                                                            {t("common.view")}
                                                        </Link>
                                                        <span className="text-gray-300">|</span>
                                                        <button
                                                            onClick={() => handleEditArticle(article)}
                                                            className="hover:text-blue-600 hover:underline px-0.5"
                                                        >
                                                            {t("common.edit")}
                                                        </button>
                                                        <span className="text-gray-300">|</span>
                                                        <button
                                                            onClick={() => handleDeleteArticle(article.id)}
                                                            className="hover:text-red-600 hover:underline px-0.5"
                                                        >
                                                            {t("common.delete")}
                                                        </button>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-500">
                                                {getGroupName(article.groupId)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-gray-500">
                                                    <Eye className="h-4 w-4" />
                                                    {article.views || 0}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={
                                                        article.isActive
                                                            ? "bg-green-100 text-green-600 border-0"
                                                            : "bg-gray-100 text-gray-600 border-0"
                                                    }
                                                >
                                                    {article.isActive ? t("knowledgeBase.status.active") : t("knowledgeBase.status.draft")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-500">
                                                {formatDate(article.createdAt)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600 font-medium">{t("knowledgeBase.total")}: {filteredArticles.length}</span>
                    </div>
                </>
            )}

            {/* Categories Tab */}
            {activeTab === "categories" && (
                <>
                    {/* Header Toolbar */}
                    <div className="flex items-center justify-between gap-4">
                        <Button className="bg-gray-900 text-white hover:bg-gray-800" onClick={handleNewCategory}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t("knowledgeBase.newCategory")}
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => window.location.reload()}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Categories Table */}
                    <div className="border rounded-md bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50 hover:bg-gray-50">
                                    <TableHead className="font-semibold text-gray-900">{t("common.name")}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t("common.description")}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t("knowledgeBase.table.color")}</TableHead>
                                    <TableHead className="font-semibold text-gray-900">{t("knowledgeBase.tabs.articles")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groups.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                            {t("knowledgeBase.empty.noCategories")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    groups.map((group) => {
                                        const articleCount = articles.filter((a) => a.groupId === group.id).length;
                                        return (
                                            <TableRow key={group.id} className="group hover:bg-gray-50">
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-gray-900">{group.name}</span>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity h-4 -ml-0.5">
                                                            <button
                                                                onClick={() => handleEditCategory(group)}
                                                                className="hover:text-blue-600 hover:underline px-0.5"
                                                            >
                                                                {t("common.edit")}
                                                            </button>
                                                            <span className="text-gray-300">|</span>
                                                            <button
                                                                onClick={() => handleDeleteCategory(group.id)}
                                                                className="hover:text-red-600 hover:underline px-0.5"
                                                            >
                                                                {t("common.delete")}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-gray-500 max-w-xs truncate">
                                                    {group.description || "-"}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-5 h-5 rounded border"
                                                            style={{ backgroundColor: group.color || "#3b82f6" }}
                                                        />
                                                        <span className="text-gray-500 text-sm">
                                                            {group.color || "#3b82f6"}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="bg-blue-100 text-blue-600 border-0">
                                                        {articleCount}
                                                    </Badge>
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
                        <DialogTitle>{editingArticle ? t("knowledgeBase.dialog.editArticle") : t("knowledgeBase.newArticle")}</DialogTitle>
                        <DialogDescription>
                            {editingArticle
                                ? t("knowledgeBase.dialog.editArticleDescription")
                                : t("knowledgeBase.dialog.newArticleDescription")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">{t("knowledgeBase.form.titleRequired")}</Label>
                            <Input
                                id="subject"
                                value={articleForm.subject}
                                onChange={(e) => setArticleForm({ ...articleForm, subject: e.target.value })}
                                placeholder={t("knowledgeBase.form.articleTitlePlaceholder")}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("knowledgeBase.form.categoryRequired")}</Label>
                                <Select
                                    value={articleForm.groupId}
                                    onValueChange={(v) => setArticleForm({ ...articleForm, groupId: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("knowledgeBase.form.selectCategory")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {groups.map((g) => (
                                            <SelectItem key={g.id} value={g.id}>
                                                {g.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("common.status")}</Label>
                                <div className="flex items-center gap-4 h-10">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={articleForm.isActive}
                                            onCheckedChange={(v) => setArticleForm({ ...articleForm, isActive: v })}
                                        />
                                        <span className="text-sm">{articleForm.isActive ? t("knowledgeBase.status.active") : t("knowledgeBase.status.draft")}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={articleForm.internalOnly}
                                            onCheckedChange={(v) => setArticleForm({ ...articleForm, internalOnly: v })}
                                        />
                                        <span className="text-sm">{t("knowledgeBase.form.internalOnly")}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">{t("common.description")}</Label>
                            <Input
                                id="description"
                                value={articleForm.description}
                                onChange={(e) => setArticleForm({ ...articleForm, description: e.target.value })}
                                placeholder={t("knowledgeBase.form.shortDescriptionPlaceholder")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="content">{t("knowledgeBase.form.contentRequired")}</Label>
                            <Textarea
                                id="content"
                                value={articleForm.content}
                                onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                                placeholder={t("knowledgeBase.form.contentPlaceholder")}
                                className="min-h-[200px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setArticleDialogOpen(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            onClick={handleSaveArticle}
                            disabled={!articleForm.subject || !articleForm.groupId || !articleForm.content}
                        >
                            {editingArticle ? t("common.saveChanges") : t("knowledgeBase.dialog.createArticle")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Category Dialog */}
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? t("knowledgeBase.dialog.editCategory") : t("knowledgeBase.newCategory")}</DialogTitle>
                        <DialogDescription>
                            {editingCategory
                                ? t("knowledgeBase.dialog.editCategoryDescription")
                                : t("knowledgeBase.dialog.newCategoryDescription")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t("knowledgeBase.form.nameRequired")}</Label>
                            <Input
                                id="name"
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                placeholder={t("knowledgeBase.form.categoryNamePlaceholder")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cat-description">{t("common.description")}</Label>
                            <Textarea
                                id="cat-description"
                                value={categoryForm.description}
                                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                placeholder={t("knowledgeBase.form.optionalDescriptionPlaceholder")}
                                className="min-h-[80px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="color">{t("knowledgeBase.table.color")}</Label>
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
                        <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleSaveCategory} disabled={!categoryForm.name}>
                            {editingCategory ? t("common.saveChanges") : t("knowledgeBase.dialog.createCategory")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

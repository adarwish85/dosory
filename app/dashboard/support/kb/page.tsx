"use client";

import { useState, useEffect } from "react";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { KbService, KbArticle, KbCategory } from "@/lib/services/kb-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Search, FileText, Globe, Lock, Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function KnowledgeBasePage() {
    const { profile } = useUserProfile();
    const [loading, setLoading] = useState(true);
    const [articles, setArticles] = useState<KbArticle[]>([]);
    const [categories, setCategories] = useState<KbCategory[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Editor State
    const [isEditing, setIsEditing] = useState(false);
    const [currentArticle, setCurrentArticle] = useState<Partial<KbArticle>>({
        title: "",
        body: "",
        category: "General",
        visibility: "internal",
    });

    // Category Management
    const [newCategoryName, setNewCategoryName] = useState("");

    useEffect(() => {
        if (profile?.orgId) {
            loadData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.orgId]);

    const loadData = async () => {
        if (!profile?.orgId) return;
        setLoading(true);
        try {
            const [arts, cats] = await Promise.all([
                KbService.getArticles(profile.orgId),
                KbService.getCategories(profile.orgId),
            ]);
            setArticles(arts);
            setCategories(cats);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load knowledge base");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveArticle = async () => {
        if (!profile?.orgId || !currentArticle.title || !currentArticle.body) return;

        try {
            if (currentArticle.id) {
                await KbService.updateArticle(currentArticle.id, currentArticle);
                toast.success("Article updated");
            } else {
                await KbService.createArticle({
                    tenantId: profile.orgId,
                    title: currentArticle.title!,
                    body: currentArticle.body!,
                    category: currentArticle.category || "General",
                    visibility: currentArticle.visibility || "internal",
                });
                toast.success("Article published");
            }
            setIsEditing(false);
            setCurrentArticle({ title: "", body: "", category: "General", visibility: "internal" });
            loadData();
        } catch (error) {
            toast.error("Failed to save article");
        }
    };

    const handleDeleteArticle = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        try {
            await KbService.deleteArticle(id);
            loadData();
            toast.success("Article deleted");
        } catch (error) {
            toast.error("Failed to delete article");
        }
    };

    const handleAddCategory = async () => {
        if (!profile?.orgId || !newCategoryName.trim()) return;
        try {
            await KbService.createCategory(profile.orgId, newCategoryName);
            setNewCategoryName("");
            loadData();
            toast.success("Category added");
        } catch (error) {
            toast.error("Failed to add category");
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("Delete category?")) return;
        try {
            await KbService.deleteCategory(id);
            loadData();
            toast.success("Category deleted");
        } catch (error) {
            toast.error("Delete failed");
        }
    };

    const filteredArticles = articles.filter(
        (a) =>
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isEditing) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{currentArticle.id ? "Edit Article" : "New Article"}</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveArticle}>Save Article</Button>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <div className="md:col-span-2 space-y-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                value={currentArticle.title}
                                onChange={(e) => setCurrentArticle({ ...currentArticle, title: e.target.value })}
                                placeholder="Article Title"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Content (HTML supported)</Label>
                            <Textarea
                                className="min-h-[400px] font-mono"
                                value={currentArticle.body}
                                onChange={(e) => setCurrentArticle({ ...currentArticle, body: e.target.value })}
                                placeholder="<p>Write your article here...</p>"
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select
                                        value={currentArticle.category}
                                        onValueChange={(v) => setCurrentArticle({ ...currentArticle, category: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="General">General</SelectItem>
                                            {categories.map((c) => (
                                                <SelectItem key={c.id} value={c.name}>
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Visibility</Label>
                                    <Select
                                        value={currentArticle.visibility}
                                        onValueChange={(v: "public" | "internal") =>
                                            setCurrentArticle({ ...currentArticle, visibility: v })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="public">
                                                <div className="flex items-center gap-2">
                                                    <Globe className="h-4 w-4 text-green-500" /> Public
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="internal">
                                                <div className="flex items-center gap-2">
                                                    <Lock className="h-4 w-4 text-orange-500" /> Internal Only
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
                    <p className="text-muted-foreground">Manage help articles and documentation.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">Manage Categories</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>KB Categories</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="New Category"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                    />
                                    <Button onClick={handleAddCategory}>Add</Button>
                                </div>
                                <div className="space-y-2">
                                    {categories.map((cat) => (
                                        <div
                                            key={cat.id}
                                            className="flex items-center justify-between p-2 border rounded"
                                        >
                                            <span>{cat.name}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteCategory(cat.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Button
                        onClick={() => {
                            setCurrentArticle({
                                title: "",
                                body: "",
                                category: "General",
                                visibility: "internal",
                            });
                            setIsEditing(true);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" /> New Article
                    </Button>
                </div>
            </div>

            <div className="flex gap-4 items-center bg-white p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search articles..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Visibility</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : filteredArticles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No articles found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredArticles.map((article) => (
                                <TableRow key={article.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-blue-500" />
                                        {article.title}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{article.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {article.visibility === "public" ? (
                                            <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                                <Globe className="h-3 w-3" /> Public
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-orange-600 text-xs font-medium">
                                                <Lock className="h-3 w-3" /> Internal
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {format(article.updatedAt?.toDate() || new Date(), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1 justify-end">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setCurrentArticle(article);
                                                    setIsEditing(true);
                                                }}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDeleteArticle(article.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

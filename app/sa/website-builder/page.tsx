"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WebsiteService } from "@/lib/services/website-service";
import { WebsitePage } from "@/lib/types/website";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { format } from "date-fns";
import { Plus, Edit, Globe, Trash2, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

export default function WebsiteBuilderPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [pages, setPages] = useState<WebsitePage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newPage, setNewPage] = useState({ title: "", slug: "" });

    const WEBSITE_ID = "dosory-main"; // Hardcoded for V1

    useEffect(() => {
        loadPages();
    }, []);

    const loadPages = async () => {
        setLoading(true);
        try {
            // Ensure website exists first (idempotent)
            await WebsiteService.initWebsite(WEBSITE_ID, "Dosory Main");
            const data = await WebsiteService.getPages(WEBSITE_ID);
            setPages(data);
        } catch (error) {
            toast.error("Failed to load pages");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePage = async () => {
        if (!user || !newPage.title || !newPage.slug) return;
        try {
            const pageId = await WebsiteService.createPage(WEBSITE_ID, {
                title: newPage.title,
                slug: newPage.slug.startsWith("/") ? newPage.slug : `/${newPage.slug}`,
                seo: { title: newPage.title, description: "" }
            }, user.uid);

            toast.success("Page created");
            setIsCreateOpen(false);
            setNewPage({ title: "", slug: "" });
            loadPages();

            // Optionally redirect detailed editor
            // router.push(`/sa/website-builder/editor/${pageId}`);
        } catch (error) {
            toast.error("Failed to create page");
        }
    };

    const handleDelete = async (pageId: string) => {
        if (!confirm("Are you sure? This cannot be undone.")) return;
        try {
            await WebsiteService.deletePage(WEBSITE_ID, pageId);
            toast.success("Page deleted");
            loadPages();
        } catch (error) {
            toast.error("Failed to delete page");
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Website Builder</h1>
                    <p className="text-muted-foreground">Manage pages and content for {WEBSITE_ID}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <a href="https://dosory.com" target="_blank" rel="noopener noreferrer">
                            <Globe className="mr-2 h-4 w-4" /> View Live Site
                        </a>
                    </Button>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Create Page
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Page</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Page Title</Label>
                                    <Input
                                        placeholder="e.g. Pricing"
                                        value={newPage.title}
                                        onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Slug</Label>
                                    <Input
                                        placeholder="e.g. /pricing"
                                        value={newPage.slug}
                                        onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreatePage} disabled={!newPage.title || !newPage.slug}>Create</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pages</CardTitle>
                    <CardDescription>All pages in this website.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-4">Loading pages...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pages.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                            No pages found. Create one to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pages.map(page => (
                                        <TableRow key={page.id}>
                                            <TableCell className="font-medium">{page.title}</TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{page.slug}</TableCell>
                                            <TableCell>
                                                <Badge variant={page.status === "published" ? "default" : "secondary"}>
                                                    {page.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {page.updatedAt ? format(page.updatedAt.toDate(), "MMM d, yyyy") : "-"}
                                            </TableCell>
                                            <TableCell className="text-right flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => router.push(`/sa/website-builder/editor/${page.id}`)}
                                                >
                                                    <Edit className="mr-2 h-4 w-4" /> Editor
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:bg-red-50"
                                                    onClick={() => handleDelete(page.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

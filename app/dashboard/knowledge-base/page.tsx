"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, Loader2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useKnowledgeBase } from "@/lib/hooks";
import { format } from "date-fns";
import Link from "next/link";

export default function KnowledgeBasePage() {
    const [searchQuery, setSearchQuery] = useState("");
    const { articles, groups, loading } = useKnowledgeBase();

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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-gray-900">Knowledge Base</h2>
            </div>

            <div className="flex justify-between items-center">
                <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-md">
                    <Plus className="mr-2 h-4 w-4" /> New Article
                </Button>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Select defaultValue="25">
                            <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="25" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="25">25</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline">Export</Button>
                        <Button variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="border rounded-md bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="font-semibold text-gray-900">Article Name</TableHead>
                                <TableHead className="font-semibold text-gray-900">Group</TableHead>
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
                                    <TableRow key={article.id}>
                                        <TableCell className="font-medium">
                                            <Link href={`/dashboard/knowledge-base/${article.id}`} className="text-blue-600 hover:underline">
                                                {article.subject}
                                            </Link>
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
            </div>
        </div>
    );
}

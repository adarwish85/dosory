"use client";

import { useEffect, useState } from "react";
import { WebsiteService } from "@/lib/services/website-service";
import { WebsiteAsset } from "@/lib/types/website";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image as ImageIcon, Upload, Loader2, Search } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MediaLibraryProps {
    onSelect: (url: string) => void;
    trigger?: React.ReactNode;
}

export function MediaLibrary({ onSelect, trigger }: MediaLibraryProps) {
    const { user } = useAuth();
    const [assets, setAssets] = useState<WebsiteAsset[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const WEBSITE_ID = "dosory-main";

    useEffect(() => {
        if (isOpen) loadAssets();
    }, [isOpen]);

    const loadAssets = async () => {
        setLoading(true);
        try {
            const data = await WebsiteService.getAssets(WEBSITE_ID);
            setAssets(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !user) return;
        const file = e.target.files[0];
        setUploading(true);

        try {
            // Mock Upload:In real app, upload to storage bucket here
            // For V1, we'll just use a placeholder service or base64 (not recommended for prod but ok for demo)
            // Or better, just simulate a successful upload returning a placeholder URL

            // Simulating network delay
            await new Promise(r => setTimeout(r, 1500));

            const mockUrl = `https://placehold.co/600x400?text=${encodeURIComponent(file.name)}`;

            await WebsiteService.createAsset(WEBSITE_ID, {
                fileName: file.name,
                fileType: file.type,
                url: mockUrl,
                size: file.size,
                dimensions: { width: 600, height: 400 }
            }, user.uid);

            toast.success("Image uploaded!");
            loadAssets();
        } catch (error) {
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const filteredAssets = assets.filter(a => a.fileName.toLowerCase().includes(search.toLowerCase()));

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline"><ImageIcon className="mr-2 h-4 w-4" /> Select Image</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-3xl h-[600px] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Media Library</DialogTitle>
                </DialogHeader>

                <div className="flex items-center gap-4 py-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search files..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Button disabled={uploading}>
                            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Upload
                        </Button>
                        <Input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto border rounded-md p-4 bg-muted/20">
                    {loading ? (
                        <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>
                    ) : filteredAssets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                            <p>No images found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                            {filteredAssets.map(asset => (
                                <div
                                    key={asset.id}
                                    className="group relative aspect-video bg-background border rounded overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all"
                                    onClick={() => {
                                        onSelect(asset.url);
                                        setIsOpen(false);
                                    }}
                                >
                                    <img src={asset.url} alt={asset.fileName} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                        <p className="text-xs text-white truncate w-full">{asset.fileName}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useTranslation } from "@/lib/i18n";

export function AddReplyDialog() {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [content, setContent] = useState("");
    const [saving, setSaving] = useState(false);
    const { profile } = useUserProfile();
    const { t } = useTranslation();

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            setName("");
            setContent("");
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error(t("setup.support.reply.nameRequired"));
            return;
        }
        if (!content.trim()) {
            toast.error(t("setup.support.reply.contentRequired"));
            return;
        }

        setSaving(true);
        try {
            await addDoc(collection(db, "predefinedReplies"), {
                name: name.trim(),
                content: content.trim(),
                orgId: profile?.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile?.uid,
            });

            toast.success(t("setup.support.reply.created"));
            handleOpenChange(false);
        } catch (error) {
            console.error("Error creating predefined reply:", error);
            toast.error(t("setup.support.reply.createFailed"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button className="bg-gray-900 text-white hover:bg-gray-800">
                    <Plus className="mr-2 h-4 w-4" /> {t("setup.support.reply.new")}
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xl bg-white p-0 flex flex-col">
                <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
                    <SheetTitle>{t("setup.support.reply.addTitle")}</SheetTitle>
                </SheetHeader>

                <div className="flex-1 p-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-red-500">{t("setup.support.reply.nameLabel")}</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t("setup.support.reply.namePlaceholder")}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-red-500">{t("setup.support.reply.contentLabel")}</Label>
                            <Textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={t("setup.support.reply.contentPlaceholder")}
                                className="min-h-[150px]"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-white flex justify-end gap-2 flex-shrink-0">
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleSave} className="bg-gray-900 text-white hover:bg-gray-800" disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("common.save")}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

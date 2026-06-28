"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { useTranslation } from "@/lib/i18n";

export function AddSpamFilterDialog() {
    const [open, setOpen] = useState(false);
    const [type, setType] = useState("");
    const [content, setContent] = useState("");
    const [saving, setSaving] = useState(false);
    const { profile } = useUserProfile();
    const { t } = useTranslation();

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            setType("");
            setContent("");
        }
    };

    const handleSave = async () => {
        if (!type) {
            toast.error(t("setup.support.spam.typeRequired"));
            return;
        }
        if (!content.trim()) {
            toast.error(t("setup.support.spam.contentRequired"));
            return;
        }

        setSaving(true);
        try {
            await addDoc(collection(db, "spamFilters"), {
                type,
                content: content.trim(),
                orgId: profile?.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile?.uid,
            });

            toast.success(t("setup.support.spam.created"));
            handleOpenChange(false);
        } catch (error) {
            console.error("Error creating spam filter:", error);
            toast.error(t("setup.support.spam.createFailed"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button className="bg-gray-900 text-white hover:bg-gray-800">
                    <Plus className="mr-2 h-4 w-4" /> {t("setup.support.spam.new")}
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md bg-white p-0 flex flex-col">
                <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
                    <SheetTitle>{t("setup.support.spam.addTitle")}</SheetTitle>
                </SheetHeader>

                <div className="flex-1 p-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-red-500">{t("setup.support.spam.typeLabel")}</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("setup.support.spam.typePlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sender">{t("setup.support.spam.blockedSender")}</SelectItem>
                                    <SelectItem value="subject">{t("setup.support.spam.blockedSubject")}</SelectItem>
                                    <SelectItem value="phrase">{t("setup.support.spam.blockedPhrase")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-red-500">{t("setup.support.spam.contentLabel")}</Label>
                            <Input
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={t("setup.support.spam.contentPlaceholder")}
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

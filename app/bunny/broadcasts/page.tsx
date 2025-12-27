"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Mail, Send, Trash2, Info, AlertTriangle, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { logAdminAction } from "@/lib/admin-logger";
import { useAuth } from "@/components/auth-provider";

interface Banner {
    id: string;
    message: string;
    type: "info" | "warning" | "error" | "success";
    active: boolean;
    expiresAt?: any;
    createdAt?: any;
}

export default function BroadcastsPage() {
    const { user } = useAuth();
    const { profile } = useUserProfile();
    const [activeTab, setActiveTab] = useState("banners");

    // Banner State
    const [banners, setBanners] = useState<Banner[]>([]);
    const [bannerMessage, setBannerMessage] = useState("");
    const [bannerType, setBannerType] = useState<"info" | "warning" | "error" | "success">("info");
    const [loadingBanners, setLoadingBanners] = useState(true);
    const [creatingBanner, setCreatingBanner] = useState(false);

    // Email State
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [targetAudience, setTargetAudience] = useState("all");
    const [sendingEmail, setSendingEmail] = useState(false);

    useEffect(() => {
        if (profile?.role === "superadmin") {
            fetchBanners();
        }
    }, [profile]);

    const fetchBanners = async () => {
        setLoadingBanners(true);
        try {
            const q = query(collection(db, "system_banners"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Banner[];
            setBanners(data);
        } catch (error) {
            console.error("Error fetching banners:", error);
        } finally {
            setLoadingBanners(false);
        }
    };

    const handleCreateBanner = async () => {
        if (!bannerMessage) return;
        setCreatingBanner(true);
        try {
            await addDoc(collection(db, "system_banners"), {
                message: bannerMessage,
                type: bannerType,
                active: true,
                createdAt: serverTimestamp(),
                createdBy: user?.uid,
            });

            await logAdminAction(user, "create_banner", { name: "System Banner" }, { message: bannerMessage, type: bannerType });

            setBannerMessage("");
            fetchBanners();
        } catch (error) {
            console.error("Error creating banner:", error);
            alert("Failed to create banner");
        } finally {
            setCreatingBanner(false);
        }
    };

    const handleDeleteBanner = async (id: string, message: string) => {
        if (!confirm("Are you sure you want to delete this banner?")) return;
        try {
            await deleteDoc(doc(db, "system_banners", id));
            await logAdminAction(user, "delete_banner", { id, name: "System Banner" }, { message });
            fetchBanners();
        } catch (error) {
            console.error("Error deleting banner:", error);
        }
    };

    const handleSendEmail = async () => {
        if (!emailSubject || !emailBody) return;
        if (!confirm(`Are you sure you want to send this email to ${targetAudience === 'all' ? 'ALL' : targetAudience} tenants? This action cannot be undone.`)) return;

        setSendingEmail(true);
        try {
            const response = await fetch("/api/admin/broadcast-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject: emailSubject,
                    html: emailBody,
                    targetAudience
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            await logAdminAction(user, "send_email_broadcast", { name: emailSubject }, { target: targetAudience, recpients: data.count });

            alert(`Email sent successfully to ${data.count} recipients.`);
            setEmailSubject("");
            setEmailBody("");
        } catch (error: any) {
            console.error("Error sending email:", error);
            alert(error.message || "Failed to send email");
        } finally {
            setSendingEmail(false);
        }
    };

    const getBannerIcon = (type: string) => {
        switch (type) {
            case "warning": return <AlertTriangle className="h-5 w-5 text-orange-500" />;
            case "error": return <AlertCircle className="h-5 w-5 text-red-500" />;
            case "success": return <CheckCircle className="h-5 w-5 text-green-500" />;
            default: return <Info className="h-5 w-5 text-blue-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Communications Center</h1>
                <p className="text-gray-500">Manage system-wide announcements and notifications.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-white border border-gray-200 p-1">
                    <TabsTrigger value="banners" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                        <Megaphone className="h-4 w-4 mr-2" />
                        System Banners
                    </TabsTrigger>
                    <TabsTrigger value="emails" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                        <Mail className="h-4 w-4 mr-2" />
                        Email Blasts
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="banners" className="space-y-6">
                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                            <CardTitle>Active Banners</CardTitle>
                            <CardDescription>Banners appear at the top of every tenant dashboard.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex gap-4 items-start">
                                <div className="flex-1 space-y-2">
                                    <Label>New Banner Message</Label>
                                    <Input
                                        value={bannerMessage}
                                        onChange={(e) => setBannerMessage(e.target.value)}
                                        placeholder="e.g., Scheduled maintenance tonight at 10 PM UTC."
                                    />
                                </div>
                                <div className="space-y-2 w-48">
                                    <Label>Type</Label>
                                    <Select value={bannerType} onValueChange={(v: any) => setBannerType(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="info">Info (Blue)</SelectItem>
                                            <SelectItem value="warning">Warning (Orange)</SelectItem>
                                            <SelectItem value="error">Error (Red)</SelectItem>
                                            <SelectItem value="success">Success (Green)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    className="mt-8"
                                    onClick={handleCreateBanner}
                                    disabled={!bannerMessage || creatingBanner}
                                >
                                    {creatingBanner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                    Publish
                                </Button>
                            </div>

                            <div className="space-y-3 mt-6">
                                <Label className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Currently Active</Label>
                                {loadingBanners ? (
                                    <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
                                ) : banners.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-gray-400">
                                        No active banners
                                    </div>
                                ) : (
                                    banners.map(banner => (
                                        <div key={banner.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
                                            <div className="flex items-center gap-3">
                                                {getBannerIcon(banner.type)}
                                                <span className="text-gray-900 font-medium">{banner.message}</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDeleteBanner(banner.id, banner.message)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="emails" className="space-y-6">
                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                            <CardTitle>Email Blast</CardTitle>
                            <CardDescription>Send an email to all tenant administrators.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label>Target Audience</Label>
                                <Select value={targetAudience} onValueChange={setTargetAudience}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Tenants</SelectItem>
                                        <SelectItem value="active">Active Status Only</SelectItem>
                                        <SelectItem value="trial">Trial Status Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Subject Line</Label>
                                <Input
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    placeholder="Important Announcement"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email Body (HTML supported)</Label>
                                <Textarea
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    placeholder="<b>Big news!</b> We are launching..."
                                    className="min-h-[200px] font-mono text-sm"
                                />
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button
                                    onClick={handleSendEmail}
                                    disabled={sendingEmail || !emailSubject || !emailBody}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {sendingEmail ? (
                                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</>
                                    ) : (
                                        <><Send className="h-4 w-4 mr-2" /> Send to Audience</>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

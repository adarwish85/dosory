"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    MoreHorizontal,
    Edit,
    Search,
    Image as ImageIcon,
    Paperclip,
    Smile,
    Send,
    Star,
    Loader2,
    X,
    UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import {
    useConversations,
    useChatMessages,
    Conversation,
    getOrCreateConversation,
    ChatParticipant,
} from "@/lib/hooks/use-chat";
import { useStaff, useRoles } from "@/lib/hooks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";

export default function MessagesPage() {
    const { t } = useTranslation();
    const { profile } = useUserProfile();
    const { conversations, loading: conversationsLoading } = useConversations();
    const { staff } = useStaff();
    const { roles } = useRoles();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [newChatOpen, setNewChatOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Select first conversation by default if none selected
    useEffect(() => {
        if (!selectedId && conversations.length > 0) {
            setSelectedId(conversations[0].id);
        }
    }, [conversations, selectedId]);

    const { messages, loading: messagesLoading, sendMessage } = useChatMessages(selectedId);

    // Helper to get the "other" participant details
    const getOtherParticipant = (convo: Conversation) => {
        if (!profile) return null;
        const otherUid = convo.participants.find((uid) => uid !== profile.uid);
        if (!otherUid) return null;
        return convo.participantDetails[otherUid];
    };

    const selectedConvo = conversations.find((c) => c.id === selectedId);
    const otherParticipant = selectedConvo ? getOtherParticipant(selectedConvo) : null;

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!messageInput.trim()) return;
        await sendMessage(messageInput.trim());
        setMessageInput("");
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleStartChat = async (otherUser: any) => {
        if (!profile || !profile.orgId) return;

        const currentUserParticipant: ChatParticipant = {
            uid: profile.uid,
            name: `${profile.firstName} ${profile.lastName}`,
            email: profile.email,
            photoURL: profile.photoURL || undefined,
            role: profile.role || "Staff",
        };

        const otherUserParticipant: ChatParticipant = {
            uid: otherUser.id,
            name: `${otherUser.firstName} ${otherUser.lastName}`,
            email: otherUser.email,
            photoURL: otherUser.image || undefined,
            role: otherUser.isAdmin ? "Administrator" : roles.find((r) => r.id === otherUser.roleId)?.name || "Staff",
        };

        try {
            const conversationId = await getOrCreateConversation(
                currentUserParticipant,
                otherUserParticipant,
                profile.orgId
            );
            setNewChatOpen(false);
            setSelectedId(conversationId);
        } catch (error) {
            console.error("Failed to start chat:", error);
        }
    };

    // Filter staff for new chat
    const filteredStaff = staff.filter(
        (s) => s.id !== profile?.uid && `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Date formatting helper
    const getMessageDateLabel = (date: Date) => {
        return format(date, "MMM d").toUpperCase();
    };

    // Group messages by date
    const groupedMessages = messages.reduce((acc: any, msg) => {
        const date = msg.timestamp instanceof Date ? msg.timestamp : new Date();
        const dateKey = getMessageDateLabel(date);
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push({ ...msg, timestamp: date });
        return acc;
    }, {});

    return (
        <div className="h-[calc(100vh-80px)] bg-[#F3F2EF] md:p-4 flex gap-4 font-sans">
            {/* Left Sidebar - Conversation List */}
            <div className="w-full md:w-[350px] lg:w-[400px] bg-white rounded-lg border border-gray-300 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-3 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-gray-900">{t("messages.title")}</div>
                        <div className="flex items-center gap-1 text-gray-600">
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                                <MoreHorizontal className="h-5 w-5" />
                            </Button>

                            <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
                                <DialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-8 w-8">
                                        <Edit className="h-5 w-5" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>{t("messages.newMessage")}</DialogTitle>
                                    </DialogHeader>
                                    <div className="p-4 space-y-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                placeholder={t("messages.searchPeople")}
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                                            {filteredStaff.map((person) => (
                                                <div
                                                    key={person.id}
                                                    onClick={() => handleStartChat(person)}
                                                    className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                                                >
                                                    <Avatar>
                                                        <AvatarImage src={person.image} />
                                                        <AvatarFallback>{person.firstName?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-medium text-sm">
                                                            {person.firstName} {person.lastName}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {person.isAdmin
                                                                ? t("messages.role.administrator")
                                                                : roles.find((r) => r.id === person.roleId)?.name ||
                                                                  t("messages.role.staff")}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {filteredStaff.length === 0 && (
                                                <div className="text-center text-sm text-gray-500 py-4">
                                                    {t("messages.noPeopleFound")}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder={t("messages.searchMessages")}
                            className="pl-9 bg-[#EEF3F8] border-none placeholder:text-gray-600 h-9"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto bg-white">
                    {conversationsLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p>{t("messages.noConversations")}</p>
                            <Button variant="outline" className="mt-4" onClick={() => setNewChatOpen(true)}>
                                {t("messages.startConversation")}
                            </Button>
                        </div>
                    ) : (
                        conversations.length > 0 &&
                        conversations.map((convo) => {
                            const other = getOtherParticipant(convo);
                            if (!other) return null;
                            const isSelected = selectedId === convo.id;
                            const unreadCount = convo.unreadCounts[profile?.uid || ""] || 0;

                            return (
                                <div
                                    key={convo.id}
                                    onClick={() => setSelectedId(convo.id)}
                                    className={cn(
                                        "flex gap-3 p-3 cursor-pointer border-l-[6px] transition-colors hover:bg-gray-50",
                                        isSelected ? "border-[#01754F] bg-[#EDF3F8]" : "border-transparent"
                                    )}
                                >
                                    <Avatar className="h-12 w-12 flex-shrink-0">
                                        <AvatarImage src={other.photoURL} />
                                        <AvatarFallback>{other.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex justify-between items-baseline">
                                            <span
                                                className={cn(
                                                    "text-[15px] truncate",
                                                    unreadCount > 0
                                                        ? "font-bold text-gray-900"
                                                        : "font-semibold text-gray-900"
                                                )}
                                            >
                                                {other.name}
                                            </span>
                                            {convo.updatedAt && (
                                                <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                                                    {format(convo.updatedAt, "MMM d")}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center mt-0.5">
                                            <p
                                                className={cn(
                                                    "text-sm truncate max-w-[200px]",
                                                    unreadCount > 0 ? "font-semibold text-gray-900" : "text-gray-600"
                                                )}
                                            >
                                                {convo.lastMessage?.senderId === profile?.uid && t("messages.youPrefix")}
                                                {convo.lastMessage?.content || t("messages.noMessagesYet")}
                                            </p>
                                            {unreadCount > 0 && (
                                                <span className="bg-[#01754F] text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
                                                    {unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Side - Chat Area */}
            {selectedConvo && otherParticipant ? (
                <div className="hidden md:flex flex-1 bg-white rounded-lg border border-gray-300 flex-col overflow-hidden relative">
                    {/* Chat Header */}
                    <div className="px-4 py-3 border-b border-gray-200 flex items-start justify-between">
                        <div>
                            <div className="text-base font-bold text-gray-900 leading-tight">
                                {otherParticipant.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                                {otherParticipant.role || t("messages.staffMember")}
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-gray-600">
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-gray-100 rounded-full">
                                <MoreHorizontal className="h-5 w-5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-gray-100 rounded-full">
                                <Star className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Profile Link Header (Mini) */}
                    <div className="px-4 py-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer flex gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={otherParticipant.photoURL} />
                            <AvatarFallback>{otherParticipant.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                {otherParticipant.name}{" "}
                                <span className="font-normal text-gray-500 text-xs">• {t("messages.firstDegree")}</span>
                            </div>
                            <div className="text-xs text-gray-600 line-clamp-1">
                                {otherParticipant.role || t("messages.staffMember")}
                            </div>
                        </div>
                    </div>

                    {/* Messages List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Profile Card in Chat (Top) */}
                        <div className="flex flex-col items-center py-6 border-b border-gray-100 mb-4">
                            <Avatar className="h-16 w-16 mb-2">
                                <AvatarImage src={otherParticipant.photoURL} />
                                <AvatarFallback>{otherParticipant.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="font-bold text-lg text-gray-900">{otherParticipant.name}</div>
                            <div className="text-sm text-gray-600 text-center max-w-sm">
                                {otherParticipant.role || t("messages.staffMember")}
                            </div>
                        </div>

                        {messagesLoading && messages.length === 0 ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            Object.entries(groupedMessages).map(([dateLabel, msgs]: [string, any]) => (
                                <div key={dateLabel}>
                                    {/* Date Divider */}
                                    <div className="flex items-center my-5">
                                        <div className="flex-1 h-px bg-gray-200"></div>
                                        <span className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            {dateLabel}
                                        </span>
                                        <div className="flex-1 h-px bg-gray-200"></div>
                                    </div>

                                    {/* Messages */}
                                    <div className="space-y-4">
                                        {msgs.map((msg: any) => (
                                            <div
                                                key={msg.id}
                                                className={cn(
                                                    "flex gap-3 max-w-[85%]",
                                                    msg.senderId === profile?.uid ? "ml-auto flex-row-reverse" : ""
                                                )}
                                            >
                                                <Avatar className="h-10 w-10 flex-shrink-0">
                                                    {msg.senderId === profile?.uid ? (
                                                        <AvatarImage src={profile?.photoURL || ""} />
                                                    ) : (
                                                        <AvatarImage src={otherParticipant.photoURL} />
                                                    )}
                                                    <AvatarFallback>
                                                        {msg.senderId === profile?.uid
                                                            ? "ME"
                                                            : otherParticipant.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>

                                                <div
                                                    className={cn(
                                                        "flex flex-col",
                                                        msg.senderId === profile?.uid ? "items-end" : "items-start"
                                                    )}
                                                >
                                                    <div className="flex items-baseline gap-2 mb-1">
                                                        <span className="font-bold text-sm text-gray-900">
                                                            {msg.senderId === profile?.uid
                                                                ? t("messages.you")
                                                                : otherParticipant.name}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {format(msg.timestamp, "h:mm a")}
                                                        </span>
                                                    </div>
                                                    <div className="text-[15px] leading-relaxed text-gray-900 whitespace-pre-wrap">
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-gray-200 bg-white">
                        <div className="bg-[#F3F2EF] rounded-t-lg p-2 min-h-[100px] border-b-2 border-transparent focus-within:bg-white focus-within:shadow-[inset_0_0_0_2px_rgba(0,0,0,0.1)] transition-all">
                            <textarea
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder={t("messages.writeMessage")}
                                className="w-full bg-transparent border-none resize-none outline-none text-sm min-h-[80px] placeholder:text-gray-600"
                            />
                        </div>
                        <div className="flex justify-between items-center mt-2 px-1">
                            <div className="flex gap-1 text-gray-600">
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-gray-100 rounded-full">
                                    <ImageIcon className="h-5 w-5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-gray-100 rounded-full">
                                    <Paperclip className="h-5 w-5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-gray-100 rounded-full">
                                    <span className="font-bold border border-gray-600 rounded px-0.5 text-[10px]">
                                        GIF
                                    </span>
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-gray-100 rounded-full">
                                    <Smile className="h-5 w-5" />
                                </Button>
                            </div>
                            <div className="flex gap-2 items-center">
                                <Button
                                    onClick={handleSend}
                                    disabled={!messageInput.trim()}
                                    className="h-8 px-4 rounded-full bg-[#E8E8E8] hover:bg-[#D0D0D0] text-gray-400 font-semibold text-sm disabled:opacity-100 data-[enabled=true]:bg-[#0A66C2] data-[enabled=true]:text-white"
                                    data-enabled={!!messageInput.trim()}
                                >
                                    {t("messages.send")}
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 hover:bg-gray-100 rounded-full text-gray-600"
                                >
                                    <MoreHorizontal className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 items-center justify-center bg-white rounded-lg border border-gray-300">
                    <div className="text-center text-gray-500">
                        {conversations.length > 0
                            ? t("messages.selectToRead")
                            : t("messages.noSelectedConversation")}
                        <div className="mt-4">
                            <Button variant="outline" onClick={() => setNewChatOpen(true)}>
                                {t("messages.startConversation")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

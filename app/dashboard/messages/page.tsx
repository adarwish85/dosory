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
    MoreVertical,
    Star,
    Video,
    ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { useUserProfile } from "@/components/hooks/use-user-profile";

// --- Demo Data ---
const DEMO_CONVERSATIONS = [
    {
        id: "1",
        name: "Oleksandr Kompaniiets",
        role: "Senior Graphic Designer",
        avatar: "https://i.pravatar.cc/150?u=1",
        lastMessage: "Hi Ahmed, I believe this will be my last...",
        timestamp: new Date(2023, 9, 20),
        unread: 0,
    },
    {
        id: "2",
        name: "Osama M. E. Afify, MBA",
        role: "Chief Executive Officer",
        avatar: "https://i.pravatar.cc/150?u=2",
        lastMessage: "Hello Mr. Ahmed, It's my pleasure to...",
        timestamp: new Date(2023, 9, 7),
        unread: 0,
    },
    {
        id: "3",
        name: "Ann Ruengsorn",
        role: "Recruiter at Tech Solutions",
        avatar: "https://i.pravatar.cc/150?u=3",
        lastMessage: "Your Special Guest Invitation (This is a personal...",
        timestamp: new Date(2023, 9, 7),
        unread: 0,
    },
    {
        id: "4",
        name: "Esraa Mostafa",
        role: "Business solutions Engineer | Technical Support",
        avatar: "https://i.pravatar.cc/150?u=4",
        lastMessage: "إحنا عاملين platform بتساعد الشركات توفر في تكاليف الذكاء...",
        timestamp: new Date(Date.now()), // Today
        unread: 0,
        active: true, // Currently selected in screenshot
    },
    {
        id: "5",
        name: "huda, Alaa, LinkedIn ...",
        role: "Group Conversation",
        avatar: "https://i.pravatar.cc/150?u=5",
        lastMessage: "Tarek Dessouki left this conversation",
        timestamp: new Date(2023, 8, 19),
        unread: 0,
    },
];

const DEMO_MESSAGES = [
    {
        id: "1",
        senderId: "other",
        content: "مساء الخير\n\nسؤال سريع\n\nبتدوروا على وسيلة تخلي استخدام الـ AI أوضح وأوفر؟",
        timestamp: new Date(2023, 8, 30, 14, 30), // Sep 30, 2:30 PM
    },
    {
        id: "2",
        senderId: "me",
        content: "صباح الخير يا فندم",
        timestamp: new Date(2023, 9, 3, 10, 26), // Oct 3, 10:26 AM
    },
];

// --- Components ---

function FilterButton({ label, active = false, hasDropdown = false }: { label: string, active?: boolean, hasDropdown?: boolean }) {
    return (
        <button
            className={cn(
                "px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors flex items-center gap-1",
                active
                    ? "bg-[#01754F] text-white border-[#01754F]"
                    : "bg-white text-gray-600 border-gray-400 hover:bg-gray-100 hover:border-gray-500"
            )}
        >
            {label}
            {hasDropdown && <ChevronDown className={cn("h-4 w-4", active ? "text-white" : "text-gray-600")} />}
        </button>
    );
}

export default function MessagesPage() {
    const { profile } = useUserProfile();
    const [selectedId, setSelectedId] = useState<string>("4");
    const [messageInput, setMessageInput] = useState("");
    const [messages, setMessages] = useState(DEMO_MESSAGES);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const selectedConvo = DEMO_CONVERSATIONS.find((c) => c.id === selectedId);

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = () => {
        if (!messageInput.trim()) return;
        const msg = {
            id: Date.now().toString(),
            senderId: "me",
            content: messageInput,
            timestamp: new Date(),
        };
        setMessages([...messages, msg]);
        setMessageInput("");
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Date formatting helper
    const getMessageDateLabel = (date: Date) => {
        return format(date, "MMM d").toUpperCase();
    };

    // Group messages by date
    const groupedMessages = messages.reduce((acc: any, msg) => {
        const dateKey = getMessageDateLabel(msg.timestamp);
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(msg);
        return acc;
    }, {});

    return (
        <div className="h-[calc(100vh-80px)] bg-[#F3F2EF] md:p-4 flex gap-4 font-sans">
            {/* Left Sidebar - Conversation List */}
            <div className="w-full md:w-[350px] lg:w-[400px] bg-white rounded-lg border border-gray-300 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-3 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-gray-900">Messaging</div>
                        <div className="flex items-center gap-1 text-gray-600">
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                                <MoreHorizontal className="h-5 w-5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Edit className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search messages"
                            className="pl-9 bg-[#EEF3F8] border-none placeholder:text-gray-600 h-9"
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className="px-3 py-2 border-b border-gray-200 flex gap-2 overflow-x-auto no-scrollbar">
                    <FilterButton label="Focused" active hasDropdown />
                    <FilterButton label="Jobs" />
                    <FilterButton label="Unread" />
                    <FilterButton label="Connections" />
                    <FilterButton label="InMail" />
                    <FilterButton label="Starred" />
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto bg-white">
                    {DEMO_CONVERSATIONS.map((convo) => (
                        <div
                            key={convo.id}
                            onClick={() => setSelectedId(convo.id)}
                            className={cn(
                                "flex gap-3 p-3 cursor-pointer border-l-[6px] transition-colors hover:bg-gray-50",
                                selectedId === convo.id
                                    ? "border-[#01754F] bg-[#EDF3F8]"
                                    : "border-transparent"
                            )}
                        >
                            <Avatar className="h-12 w-12 flex-shrink-0">
                                <AvatarImage src={convo.avatar} />
                                <AvatarFallback>{convo.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex justify-between items-baseline">
                                    <span className="font-semibold text-gray-900 text-[15px] truncate">
                                        {convo.name}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                                        {format(convo.timestamp, "MMM d")}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 truncate mt-0.5">
                                    {convo.lastMessage}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Side - Chat Area */}
            {selectedConvo ? (
                <div className="hidden md:flex flex-1 bg-white rounded-lg border border-gray-300 flex-col overflow-hidden relative">
                    {/* Chat Header */}
                    <div className="px-4 py-3 border-b border-gray-200 flex items-start justify-between">
                        <div>
                            <div className="text-base font-bold text-gray-900 leading-tight">
                                {selectedConvo.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                                {selectedConvo.role}
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
                            <AvatarImage src={selectedConvo.avatar} />
                            <AvatarFallback>{selectedConvo.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                {selectedConvo.name} <span className="font-normal text-gray-500 text-xs">• 1st</span>
                            </div>
                            <div className="text-xs text-gray-600 line-clamp-1">{selectedConvo.role}</div>
                        </div>
                    </div>

                    {/* Messages List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Profile Card in Chat (Top) not shown in screenshot but typical LinkedIn */}
                        <div className="flex flex-col items-center py-6 border-b border-gray-100 mb-4">
                            <Avatar className="h-16 w-16 mb-2">
                                <AvatarImage src={selectedConvo.avatar} />
                                <AvatarFallback>{selectedConvo.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="font-bold text-lg text-gray-900">{selectedConvo.name}</div>
                            <div className="text-sm text-gray-600 text-center max-w-sm">{selectedConvo.role}</div>
                        </div>

                        {/* Messages Grouped by Date */}
                        {Object.entries(groupedMessages).map(([dateLabel, msgs]: [string, any]) => (
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
                                                msg.senderId === "me" ? "ml-auto flex-row-reverse" : ""
                                            )}
                                        >
                                            <Avatar className="h-10 w-10 flex-shrink-0">
                                                {msg.senderId === "me" ? (
                                                    // Placeholder for user avatar
                                                    <AvatarImage src="https://github.com/shadcn.png" />
                                                ) : (
                                                    <AvatarImage src={selectedConvo.avatar} />
                                                )}
                                                <AvatarFallback>U</AvatarFallback>
                                            </Avatar>

                                            <div className={cn("flex flex-col", msg.senderId === "me" ? "items-end" : "items-start")}>
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className="font-bold text-sm text-gray-900">
                                                        {msg.senderId === "me" ? "Ahmed Darwish" : selectedConvo.name}
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
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-gray-200 bg-white">
                        <div className="bg-[#F3F2EF] rounded-t-lg p-2 min-h-[100px] border-b-2 border-transparent focus-within:bg-white focus-within:shadow-[inset_0_0_0_2px_rgba(0,0,0,0.1)] transition-all">
                            <textarea
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Write a message..."
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
                                    <span className="font-bold border border-gray-600 rounded px-0.5 text-[10px]">GIF</span>
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
                                    Send
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-gray-100 rounded-full text-gray-600">
                                    <MoreHorizontal className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 items-center justify-center bg-white rounded-lg border border-gray-300">
                    <div className="text-center text-gray-500">
                        Select a message to start reading
                    </div>
                </div>
            )}
        </div>
    );
}

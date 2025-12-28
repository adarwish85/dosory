"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    MessageSquare,
    Search,
    Send,
    Loader2,
    Plus,
    MoreHorizontal,
    Phone,
    Video,
    Info,
    Smile,
    Paperclip,
    Check,
    CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { useUserProfile } from "@/components/hooks/use-user-profile";

// Placeholder data for demonstration
const DEMO_CONVERSATIONS = [
    {
        id: "1",
        name: "John Smith",
        avatar: "",
        lastMessage: "Thanks for the update!",
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        unread: 2,
        online: true,
    },
    {
        id: "2",
        name: "Sarah Johnson",
        avatar: "",
        lastMessage: "Can we schedule a meeting tomorrow?",
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        unread: 0,
        online: true,
    },
    {
        id: "3",
        name: "Support Team",
        avatar: "",
        lastMessage: "Your ticket has been resolved",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        unread: 0,
        online: false,
    },
];

const DEMO_MESSAGES = [
    {
        id: "1",
        senderId: "other",
        content: "Hey! How's the project going?",
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        read: true,
    },
    {
        id: "2",
        senderId: "me",
        content: "It's going great! We're almost done with the first phase.",
        timestamp: new Date(Date.now() - 1000 * 60 * 55),
        read: true,
    },
    {
        id: "3",
        senderId: "other",
        content: "That's awesome! When do you think we can have a demo?",
        timestamp: new Date(Date.now() - 1000 * 60 * 50),
        read: true,
    },
    {
        id: "4",
        senderId: "me",
        content: "How about next Tuesday? I should have everything ready by then.",
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        read: true,
    },
    {
        id: "5",
        senderId: "other",
        content: "Perfect! I'll send out the calendar invite. Thanks for the update!",
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        read: false,
    },
];

export default function MessagesPage() {
    const { profile } = useUserProfile();
    const [selectedConversation, setSelectedConversation] = useState<string | null>("1");
    const [searchQuery, setSearchQuery] = useState("");
    const [messageInput, setMessageInput] = useState("");
    const [messages, setMessages] = useState(DEMO_MESSAGES);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = () => {
        if (!messageInput.trim()) return;

        const newMessage = {
            id: `${Date.now()}`,
            senderId: "me",
            content: messageInput.trim(),
            timestamp: new Date(),
            read: false,
        };

        setMessages((prev) => [...prev, newMessage]);
        setMessageInput("");
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatMessageTime = (date: Date) => {
        if (isToday(date)) {
            return format(date, "h:mm a");
        } else if (isYesterday(date)) {
            return "Yesterday " + format(date, "h:mm a");
        }
        return format(date, "MMM d, h:mm a");
    };

    const selectedConvo = DEMO_CONVERSATIONS.find((c) => c.id === selectedConversation);

    return (
        <div className="h-[calc(100vh-120px)] flex rounded-lg overflow-hidden border bg-white">
            {/* Conversations List */}
            <div className="w-80 border-r flex flex-col">
                {/* Search Header */}
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Messages
                        </h2>
                        <Button size="icon" variant="ghost">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search messages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Conversations */}
                <div className="flex-1 overflow-y-auto">
                    {DEMO_CONVERSATIONS.map((conversation) => (
                        <div
                            key={conversation.id}
                            className={cn(
                                "p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b",
                                selectedConversation === conversation.id && "bg-blue-50"
                            )}
                            onClick={() => setSelectedConversation(conversation.id)}
                        >
                            <div className="flex items-start gap-3">
                                <div className="relative">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={conversation.avatar} />
                                        <AvatarFallback className="bg-blue-100 text-blue-700">
                                            {conversation.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    {conversation.online && (
                                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-900 truncate">
                                            {conversation.name}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {formatDistanceToNow(conversation.timestamp, { addSuffix: false })}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-sm text-gray-500 truncate">
                                            {conversation.lastMessage}
                                        </p>
                                        {conversation.unread > 0 && (
                                            <Badge className="bg-blue-600 text-white h-5 min-w-[20px] justify-center">
                                                {conversation.unread}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            {selectedConvo ? (
                <div className="flex-1 flex flex-col">
                    {/* Chat Header */}
                    <div className="p-4 border-b flex items-center justify-between bg-white">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={selectedConvo.avatar} />
                                <AvatarFallback className="bg-blue-100 text-blue-700">
                                    {selectedConvo.name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="font-medium">{selectedConvo.name}</h3>
                                <p className="text-xs text-gray-500">
                                    {selectedConvo.online ? (
                                        <span className="text-green-600">Online</span>
                                    ) : (
                                        "Offline"
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="icon" variant="ghost">
                                <Phone className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost">
                                <Video className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost">
                                <Info className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex",
                                    message.senderId === "me" ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "max-w-[70%] rounded-2xl px-4 py-2",
                                        message.senderId === "me"
                                            ? "bg-blue-600 text-white rounded-br-md"
                                            : "bg-white border rounded-bl-md"
                                    )}
                                >
                                    <p className="text-sm">{message.content}</p>
                                    <div
                                        className={cn(
                                            "flex items-center gap-1 mt-1 text-xs",
                                            message.senderId === "me" ? "text-blue-100 justify-end" : "text-gray-400"
                                        )}
                                    >
                                        <span>{formatMessageTime(message.timestamp)}</span>
                                        {message.senderId === "me" && (
                                            message.read ? (
                                                <CheckCheck className="h-3 w-3" />
                                            ) : (
                                                <Check className="h-3 w-3" />
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="p-4 border-t bg-white">
                        <div className="flex items-center gap-2">
                            <Button size="icon" variant="ghost">
                                <Paperclip className="h-4 w-4" />
                            </Button>
                            <Input
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type a message..."
                                className="flex-1"
                            />
                            <Button size="icon" variant="ghost">
                                <Smile className="h-4 w-4" />
                            </Button>
                            <Button
                                onClick={handleSendMessage}
                                disabled={!messageInput.trim()}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                        <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                        <p className="text-gray-500">Choose a conversation from the list to start messaging</p>
                    </div>
                </div>
            )}
        </div>
    );
}

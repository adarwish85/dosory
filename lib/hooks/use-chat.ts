"use client";

import { useState, useEffect, useCallback } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
    Timestamp,
    limit,
    getDoc,
    setDoc,
    increment,
    writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";

// --- Types ---

export interface ChatParticipant {
    uid: string;
    name: string;
    email: string;
    photoURL?: string;
    role?: string;
}

export interface Conversation {
    id: string;
    orgId: string;
    participants: string[]; // UIDs
    participantDetails: Record<string, ChatParticipant>;
    lastMessage?: {
        content: string;
        senderId: string;
        timestamp: Date;
        type: "text" | "image" | "file";
        read: boolean;
    };
    unreadCounts: Record<string, number>;
    updatedAt: Date;
    createdAt: Date;
}

export interface ChatAttachment {
    url: string;
    name: string;
    type: string;
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: "text" | "image" | "file";
    attachments?: ChatAttachment[];
    readBy: string[];
    timestamp: Date;
}

// --- Helpers ---

const convertTimestamp = (ts: Timestamp | Date | null | undefined): Date => {
    if (!ts) return new Date();
    if (ts instanceof Timestamp) return ts.toDate();
    // Handle serialized dates if necessary, or just return as is if already Date
    return new Date(ts);
};

// --- Hooks ---

/**
 * Hook to list conversations for the current user
 */
export function useConversations() {
    const { profile } = useUserProfile();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.uid || !profile?.orgId) {
            // Deferred a microtask: setting state synchronously in an effect body triggers
            // the React Compiler's cascading-render rule (same pattern already used by the
            // sibling hooks in use-customer-data.ts).
            Promise.resolve().then(() => setLoading(false));
            return;
        }

        const q = query(
            collection(db, "conversations"),
            where("orgId", "==", profile.orgId),
            where("participants", "array-contains", profile.uid),
            orderBy("updatedAt", "desc")
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => {
                    const d = doc.data();
                    return {
                        id: doc.id,
                        ...d,
                        updatedAt: convertTimestamp(d.updatedAt),
                        createdAt: convertTimestamp(d.createdAt),
                        lastMessage: d.lastMessage
                            ? {
                                  ...d.lastMessage,
                                  timestamp: convertTimestamp(d.lastMessage.timestamp),
                              }
                            : undefined,
                    } as Conversation;
                });
                setConversations(data);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching conversations:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.uid, profile?.orgId]);

    const createConversation = async (participantUid: string) => {
        if (!profile) throw new Error("No profile");

        // Check if conversation already exists with this SINGLE participant + me
        // Note: For exact match of [me, other], we'd need a more complex query or client-side check.
        // Client-side check is feasible if list isn't huge.
        const existing = conversations.find(
            (c) => c.participants.length === 2 && c.participants.includes(participantUid)
        );

        if (existing) return existing.id;

        // Create new
        // We need execution detail of the other user.
        // Ideally we fetch it. For now, we might need to pass it or fetch it.
        // Let's assume we fetch it or require it passed.
        // Use a placeholder for now, calling code usually has User object.
        return null; // TODO: Implement robust creation requiring participant details
    };

    return { conversations, loading, createConversation };
}

/**
 * Hook to manage messages for a specific conversation
 */
export function useChatMessages(conversationId: string | null) {
    const { profile } = useUserProfile();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!conversationId || !profile?.uid) {
            // Deferred a microtask — a synchronous setState in an effect body trips the
            // React Compiler's cascading-render rule.
            Promise.resolve().then(() => setMessages([]));
            return;
        }

        // Same reason as above — deferred so it is not a synchronous setState in the effect
        // body. onSnapshot clears it again on first delivery.
        Promise.resolve().then(() => setLoading(true));
        const q = query(collection(db, "conversations", conversationId, "messages"), orderBy("timestamp", "asc"));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => {
                    const d = doc.data();
                    return {
                        id: doc.id,
                        ...d,
                        timestamp: convertTimestamp(d.timestamp),
                    } as Message;
                });
                setMessages(data);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching messages:", error);
                setLoading(false);
            }
        );

        // Mark as read when entering/viewing
        // We'll do this in a separate effect or function to avoid frequent writes
        // but for simplicity, we call a function here?
        // No, `useEffect` here runs on every message update.
        // We should mark as read if the last message is not read by us.

        return () => unsubscribe();
    }, [conversationId, profile?.uid]);

    // Declared BEFORE the effect that calls it: React Compiler's immutability rule
    // flags a function referenced above its own declaration, even though the const is
    // initialised by the time any effect runs.
    const markAsRead = async (convId: string, messageId: string) => {
        if (!profile) return;

        // We only really need to update the conversation `unreadCounts` for this user to 0
        // And optionally add user to `readBy` array of the message (for read receipts)

        const batch = writeBatch(db);

        // 1. Reset unread count for user in conversation
        const convRef = doc(db, "conversations", convId);
        batch.update(convRef, {
            [`unreadCounts.${profile.uid}`]: 0,
        });

        // 2. Add to readBy in message
        // const msgRef = doc(db, "conversations", convId, "messages", messageId);
        // batch.update(msgRef, {
        //     readBy: arrayUnion(profile.uid)
        // });
        // NOTE: arrayUnion import needed if uncommented.
        // For efficiency, maybe just resetting unread count is enough for the Badge.
        // Read receipts might be overkill for now but good to have schema ready.

        await batch.commit(); // Only conversation update for now to save writes
    };

    // Mark as read effect
    useEffect(() => {
        if (!conversationId || !profile?.uid || messages.length === 0) return;

        const lastMessage = messages[messages.length - 1];
        const readBy = lastMessage.readBy ?? [];
        if (lastMessage.senderId !== profile.uid && !readBy.includes(profile.uid)) {
            markAsRead(conversationId, lastMessage.id);
        }
    }, [conversationId, messages, profile?.uid]);

    const sendMessage = async (
        content: string,
        type: "text" | "image" | "file" = "text",
        attachments: ChatAttachment[] = []
    ) => {
        if (!conversationId || !profile) return;

        const batch = writeBatch(db);

        // 1. Add message
        const messageRef = doc(collection(db, "conversations", conversationId, "messages"));
        const messageData = {
            senderId: profile.uid,
            content,
            type,
            attachments,
            readBy: [profile.uid],
            timestamp: serverTimestamp(),
        };
        batch.set(messageRef, messageData);

        // 2. Update conversation (lastMessage + unreadCounts)
        // We need to increment unread count for ALL participants EXCEPT sender
        // Since we don't have participants list here easily without fetching doc,
        // we assume we can update using `increment`.
        // We ideally need the conversation doc to know who to increment.
        // Let's Fetch conversation doc first? Or assume caller passed participants?
        // Fetching is safer.
        const convRef = doc(db, "conversations", conversationId);
        const convSnap = await getDoc(convRef);

        if (convSnap.exists()) {
            const convData = convSnap.data();
            const updates: Record<string, unknown> = {
                lastMessage: {
                    content: type === "text" ? content : `Sent an ${type}`,
                    senderId: profile.uid,
                    timestamp: serverTimestamp(),
                    type,
                    read: false,
                },
                updatedAt: serverTimestamp(),
            };

            // Increment unread for others
            convData.participants.forEach((uid: string) => {
                if (uid !== profile.uid) {
                    updates[`unreadCounts.${uid}`] = increment(1);
                }
            });

            batch.update(convRef, updates);
        }

        await batch.commit();
    };

    return { messages, loading, sendMessage };
}

/**
 * Hook to get global unread messages count
 */
export function useUnreadMessages() {
    const { profile } = useUserProfile();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!profile?.uid || !profile?.orgId) return;

        // Query the user's own conversations (reuses the conversations list index:
        // orgId + participants[] + updatedAt) and sum unread counts client-side.
        // Previously this used where(`unreadCounts.{uid}` > 0), a per-user map-field
        // inequality that requires a per-user composite index (impossible to pre-create),
        // so it threw failed-precondition on every page.
        const q = query(
            collection(db, "conversations"),
            where("orgId", "==", profile.orgId),
            where("participants", "array-contains", profile.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let total = 0;
            snapshot.docs.forEach((doc) => {
                const count = doc.data().unreadCounts?.[profile.uid] || 0;
                total += count;
            });
            setUnreadCount(total);
        });

        return () => unsubscribe();
    }, [profile?.uid, profile?.orgId]);

    return { unreadCount };
}

/**
 * Helper to get or create a conversation with a user
 */
export async function getOrCreateConversation(
    currentUser: ChatParticipant,
    otherUser: ChatParticipant,
    orgId: string
): Promise<string> {
    // 1. Search for existing 1:1
    const q = query(
        collection(db, "conversations"),
        where("orgId", "==", orgId),
        where("participants", "array-contains", currentUser.uid)
    );

    // We have to filter client side for exact match of query limitation
    // Fetch recent ones
    // NOTE: This could be slow if user has many chats.
    // Optimization: Store a deterministic ID for 1:1 chats like `uid1_uid2` (sorted)

    const sortedIds = [currentUser.uid, otherUser.uid].sort();
    const deterministicId = `${sortedIds[0]}_${sortedIds[1]}`;

    // Try to get by deterministic ID first?
    // But we are using auto-IDs currently?
    // Let's use deterministic ID for 1:1 conversations to ensure uniqueness easily.

    const docRef = doc(db, "conversations", deterministicId);

    // SWEEP C — missing-doc permission-denied landmine. This is a get-or-create, so on the
    // very first chat between two people the document does NOT exist by definition. The
    // conversations read rule is `isOrgMember(resource.data.orgId)`, and on a missing document
    // `resource` is null: the expression errors and the READ is DENIED rather than returning
    // an empty snapshot. That threw here, before setDoc could run, so starting a NEW 1:1 chat
    // failed for every user in every tenant. Same root cause as the 2026-08-06 ticket-create
    // saga (settings/{tenantId}_support) — see CLAUDE.md §11.
    // A denied/absent read means "no conversation yet"; fall through and create it. The
    // create is authorised independently by request.resource.data.orgId, and if the document
    // does exist under another tenant the setDoc is an update and its own rule denies it.
    let docSnap;
    try {
        docSnap = await getDoc(docRef);
    } catch (err) {
        // NARROW deliberately. `permission-denied` is the missing-doc landmine described above
        // and means "create it". Anything else — `unavailable` when offline, an App Check
        // hiccup, deadline-exceeded — must RETHROW: falling through on those reaches the
        // non-merging setDoc below, which on an EXISTING conversation would delete
        // `lastMessage`, reset both participants' `unreadCounts` and rewrite `createdAt`.
        if ((err as { code?: string })?.code !== "permission-denied") throw err;
        console.warn(`[chat] conversations/${deterministicId} unreadable; treating as new`, err);
        docSnap = null;
    }

    if (docSnap?.exists()) {
        return docSnap.id;
    }

    // Create new
    const initialData: Record<string, unknown> = {
        orgId,
        participants: [currentUser.uid, otherUser.uid],
        participantDetails: {
            [currentUser.uid]: currentUser,
            [otherUser.uid]: otherUser,
        },
        unreadCounts: {
            [currentUser.uid]: 0,
            [otherUser.uid]: 0,
        },
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
    };

    await setDoc(docRef, initialData);
    return deterministicId;
}

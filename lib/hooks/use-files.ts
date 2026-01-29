"use client";

import { useState, useEffect, useCallback } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    QueryConstraint,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import { FileDoc } from "@/lib/types";

interface UseFilesOptions {
    relatedTo?: { type: string; id: string };
    uploadedBy?: string;
}

export function useFiles(options: UseFilesOptions = {}) {
    const { relatedTo, uploadedBy } = options;
    const { profile } = useUserProfile();
    const [files, setFiles] = useState<FileDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId)];

        if (relatedTo) {
            constraints.push(where("relatedTo.id", "==", relatedTo.id));
            if (relatedTo.type) {
                constraints.push(where("relatedTo.type", "==", relatedTo.type));
            }
        }

        if (uploadedBy) {
            constraints.push(where("uploadedBy", "==", uploadedBy));
        }

        // Removed orderBy("createdAt", "desc") to avoid requiring a composite index with orgId
        // constraints.push(orderBy("createdAt", "desc"));

        const q = query(collection(db, "files"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as FileDoc[];

                // Client-side sort
                data.sort((a, b) => {
                    const dateA = a.createdAt?.toMillis() || 0;
                    const dateB = b.createdAt?.toMillis() || 0;
                    return dateB - dateA;
                });

                setFiles(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching files:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, relatedTo?.id, relatedTo?.type, uploadedBy]);

    const uploadFile = useCallback(
        async (file: File) => {
            if (!profile?.orgId || !relatedTo) throw new Error("Missing context");

            try {
                setUploading(true);
                const path = `files/${profile.orgId}/${relatedTo.type}/${relatedTo.id}/${Date.now()}_${file.name}`;
                const storageRef = ref(storage, path);

                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);

                await addDoc(collection(db, "files"), {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url,
                    path,
                    relatedTo,
                    uploadedBy: profile.uid,
                    orgId: profile.orgId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            } catch (err) {
                console.error("Error uploading file:", err);
                throw err;
            } finally {
                setUploading(false);
            }
        },
        [profile?.orgId, profile?.uid, relatedTo?.id, relatedTo?.type]
    );

    const deleteFile = useCallback(async (file: FileDoc) => {
        try {
            // Delete from storage
            if (file.path) {
                const storageRef = ref(storage, file.path);
                await deleteObject(storageRef).catch((e) => console.warn("Storage delete failed", e));
            }

            // Delete from firestore
            await deleteDoc(doc(db, "files", file.id));
        } catch (err) {
            console.error("Error deleting file:", err);
            throw err;
        }
    }, []);

    return {
        files,
        loading,
        uploading,
        error,
        uploadFile,
        deleteFile,
    };
}

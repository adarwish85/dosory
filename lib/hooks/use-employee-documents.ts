"use client";

import { useState, useEffect, useCallback } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type { EmployeeDocument, DocumentType } from "@/lib/types/hr-types";

interface UseEmployeeDocumentsOptions {
    employeeId?: string;
    docType?: DocumentType;
}

export function useEmployeeDocuments(options: UseEmployeeDocumentsOptions = {}) {
    const { employeeId, docType } = options;
    const { profile } = useUserProfile();
    const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            Promise.resolve().then(() => {
                setLoading(false);
            });
            return;
        }

        let q = query(
            collection(db, "employee_documents"),
            where("orgId", "==", profile.orgId),
            orderBy("createdAt", "desc")
        );

        if (employeeId) {
            q = query(
                collection(db, "employee_documents"),
                where("orgId", "==", profile.orgId),
                where("employeeId", "==", employeeId),
                orderBy("createdAt", "desc")
            );
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                let data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as EmployeeDocument[];

                if (docType) {
                    data = data.filter((d) => d.documentType === docType);
                }

                setDocuments(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching documents:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId, employeeId, docType]);

    const uploadDocument = useCallback(
        async (
            employeeId: string,
            employeeName: string,
            data: {
                documentType: DocumentType;
                name: string;
                fileUrl: string;
                fileSize?: number;
                description?: string;
                expiryDate?: Date;
            }
        ): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "employee_documents"), {
                ...data,
                employeeId,
                employeeName,
                expiryDate: data.expiryDate ? data.expiryDate : null,
                uploadedBy: profile.uid,
                uploadedByName: profile.displayName || profile.email,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: profile.uid,
            });

            return docRef.id;
        },
        [profile]
    );

    const updateDocument = useCallback(
        async (id: string, data: Partial<EmployeeDocument>): Promise<void> => {
            await updateDoc(doc(db, "employee_documents", id), {
                ...data,
                updatedAt: serverTimestamp(),
            });
        },
        []
    );

    const deleteDocument = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "employee_documents", id));
    }, []);

    // Group by type
    const documentsByType = documents.reduce(
        (acc, doc) => {
            if (!acc[doc.documentType]) {
                acc[doc.documentType] = [];
            }
            acc[doc.documentType].push(doc);
            return acc;
        },
        {} as Record<DocumentType, EmployeeDocument[]>
    );

    // Check for expiring documents (within 30 days)
    const expiringDocuments = documents.filter((doc) => {
        if (!doc.expiryDate) return false;
        const expiry = doc.expiryDate.toDate();
        const now = new Date();
        const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    });

    return {
        documents,
        loading,
        error,
        documentsByType,
        expiringDocuments,
        uploadDocument,
        updateDocument,
        deleteDocument,
    };
}

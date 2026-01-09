"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";

export interface Staff {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roleId: string;
    status: "active" | "inactive";
    photoURL?: string;
    isAdmin?: boolean;
}

export function useStaff() {
    const { profile } = useUserProfile();
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [
            where("orgId", "==", profile.orgId),
            where("status", "==", "active"),
            orderBy("firstName", "asc"),
        ];

        const q = query(collection(db, "staff"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Staff[];
                setStaff(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching staff:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.orgId]);

    return { staff, loading, error };
}

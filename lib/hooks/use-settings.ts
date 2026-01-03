// Firestore data hooks for Staff, Roles, and Settings
// Real-time listeners with CRUD operations

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
    getDoc,
    setDoc,
    serverTimestamp,
    QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/components/hooks/use-user-profile";
import type { Staff, Role, Tax, Currency, PaymentMode, CustomField, EmailTemplate, Organization } from "@/lib/types";
import type { StaffFormData, RoleFormData } from "@/lib/schemas";

// ============================================
// useStaff Hook
// ============================================

interface UseStaffOptions {
    status?: "active" | "inactive" | "all";
    roleId?: string;
    departmentId?: string;
}

export function useStaff(options: UseStaffOptions = {}) {
    const { status = "all", roleId, departmentId } = options;
    const { profile } = useUserProfile();
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!profile?.orgId) {
            console.log("useStaff: No orgId available, skipping fetch");
            setLoading(false);
            return;
        }

        console.log("useStaff: Fetching staff for orgId:", profile.orgId);

        const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId)];

        if (status !== "all") {
            constraints.push(where("status", "==", status));
        }

        if (roleId) {
            constraints.push(where("roleId", "==", roleId));
        }

        // Note: Removed orderBy to avoid needing composite index
        // Sorting is done client-side instead

        const q = query(collection(db, "staff"), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                console.log("useStaff: Received", snapshot.docs.length, "staff members");
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Staff[];
                // Sort client-side by lastName
                data.sort((a, b) => (a.lastName || "").localeCompare(b.lastName || ""));
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
    }, [profile?.orgId, status, roleId]);

    const createStaff = useCallback(
        async (data: StaffFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const response = await fetch("/api/admin/create-staff", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...data,
                    orgId: profile.orgId,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to create staff member");
            }

            return result.staffId;
        },
        [profile?.orgId]
    );

    const updateStaff = useCallback(async (id: string, data: Partial<StaffFormData>): Promise<void> => {
        const response = await fetch(`/api/admin/staff/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || "Failed to update staff member");
        }
    }, []);

    const deleteStaff = useCallback(async (id: string): Promise<void> => {
        const response = await fetch(`/api/admin/staff/${id}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || "Failed to delete staff member");
        }
    }, []);

    return {
        staff,
        loading,
        error,
        createStaff,
        updateStaff,
        deleteStaff,
    };
}

// ============================================
// useRoles Hook
// ============================================

export function useRoles() {
    const { profile } = useUserProfile();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, "roles"), where("orgId", "==", profile.orgId), orderBy("name", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Role[];
            setRoles(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId]);

    const createRole = useCallback(
        async (data: RoleFormData): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "roles"), {
                ...data,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        },
        [profile?.orgId]
    );

    const updateRole = useCallback(async (id: string, data: Partial<RoleFormData>): Promise<void> => {
        await updateDoc(doc(db, "roles", id), {
            ...data,
            updatedAt: serverTimestamp(),
        });
    }, []);

    const deleteRole = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "roles", id));
    }, []);

    return { roles, loading, createRole, updateRole, deleteRole };
}

// ============================================
// useTaxes Hook
// ============================================

export function useTaxes() {
    const { profile } = useUserProfile();
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, "taxes"), where("orgId", "==", profile.orgId), orderBy("name", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Tax[];
            setTaxes(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId]);

    const createTax = useCallback(
        async (name: string, rate: number, isDefault = false): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "taxes"), {
                name,
                rate,
                isDefault,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        },
        [profile?.orgId]
    );

    const updateTax = useCallback(async (id: string, data: Partial<Tax>): Promise<void> => {
        await updateDoc(doc(db, "taxes", id), {
            ...data,
            updatedAt: serverTimestamp(),
        });
    }, []);

    const deleteTax = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "taxes", id));
    }, []);

    return { taxes, loading, createTax, updateTax, deleteTax };
}

// ============================================
// useCurrencies Hook
// ============================================

export function useCurrencies() {
    const { profile } = useUserProfile();
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, "currencies"), where("orgId", "==", profile.orgId), orderBy("code", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Currency[];
            setCurrencies(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId]);

    const createCurrency = useCallback(
        async (data: Omit<Currency, "id" | "orgId" | "createdAt" | "updatedAt">): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "currencies"), {
                ...data,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        },
        [profile?.orgId]
    );

    return { currencies, loading, createCurrency };
}

// ============================================
// usePaymentModes Hook
// ============================================

export function usePaymentModes() {
    const { profile } = useUserProfile();
    const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, "paymentModes"), where("orgId", "==", profile.orgId), orderBy("name", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as PaymentMode[];
            setPaymentModes(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId]);

    const createPaymentMode = useCallback(
        async (name: string, description?: string): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const docRef = await addDoc(collection(db, "paymentModes"), {
                name,
                description,
                showOnInvoice: true,
                isActive: true,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        },
        [profile?.orgId]
    );

    return { paymentModes, loading, createPaymentMode };
}

// ============================================
// useCustomFields Hook
// ============================================

export function useCustomFields(fieldTo?: string) {
    const { profile } = useUserProfile();
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId)];

        if (fieldTo) {
            constraints.push(where("fieldTo", "==", fieldTo));
        }

        constraints.push(orderBy("order", "asc"));

        const q = query(collection(db, "customFields"), ...constraints);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as CustomField[];
            setCustomFields(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId, fieldTo]);

    const createCustomField = useCallback(
        async (
            data: Omit<CustomField, "id" | "orgId" | "createdAt" | "updatedAt" | "slug" | "order">
        ): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const slug = data.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/(^_|_$)/g, "");

            const maxOrder =
                customFields.length > 0
                    ? Math.max(...customFields.filter((f) => f.fieldTo === data.fieldTo).map((f) => f.order))
                    : 0;

            const docRef = await addDoc(collection(db, "customFields"), {
                ...data,
                slug,
                order: maxOrder + 1,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        },
        [profile?.orgId, customFields]
    );

    const updateCustomField = useCallback(async (id: string, data: Partial<CustomField>): Promise<void> => {
        await updateDoc(doc(db, "customFields", id), {
            ...data,
            updatedAt: serverTimestamp(),
        });
    }, []);

    const deleteCustomField = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "customFields", id));
    }, []);

    return { customFields, loading, createCustomField, updateCustomField, deleteCustomField };
}

// ============================================
// useEmailTemplates Hook
// ============================================

export function useEmailTemplates(type?: string) {
    const { profile } = useUserProfile();
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const constraints: QueryConstraint[] = [where("orgId", "==", profile.orgId)];

        if (type) {
            constraints.push(where("type", "==", type));
        }

        constraints.push(orderBy("name", "asc"));

        const q = query(collection(db, "emailTemplates"), ...constraints);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as EmailTemplate[];
            setTemplates(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId, type]);

    const createTemplate = useCallback(
        async (data: Omit<EmailTemplate, "id" | "orgId" | "createdAt" | "updatedAt" | "slug">): Promise<string> => {
            if (!profile?.orgId) throw new Error("No organization");

            const slug = data.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");

            const docRef = await addDoc(collection(db, "emailTemplates"), {
                ...data,
                slug,
                orgId: profile.orgId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        },
        [profile?.orgId]
    );

    const updateTemplate = useCallback(async (id: string, data: Partial<EmailTemplate>): Promise<void> => {
        await updateDoc(doc(db, "emailTemplates", id), {
            ...data,
            updatedAt: serverTimestamp(),
        });
    }, []);

    const deleteTemplate = useCallback(async (id: string): Promise<void> => {
        await deleteDoc(doc(db, "emailTemplates", id));
    }, []);

    return { templates, loading, createTemplate, updateTemplate, deleteTemplate };
}

// ============================================
// useOrganization Hook
// ============================================

export function useOrganization() {
    const { profile } = useUserProfile();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.orgId) {
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(doc(db, "organizations", profile.orgId), (snapshot) => {
            if (snapshot.exists()) {
                setOrganization({ id: snapshot.id, ...snapshot.data() } as Organization);
            } else {
                setOrganization(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.orgId]);

    const updateOrganization = useCallback(
        async (data: Partial<Organization>): Promise<void> => {
            if (!profile?.orgId) throw new Error("No organization");

            await setDoc(
                doc(db, "organizations", profile.orgId),
                {
                    ...data,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
        },
        [profile?.orgId]
    );

    return { organization, loading, updateOrganization };
}

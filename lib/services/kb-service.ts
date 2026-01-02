import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    where,
    orderBy,
    getDocs,
    getDoc,
    Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const KB_ARTICLES_COLLECTION = "kb_articles";
const KB_CATEGORIES_COLLECTION = "kb_categories";

export interface KbArticle {
    id: string;
    tenantId: string;
    title: string;
    body: string; // HTML
    category: string;
    visibility: "public" | "internal";
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface KbCategory {
    id: string;
    tenantId: string;
    name: string;
}

export class KbService {
    // --- Articles ---

    static async getArticles(
        tenantId: string,
        filters: { category?: string; visibility?: "public" | "internal" } = {}
    ): Promise<KbArticle[]> {
        let q = query(
            collection(db, KB_ARTICLES_COLLECTION),
            where("tenantId", "==", tenantId),
            orderBy("createdAt", "desc")
        );

        if (filters.category) {
            q = query(q, where("category", "==", filters.category));
        }

        if (filters.visibility) {
            q = query(q, where("visibility", "==", filters.visibility));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as KbArticle);
    }

    static async getArticle(id: string): Promise<KbArticle | null> {
        const docRef = await getDoc(doc(db, KB_ARTICLES_COLLECTION, id));
        if (!docRef.exists()) return null;
        return { id: docRef.id, ...docRef.data() } as KbArticle;
    }

    static async createArticle(data: Omit<KbArticle, "id" | "createdAt" | "updatedAt">) {
        await addDoc(collection(db, KB_ARTICLES_COLLECTION), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }

    static async updateArticle(id: string, updates: Partial<KbArticle>) {
        const docRef = doc(db, KB_ARTICLES_COLLECTION, id);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    }

    static async deleteArticle(id: string) {
        await deleteDoc(doc(db, KB_ARTICLES_COLLECTION, id));
    }

    // --- Categories ---

    static async getCategories(tenantId: string): Promise<KbCategory[]> {
        const q = query(collection(db, KB_CATEGORIES_COLLECTION), where("tenantId", "==", tenantId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as KbCategory);
    }

    static async createCategory(tenantId: string, name: string) {
        await addDoc(collection(db, KB_CATEGORIES_COLLECTION), {
            tenantId,
            name,
        });
    }

    static async deleteCategory(id: string) {
        await deleteDoc(doc(db, KB_CATEGORIES_COLLECTION, id));
    }
}

/**
 * Website Service - CLIENT-SIDE
 * 
 * Uses Firebase Client SDK (not Admin SDK)
 * Audit logging is handled by calling the API route, not directly importing AuditService
 */

import {
    collection, doc, getDoc, getDocs, setDoc,
    updateDoc, deleteDoc, query, orderBy,
    serverTimestamp, addDoc, writeBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Website, WebsitePage, WebsiteSection, WebsiteVersion, WebsiteAsset } from "@/lib/types/website";

const WEBSITES_COLL = "websites";
const PAGES_COLL = "pages";
const SECTIONS_COLL = "sections";
const ASSETS_COLL = "assets";
const VERSIONS_COLL = "website_versions";

// Helper to log audit (calls API instead of importing server-side AuditService)
async function logAudit(action: string, targetType: string, targetId: string, userId: string, payload: Record<string, any> = {}) {
    try {
        // Fire-and-forget audit log via API
        fetch("/api/sa/audit-log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, targetType, targetId, userId, payload })
        }).catch(() => { }); // Silently fail, don't block main operation
    } catch {
        // Audit logging should never block the primary operation
    }
}

export class WebsiteService {

    // --- Website Operations ---

    static async getWebsite(id: string = "dosory-main"): Promise<Website | null> {
        const docRef = doc(db, WEBSITES_COLL, id);
        const snap = await getDoc(docRef);
        return snap.exists() ? (snap.data() as Website) : null;
    }

    static async initWebsite(id: string = "dosory-main", name: string = "Dosory Main"): Promise<void> {
        const docRef = doc(db, WEBSITES_COLL, id);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
            await setDoc(docRef, {
                id,
                name,
                primaryDomain: "dosory.com",
                status: "draft",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        }
    }

    // --- Page Operations ---

    static async getPages(websiteId: string): Promise<WebsitePage[]> {
        const q = query(
            collection(db, WEBSITES_COLL, websiteId, PAGES_COLL),
            orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as WebsitePage));
    }

    static async getPage(websiteId: string, pageId: string): Promise<WebsitePage | null> {
        const docRef = doc(db, WEBSITES_COLL, websiteId, PAGES_COLL, pageId);
        const snap = await getDoc(docRef);
        return snap.exists() ? ({ id: snap.id, ...snap.data() } as WebsitePage) : null;
    }

    static async createPage(websiteId: string, data: Partial<WebsitePage>, userId: string): Promise<string> {
        const coll = collection(db, WEBSITES_COLL, websiteId, PAGES_COLL);
        const docRef = await addDoc(coll, {
            ...data,
            websiteId,
            status: "draft",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId
        });

        logAudit("create_page", "page", docRef.id, userId, { title: data.title });

        return docRef.id;
    }

    static async updatePage(websiteId: string, pageId: string, updates: Partial<WebsitePage>) {
        const docRef = doc(db, WEBSITES_COLL, websiteId, PAGES_COLL, pageId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    }

    static async deletePage(websiteId: string, pageId: string) {
        await deleteDoc(doc(db, WEBSITES_COLL, websiteId, PAGES_COLL, pageId));
    }

    // --- Section Operations ---

    static async getSections(websiteId: string, pageId: string): Promise<WebsiteSection[]> {
        const q = query(
            collection(db, WEBSITES_COLL, websiteId, PAGES_COLL, pageId, SECTIONS_COLL),
            orderBy("order", "asc")
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as WebsiteSection));
    }

    static async updateSectionsOrder(websiteId: string, pageId: string, sections: WebsiteSection[]) {
        const batch = writeBatch(db);
        sections.forEach((section, index) => {
            const ref = doc(db, WEBSITES_COLL, websiteId, PAGES_COLL, pageId, SECTIONS_COLL, section.id);
            batch.update(ref, { order: index });
        });
        await batch.commit();
    }

    static async saveSection(websiteId: string, pageId: string, section: Partial<WebsiteSection>) {
        if (section.id) {
            // Update
            const ref = doc(db, WEBSITES_COLL, websiteId, PAGES_COLL, pageId, SECTIONS_COLL, section.id);
            await updateDoc(ref, {
                ...section,
                updatedAt: serverTimestamp()
            });
        } else {
            // Create
            const coll = collection(db, WEBSITES_COLL, websiteId, PAGES_COLL, pageId, SECTIONS_COLL);
            await addDoc(coll, {
                ...section,
                pageId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }
    }

    static async deleteSection(websiteId: string, pageId: string, sectionId: string) {
        await deleteDoc(doc(db, WEBSITES_COLL, websiteId, PAGES_COLL, pageId, SECTIONS_COLL, sectionId));
    }

    // --- Versioning & Publishing ---

    static async publishPage(websiteId: string, pageId: string, userId: string, description: string = "Publish") {
        const page = await this.getPage(websiteId, pageId);
        if (!page) throw new Error("Page not found");

        const sections = await this.getSections(websiteId, pageId);

        // 1. Create Version Snapshot
        const versionData: Omit<WebsiteVersion, "id"> = {
            websiteId,
            pageId,
            snapshot: {
                page: page,
                sections: sections
            },
            createdAt: serverTimestamp() as any, // casting for simplicity
            createdBy: userId,
            description
        };

        const versionRef = await addDoc(collection(db, VERSIONS_COLL), versionData);

        // 2. Mark Page as Published
        await this.updatePage(websiteId, pageId, {
            status: "published",
            publishedAt: serverTimestamp() as any
        });

        logAudit("publish_page", "page", pageId, userId, { versionId: versionRef.id });
    }

    // --- Asset Operations ---

    static async getAssets(websiteId: string): Promise<WebsiteAsset[]> {
        const q = query(
            collection(db, WEBSITES_COLL, websiteId, ASSETS_COLL),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WebsiteAsset));
    }

    static async createAsset(websiteId: string, asset: Partial<WebsiteAsset>, userId: string): Promise<string> {
        const coll = collection(db, WEBSITES_COLL, websiteId, ASSETS_COLL);
        const docRef = await addDoc(coll, {
            ...asset,
            websiteId,
            createdAt: serverTimestamp(),
            uploadedBy: userId
        });

        logAudit("upload_asset", "asset", docRef.id, userId, { name: asset.fileName });
        return docRef.id;
    }
}

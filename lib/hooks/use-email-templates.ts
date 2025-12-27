"use client";

import { useState, useEffect, useCallback } from "react";
import {
    collection, doc, getDocs, getDoc, setDoc, updateDoc,
    addDoc, serverTimestamp, query, orderBy, Timestamp,
    onSnapshot
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Types
export interface Variable {
    key: string;
    label: string;
    description: string;
}

export interface EmailTemplate {
    id: string;
    name: string;
    category: "account" | "team" | "billing" | "invoices" | "support" | "projects";
    description: string;
    subject: string;
    htmlContent: string;
    plainTextContent: string;
    variables: Variable[];
    enabled: boolean;
    isDefault: boolean;
    defaultHtmlContent: string;
    defaultSubject: string;
    updatedAt?: Timestamp;
    updatedBy?: string;
    version: number;
}

export interface TemplateVersion {
    id?: string;
    version: number;
    subject: string;
    htmlContent: string;
    createdAt: Timestamp;
    createdBy: string;
    changeNote?: string;
}

// Category labels for UI
export const TEMPLATE_CATEGORIES = {
    account: { label: "Account & Authentication", color: "blue" },
    team: { label: "Team & Access", color: "green" },
    billing: { label: "Billing & Subscription", color: "purple" },
    invoices: { label: "Invoices & Estimates", color: "orange" },
    support: { label: "Support", color: "pink" },
    projects: { label: "Projects & Tasks", color: "teal" },
};

// Hook: Fetch all templates
export function useEmailTemplates() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const templatesRef = collection(db, "platform", "emailTemplates", "templates");

        const unsubscribe = onSnapshot(templatesRef, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as EmailTemplate[];

            // Sort by category then name
            data.sort((a, b) => {
                if (a.category !== b.category) {
                    return a.category.localeCompare(b.category);
                }
                return a.name.localeCompare(b.name);
            });

            setTemplates(data);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching templates:", err);
            setError(err.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { templates, loading, error };
}

// Hook: Single template with versions
export function useEmailTemplate(templateId: string) {
    const [template, setTemplate] = useState<EmailTemplate | null>(null);
    const [versions, setVersions] = useState<TemplateVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch template
    useEffect(() => {
        if (!templateId) return;

        const fetchTemplate = async () => {
            try {
                const docRef = doc(db, "platform", "emailTemplates", "templates", templateId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setTemplate({ id: docSnap.id, ...docSnap.data() } as EmailTemplate);
                } else {
                    setError("Template not found");
                }
            } catch (err: any) {
                console.error("Error fetching template:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTemplate();
    }, [templateId]);

    // Fetch versions
    useEffect(() => {
        if (!templateId) return;

        const versionsRef = collection(db, "platform", "emailTemplates", "templates", templateId, "versions");
        const q = query(versionsRef, orderBy("version", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as TemplateVersion[];
            setVersions(data);
        });

        return () => unsubscribe();
    }, [templateId]);

    // Update template
    const updateTemplate = useCallback(async (
        updates: Partial<EmailTemplate>,
        userId: string,
        changeNote?: string
    ) => {
        if (!templateId || !template) return false;

        setSaving(true);
        try {
            const docRef = doc(db, "platform", "emailTemplates", "templates", templateId);

            // Save current version to history if content changed
            if (updates.htmlContent || updates.subject) {
                const versionsRef = collection(db, "platform", "emailTemplates", "templates", templateId, "versions");
                await addDoc(versionsRef, {
                    version: template.version,
                    subject: template.subject,
                    htmlContent: template.htmlContent,
                    createdAt: serverTimestamp(),
                    createdBy: userId,
                    changeNote: changeNote || "Updated template"
                });
            }

            // Update template
            await updateDoc(docRef, {
                ...updates,
                version: (template.version || 0) + 1,
                updatedAt: serverTimestamp(),
                updatedBy: userId,
                isDefault: false
            });

            // Update local state
            setTemplate(prev => prev ? { ...prev, ...updates, version: (prev.version || 0) + 1 } : null);

            return true;
        } catch (err: any) {
            console.error("Error updating template:", err);
            setError(err.message);
            return false;
        } finally {
            setSaving(false);
        }
    }, [templateId, template]);

    // Toggle enabled
    const toggleEnabled = useCallback(async (userId: string) => {
        if (!templateId || !template) return false;

        setSaving(true);
        try {
            const docRef = doc(db, "platform", "emailTemplates", "templates", templateId);
            await updateDoc(docRef, {
                enabled: !template.enabled,
                updatedAt: serverTimestamp(),
                updatedBy: userId
            });
            setTemplate(prev => prev ? { ...prev, enabled: !prev.enabled } : null);
            return true;
        } catch (err: any) {
            console.error("Error toggling template:", err);
            setError(err.message);
            return false;
        } finally {
            setSaving(false);
        }
    }, [templateId, template]);

    // Reset to default
    const resetToDefault = useCallback(async (userId: string) => {
        if (!templateId || !template) return false;

        setSaving(true);
        try {
            const docRef = doc(db, "platform", "emailTemplates", "templates", templateId);

            // Save current version first
            const versionsRef = collection(db, "platform", "emailTemplates", "templates", templateId, "versions");
            await addDoc(versionsRef, {
                version: template.version,
                subject: template.subject,
                htmlContent: template.htmlContent,
                createdAt: serverTimestamp(),
                createdBy: userId,
                changeNote: "Before reset to default"
            });

            // Reset to default
            await updateDoc(docRef, {
                subject: template.defaultSubject,
                htmlContent: template.defaultHtmlContent,
                version: (template.version || 0) + 1,
                updatedAt: serverTimestamp(),
                updatedBy: userId,
                isDefault: true
            });

            setTemplate(prev => prev ? {
                ...prev,
                subject: prev.defaultSubject,
                htmlContent: prev.defaultHtmlContent,
                isDefault: true,
                version: (prev.version || 0) + 1
            } : null);

            return true;
        } catch (err: any) {
            console.error("Error resetting template:", err);
            setError(err.message);
            return false;
        } finally {
            setSaving(false);
        }
    }, [templateId, template]);

    // Restore version
    const restoreVersion = useCallback(async (version: TemplateVersion, userId: string) => {
        if (!templateId || !template) return false;

        return await updateTemplate({
            subject: version.subject,
            htmlContent: version.htmlContent
        }, userId, `Restored from version ${version.version}`);
    }, [templateId, template, updateTemplate]);

    return {
        template,
        versions,
        loading,
        saving,
        error,
        updateTemplate,
        toggleEnabled,
        resetToDefault,
        restoreVersion
    };
}

// Hook: Toggle template enabled (for list view)
export function useToggleTemplate() {
    const [loading, setLoading] = useState<string | null>(null);

    const toggle = async (templateId: string, currentEnabled: boolean, userId: string) => {
        setLoading(templateId);
        try {
            const docRef = doc(db, "platform", "emailTemplates", "templates", templateId);
            await updateDoc(docRef, {
                enabled: !currentEnabled,
                updatedAt: serverTimestamp(),
                updatedBy: userId
            });
            return true;
        } catch (err) {
            console.error("Error toggling template:", err);
            return false;
        } finally {
            setLoading(null);
        }
    };

    return { toggle, loading };
}

// Generate plain text from HTML
export function htmlToPlainText(html: string): string {
    // Remove HTML tags and decode entities
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<li>/gi, '• ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// Replace variables in template
export function replaceVariables(content: string, values: Record<string, string>): string {
    let result = content;
    for (const [key, value] of Object.entries(values)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
}

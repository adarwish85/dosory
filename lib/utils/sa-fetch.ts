import { auth } from "@/lib/firebase";

/**
 * Custom fetch wrapper that automatically includes Firebase Auth token
 * for Super Admin API calls.
 */
export async function saFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const user = auth.currentUser;

    if (!user) {
        throw new Error("Not authenticated");
    }

    const token = await user.getIdToken();

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", "application/json");

    return fetch(url, {
        ...options,
        headers
    });
}

/**
 * Helper for GET requests
 */
export async function saGet<T>(url: string): Promise<T> {
    const res = await saFetch(url);
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
}

/**
 * Helper for POST requests
 */
export async function saPost<T>(url: string, body: any): Promise<T> {
    const res = await saFetch(url, {
        method: "POST",
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
}

/**
 * Helper for PATCH requests
 */
export async function saPatch<T>(url: string, body: any): Promise<T> {
    const res = await saFetch(url, {
        method: "PATCH",
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
}

/**
 * Helper for DELETE requests
 */
export async function saDelete<T>(url: string): Promise<T> {
    const res = await saFetch(url, {
        method: "DELETE"
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
}

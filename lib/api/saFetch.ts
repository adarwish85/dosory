import { auth } from "@/lib/firebase";
import { toast } from "sonner";

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string
    ) {
        super(message);
        this.name = "ApiError";
    }
}

/**
 * Super Admin Authenticated Fetch Wrapper
 *
 * Automatically adds the Firebase ID token to the Authorization header.
 * Handles authentication errors uniformly.
 *
 * @param url API endpoint (e.g., "/api/sa/overview")
 * @param options Fetch options
 * @returns Parsed JSON response
 */
export async function saFetch<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
    const user = auth.currentUser;

    if (!user) {
        throw new ApiError(401, "User not authenticated");
    }

    // Get fresh token
    const token = await user.getIdToken();

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", "application/json");

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            console.error(`[saFetch] Auth error ${response.status} for ${url}`);
            if (typeof window !== "undefined") {
                if (response.status === 401) {
                    window.location.href = "/auth/login";
                } else {
                    toast.error("Access denied: code 403");
                }
            }
        }

        // Try to parse error message from JSON
        let errorMessage = `API Error ${response.status}`;
        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMessage = errorData.error;
            }
        } catch {
            // Non-JSON error body
        }

        throw new ApiError(response.status, errorMessage);
    }

    // Allow empty responses (e.g. 204 No Content)
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

/**
 * Helper for GET requests
 */
export async function saGet<T>(url: string): Promise<T> {
    return saFetch<T>(url);
}

/**
 * Helper for POST requests
 */
export async function saPost<T>(url: string, body: unknown): Promise<T> {
    return saFetch<T>(url, {
        method: "POST",
        body: JSON.stringify(body),
    });
}

/**
 * Helper for PATCH requests
 */
export async function saPatch<T>(url: string, body: unknown): Promise<T> {
    return saFetch<T>(url, {
        method: "PATCH",
        body: JSON.stringify(body),
    });
}

/**
 * Helper for DELETE requests
 */
export async function saDelete<T>(url: string): Promise<T> {
    return saFetch<T>(url, {
        method: "DELETE",
    });
}

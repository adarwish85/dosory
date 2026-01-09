import { z } from "zod";

/**
 * Zod schema for staff creation payload.
 */
export const createStaffSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phone: z.string().optional().default(""),
    hourlyRate: z.number().min(0).optional().default(0),
    isAdmin: z.boolean().optional().default(false),
    isNotStaff: z.boolean().optional().default(false),
    departmentIds: z.array(z.string()).optional().default([]),
    profileImageUrl: z.string().url().optional().or(z.literal("")),
    roleId: z.string().optional().default("employee"),
    permissions: z.array(z.string()).optional().default([]),
    orgId: z.string().min(1, "Organization ID is required"),
    createdBy: z.string().optional().nullable(),
    sendWelcomeEmail: z.boolean().optional().default(true),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

/**
 * Zod schema for join request approval.
 */
export const approveJoinRequestSchema = z.object({
    requestId: z.string().min(1, "Request ID is required"),
    orgId: z.string().min(1, "Organization ID is required"),
    roleId: z.string().optional().default("employee"),
});

export type ApproveJoinRequestInput = z.infer<typeof approveJoinRequestSchema>;

/**
 * Zod schema for broadcasting emails.
 */
export const broadcastEmailSchema = z.object({
    to: z.array(z.string().email()).min(1, "At least one recipient required"),
    subject: z.string().min(1, "Subject is required"),
    body: z.string().min(1, "Body is required"),
    orgId: z.string().min(1, "Organization ID is required"),
});

export type BroadcastEmailInput = z.infer<typeof broadcastEmailSchema>;

/**
 * Helper to validate and parse request body with a Zod schema.
 */
export async function validateBody<T>(
    request: Request,
    schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
    try {
        const body = await request.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            const firstError = result.error.issues[0];
            return {
                success: false,
                error: `${firstError.path.join(".")}: ${firstError.message}`,
            };
        }

        return { success: true, data: result.data };
    } catch {
        return { success: false, error: "Invalid JSON body" };
    }
}

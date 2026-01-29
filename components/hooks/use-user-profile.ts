"use client";

import { useContextMenuUserProfile, UserProfile } from "@/components/user-profile-provider";

export type { UserProfile };

export function useUserProfile() {
    return useContextMenuUserProfile();
}

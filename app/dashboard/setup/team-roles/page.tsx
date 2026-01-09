'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamRolesIndex() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/setup/team-roles/staff');
    }, [router]);

    return null;
}

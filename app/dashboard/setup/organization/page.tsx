'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OrganizationIndex() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to first page in category
        router.replace('/dashboard/setup/organization/company-info');
    }, [router]);

    return null;
}

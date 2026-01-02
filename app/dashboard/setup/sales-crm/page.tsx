'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SalesCRMIndex() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/setup/sales-crm/leads-config');
    }, [router]);

    return null;
}

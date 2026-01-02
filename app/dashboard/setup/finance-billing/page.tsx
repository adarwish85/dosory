'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FinanceBillingIndex() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/setup/finance-billing/general');
    }, [router]);

    return null;
}

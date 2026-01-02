'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomersConfigIndex() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/setup/customers-config/features');
    }, [router]);

    return null;
}

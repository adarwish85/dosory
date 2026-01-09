'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OperationsIndex() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/setup/operations/tasks-config');
    }, [router]);

    return null;
}

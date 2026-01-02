'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IntegrationsIndex() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/setup/integrations/calendar');
    }, [router]);

    return null;
}

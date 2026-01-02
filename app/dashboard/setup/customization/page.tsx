'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomizationIndex() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/setup/customization/custom-fields');
    }, [router]);

    return null;
}

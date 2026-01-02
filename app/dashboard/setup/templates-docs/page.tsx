'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TemplatesDocsIndex() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/setup/templates-docs/email-templates');
    }, [router]);

    return null;
}

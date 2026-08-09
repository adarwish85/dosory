"use client";

import { ComingSoonPanel } from "@/components/ui/coming-soon";
import { useTranslation } from "@/lib/i18n";

/**
 * GATED 2026-08-09 (§7 decision 2).
 *
 * This page previously rendered a hardcoded two-row fixture ("Development",
 * "Technical Support") and never queried Firestore, while its Add dialog wrote to a
 * `supportDepartments` collection that no reader anywhere queries. So a user could add a
 * department, see the list not change, and have no way to tell whether it saved. Showing a
 * fabricated list that ignores what the user just created is worse than showing nothing.
 *
 * Both the fixture and the orphan write are gone. Departments themselves ARE real — the same
 * §7 round seeds the `departments` collection, `useDepartments` does live CRUD on it from
 * HR → Settings, and firestore.rules scopes it per tenant. What is not wired is THIS page,
 * a second departments surface under Setup. So the note points at the page that works
 * instead of claiming the entity does not exist; wiring or retiring this duplicate is
 * tracked in CLAUDE.md §11.
 */
export default function DepartmentsPage() {
    const { t } = useTranslation();
    return (
        <ComingSoonPanel
            title={t("setup.departments.title")}
            description={t("setup.departments.description")}
            note={t("setup.departments.note")}
        />
    );
}

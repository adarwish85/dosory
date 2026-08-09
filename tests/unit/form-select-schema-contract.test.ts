/**
 * FAMILY B drift guard (#6).
 *
 * The projects create form shipped SelectItem values from the TASK status vocabulary
 * ("to_do"/"in_progress") while projectFormSchema requires the PROJECT enum
 * (draft|active|on_hold|completed|archived). Every pick of the first two failed zod, and
 * because no error was rendered, handleSubmit silently no-op'd — the client saw a dead
 * "Create" button.
 *
 * This test reads the page SOURCE and asserts every status option it offers actually
 * validates against the schema, so this class of drift fails CI instead of a customer.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { projectStatusSchema } from "@/lib/schemas";

const REPO_ROOT = join(__dirname, "..", "..");

/**
 * Extract every status option a form offers.
 *
 * The extractor is deliberately LABEL-AGNOSTIC. An earlier version matched
 * `<SelectItem value="x">{t("<prefix>.…")}</SelectItem>` as one pattern, which made the whole
 * guard fail in only one direction: a MISSING option failed loudly, but an EXTRA option that
 * did not fit the pattern — a different key prefix, a literal label, any attribute before
 * `value` — was invisible, so the "exactly the enum" assertion passed while the page rendered
 * a status zod rejects. That is precisely the dead-submit bug this file exists to catch.
 *
 * So: use the translation prefix ONLY to find the right <SelectContent> block, then take every
 * <SelectItem> inside it regardless of how it is written. Anything unparseable is returned as a
 * marker rather than skipped — an option this test cannot read must fail it, not pass it.
 */
function statusSelectValues(relPath: string, keyPrefix = "projects\\.new\\.status"): string[] {
    return extractSelectValues(readFileSync(join(REPO_ROOT, relPath), "utf8"), keyPrefix);
}

function extractSelectValues(src: string, keyPrefix: string): string[] {
    const blocks = src.match(/<SelectContent[\s\S]*?<\/SelectContent>/g) ?? [];
    const matching = blocks.filter((b) => new RegExp(keyPrefix).test(b));
    if (matching.length === 0) return [];
    // More than one block using the same key prefix means "the status select" is ambiguous;
    // say so loudly instead of silently scanning the first one.
    if (matching.length > 1) return [`<AMBIGUOUS:${matching.length}-blocks-match-${keyPrefix}>`];

    const block = matching[0];
    const values: string[] = [];
    let i = 0;
    while ((i = block.indexOf("<SelectItem", i)) !== -1) {
        // Walk to the end of the opening tag. Skip the ">" of an arrow function in a prop.
        let j = i;
        while (j < block.length && !(block[j] === ">" && block[j - 1] !== "=")) j++;
        const tag = block.slice(i, j);
        const m = /\bvalue="([^"]*)"/.exec(tag);
        values.push(m ? m[1] : `<UNPARSEABLE:${tag.replace(/\s+/g, " ").slice(0, 60)}>`);
        i = j + 1;
    }
    return values;
}

// The extractor is the guard's single point of failure: anything it cannot see, the whole file
// silently blesses. These cases are the exact shapes that slipped past the previous version.
describe("the extractor itself sees every option, however it is written", () => {
    const block = (inner: string) => `<SelectContent>${inner}</SelectContent>`;

    test("attribute order, literal labels and other key prefixes are all captured", () => {
        const src = block(`
            <SelectItem value="to_do">{t("tasks.statusOption.notStarted")}</SelectItem>
            <SelectItem value="archived">{t("tasks.status.archived")}</SelectItem>
            <SelectItem value="on_hold">On hold</SelectItem>
            <SelectItem className="x" value="cancelled">{t("tasks.other.cancelled")}</SelectItem>
        `);
        expect(extractSelectValues(src, "tasks\\.statusOption")).toEqual(["to_do", "archived", "on_hold", "cancelled"]);
    });

    test("a Prettier-wrapped option is still one value", () => {
        const src = block(`
            <SelectItem
                value="blocked"
            >
                {t("tasks.statusOption.blocked")}
            </SelectItem>
        `);
        expect(extractSelectValues(src, "tasks\\.statusOption")).toEqual(["blocked"]);
    });

    test("an option whose value is an expression fails the guard instead of vanishing", () => {
        const src = block(`
            <SelectItem value="done">{t("tasks.statusOption.done")}</SelectItem>
            <SelectItem value={someStatus} onSelect={() => pick()}>{label}</SelectItem>
        `);
        const values = extractSelectValues(src, "tasks\\.statusOption");
        expect(values).toHaveLength(2);
        expect(values[1]).toMatch(/^<UNPARSEABLE:/);
    });

    test("two blocks sharing the prefix are reported, not silently narrowed to the first", () => {
        const src =
            block(`<SelectItem value="to_do">{t("tasks.statusOption.notStarted")}</SelectItem>`) +
            block(`<SelectItem value="done">{t("tasks.statusOption.done")}</SelectItem>`);
        expect(extractSelectValues(src, "tasks\\.statusOption")).toEqual([
            "<AMBIGUOUS:2-blocks-match-tasks\\.statusOption>",
        ]);
    });
});

describe("projects/new status select ↔ projectFormSchema contract", () => {
    const values = statusSelectValues("app/dashboard/projects/new/page.tsx");

    test("the page still renders status options (guard against a silent refactor)", () => {
        expect(values.length).toBeGreaterThanOrEqual(5);
    });

    test("EVERY offered status value validates against projectStatusSchema", () => {
        const invalid = values.filter((v) => !projectStatusSchema.safeParse(v).success);
        expect(invalid).toEqual([]);
    });

    // The EDIT dialog shipped a FOURTH vocabulary (not-started/in-progress/...) written via a raw
    // updateDoc with no zod check — editing a project undid the create fix and made the row
    // unmatchable by every status filter. Scan it here too.
    test("the project EDIT dialog offers only schema-valid statuses", () => {
        const editValues = statusSelectValues(
            "components/dashboard/projects/edit-project-dialog.tsx",
            "projects\\.status"
        );
        expect(editValues.length).toBeGreaterThanOrEqual(5);
        expect(editValues.filter((v) => !projectStatusSchema.safeParse(v).success)).toEqual([]);
    });

    test("the form's default status ('active') is one of the offered options", () => {
        // A default that matches no SelectItem renders an empty select and pushes users
        // toward a value that may not validate — the other half of bug #6.
        expect(values).toContain("active");
    });
});

// ---------------------------------------------------------------------------
// TASKS — added 2026-08-09 (§7 decision 1).
//
// Both task forms offered FIVE options for a FOUR-member enum: "Testing" and
// "Awaiting Feedback" both wrote `in_progress`, so choosing either silently did
// nothing and neither could ever be read back. Meanwhile `blocked` — a first-class
// TaskStatus used by filters, badges and the Today view — was unreachable from the
// only two forms that set status.
//
// This asserts the stronger property the projects tests do not: not just that every
// offered value is VALID, but that the option set is exactly the enum, one option per
// member. That is what catches a duplicate-value option, which validity alone cannot.
// ---------------------------------------------------------------------------
import { taskStatusSchema } from "@/lib/schemas";

const TASK_FORMS = ["app/dashboard/tasks/new/page.tsx", "app/dashboard/tasks/[id]/edit/page.tsx"];

describe.each(TASK_FORMS)("%s status select ↔ taskStatusSchema contract", (form) => {
    const values = statusSelectValues(form, "tasks\\.statusOption");
    const enumValues = taskStatusSchema.options as readonly string[];

    test("renders status options at all (guard against a silent refactor)", () => {
        expect(values.length).toBeGreaterThan(0);
    });

    test("every offered value validates against taskStatusSchema", () => {
        expect(values.filter((v) => !taskStatusSchema.safeParse(v).success)).toEqual([]);
    });

    test("no two options write the SAME value (the 'Testing'/'Awaiting Feedback' bug)", () => {
        expect(values.length).toBe(new Set(values).size);
    });

    test("every enum member is reachable — including `blocked`", () => {
        const missing = enumValues.filter((e) => !values.includes(e));
        expect(missing).toEqual([]);
    });

    test("the option set is exactly the enum, no more and no less", () => {
        expect([...values].sort()).toEqual([...enumValues].sort());
    });
});

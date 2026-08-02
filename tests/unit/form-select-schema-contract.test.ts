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

function statusSelectValues(relPath: string, keyPrefix = "projects\\.new\\.status"): string[] {
    const src = readFileSync(join(REPO_ROOT, relPath), "utf8");
    // Grab the SelectContent block that carries the status options (identified by the
    // projects.new.status.* translation keys the page uses for its labels).
    const values: string[] = [];
    const re = new RegExp(`<SelectItem value="([^"]+)">\\{t\\("${keyPrefix}\\.[^"]+"\\)\\}</SelectItem>`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) values.push(m[1]);
    return values;
}

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

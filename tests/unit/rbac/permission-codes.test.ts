/**
 * RBAC permission-code drift prevention.
 *
 * Asserts that:
 *   1. PERMISSION_MODULES (the canonical catalog) has no duplicate module IDs.
 *   2. Every literal string passed to a `can("...")` call in app/lib/components
 *      source code is a real permission code derived from PERMISSION_MODULES.
 *
 * This catches the exact bug fixed in Phase 1.5: 6 dashboard files were calling
 * `can("invoices_create")` (underscore format) which never matches the dash-
 * format strings stored on staff.permissions[].
 */

import * as fs from "fs";
import * as path from "path";
import { PERMISSION_MODULES } from "@/lib/rbac/definitions";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SOURCE_DIRS = ["lib", "app", "components"];
const SKIP_DIRS = new Set([
    "node_modules",
    ".next",
    "tests",
    ".git",
    "scripts",
    "coverage",
    ".firebase",
    "out",
    "build",
]);

function buildValidCodes(): Set<string> {
    const codes = new Set<string>();
    for (const m of PERMISSION_MODULES) {
        for (const a of m.actions) {
            codes.add(`${m.id}-${a.id}`);
        }
    }
    return codes;
}

function walk(dir: string, files: string[] = []): string[] {
    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return files;
    }
    for (const e of entries) {
        if (e.name.startsWith(".")) continue;
        if (e.name.startsWith("._")) continue;
        if (SKIP_DIRS.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            walk(full, files);
        } else if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) {
            files.push(full);
        }
    }
    return files;
}

const CAN_LITERAL_RE = /\bcan\s*\(\s*["'`]([^"'`]+)["'`]/g;

interface CallSite {
    file: string;
    line: number;
    code: string;
}

function collectCanCalls(): CallSite[] {
    const calls: CallSite[] = [];
    for (const sub of SOURCE_DIRS) {
        const dir = path.join(REPO_ROOT, sub);
        if (!fs.existsSync(dir)) continue;
        const files = walk(dir);
        for (const file of files) {
            const content = fs.readFileSync(file, "utf8");
            const lines = content.split("\n");
            lines.forEach((line, i) => {
                let m: RegExpExecArray | null;
                CAN_LITERAL_RE.lastIndex = 0;
                while ((m = CAN_LITERAL_RE.exec(line)) !== null) {
                    calls.push({
                        file: path.relative(REPO_ROOT, file),
                        line: i + 1,
                        code: m[1],
                    });
                }
            });
        }
    }
    return calls;
}

describe("RBAC permission codes — drift prevention", () => {
    const validCodes = buildValidCodes();

    it("PERMISSION_MODULES has no duplicate module IDs", () => {
        const ids = PERMISSION_MODULES.map((m) => m.id);
        const unique = new Set(ids);
        expect(unique.size).toBe(ids.length);
    });

    it('every can("...") literal in source matches a real permission code', () => {
        const calls = collectCanCalls();
        const bad = calls.filter((c) => !validCodes.has(c.code));

        if (bad.length === 0) return;

        const failureLines = bad.map((b) => `  ${b.file}:${b.line}  can("${b.code}")`).join("\n");
        const validList = Array.from(validCodes).sort().join("\n  ");
        throw new Error(
            `Found ${bad.length} can() call(s) with invalid permission codes:\n${failureLines}\n\n` +
                `Valid codes derived from PERMISSION_MODULES (${validCodes.size} total):\n  ${validList}`
        );
    });
});

/**
 * Call-path guard for the ticket-create denial (2026-08-06).
 *
 * The bug: TicketService.createTicket awaits a settings getDoc BEFORE its addDoc. The
 * settings rule dereferences `resource.data.orgId`, which ERRORS on a missing document, so
 * the read was denied for every tenant (no tenant has ever had settings/{id}_support) and
 * surfaced as a failed ticket create.
 *
 * Why this test exists at all: there are TWO methods named `getSettings` —
 * `TicketService.getSettings` (unused by this path) and `SupportSettingsService.getSettings`
 * (what createTicket actually calls). A first fix hardened the wrong one and shipped with no
 * effect. This asserts the guard lives on the implementation createTicket really invokes.
 */
import { readFileSync } from "fs";
import { join } from "path";

const REPO = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(REPO, p), "utf8");

const TICKET_SERVICE = "lib/services/ticket-service.ts";
const SETTINGS_SERVICE = "lib/services/support-settings-service.ts";

describe("ticket create — settings read is on the guarded call path", () => {
    test("createTicket still resolves its settings via SupportSettingsService (call target unchanged)", () => {
        const src = read(TICKET_SERVICE);
        const createTicket = src.slice(src.indexOf("async createTicket"));
        const body = createTicket.slice(0, createTicket.indexOf("await addDoc"));
        // If this fails, the call target moved — re-verify which implementation to guard.
        expect(body).toMatch(/SupportSettingsService\.getSettings\(/);
    });

    test("SupportSettingsService.getSettings CANNOT throw on an unreadable/missing doc", () => {
        const src = read(SETTINGS_SERVICE);
        const fn = src.slice(src.indexOf("static async getSettings"));
        const body = fn.slice(0, fn.indexOf("\n    static ", 10));
        // The getDoc must sit inside a try, and the catch must fall back rather than rethrow.
        expect(body).toMatch(/try\s*\{[\s\S]*await getDoc\(/);
        expect(body).toMatch(/catch\s*\(/);
        expect(body).not.toMatch(/catch[\s\S]*\bthrow\b/);
    });

    test("every awaited read before the ticket addDoc is failure-tolerant", () => {
        // Any NEW pre-write read added later must be guarded too, or it reintroduces the bug.
        const src = read(TICKET_SERVICE);
        const createTicket = src.slice(src.indexOf("async createTicket"));
        const preWrite = createTicket.slice(0, createTicket.indexOf("await addDoc"));
        const rawReads = preWrite.match(/await\s+getDoc\(|await\s+getDocs\(/g) || [];
        // Direct, unguarded reads inside createTicket itself are the pattern to avoid;
        // settings goes through the guarded service instead.
        expect(rawReads).toEqual([]);
    });
});

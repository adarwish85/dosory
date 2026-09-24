#!/usr/bin/env node
/**
 * Rewrites .lint-baseline.json from an eslint JSON report.
 *
 * Deliberately a separate, manual command rather than something the gate does for itself: a
 * baseline that rewrites itself on every run records nothing and blocks nothing. Run it only when
 * you have genuinely lowered the count, and update the §8 line in CLAUDE.md in the same commit so
 * the two never drift — they already drifted once, by 71 problems.
 *
 * Usage:  npx eslint --format json -o lint.json && node scripts/ci/regen-lint-baseline.mjs lint.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const report = JSON.parse(readFileSync(process.argv[2] || "lint.json", "utf8"));

let errors = 0;
let warnings = 0;
const counts = {};
for (const file of report) {
    for (const m of file.messages) {
        const id = m.ruleId || "(parse-error)";
        counts[id] = (counts[id] || 0) + 1;
        if (m.severity === 2) errors++;
        else warnings++;
    }
}

let commit = "unknown";
try {
    commit = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
} catch {
    /* not a git checkout; leave as unknown */
}

const out = {
    generatedAt: new Date().toISOString().slice(0, 10),
    commit,
    errors,
    warnings,
    problems: errors + warnings,
    ruleIds: Object.keys(counts).sort(),
    counts,
};

writeFileSync(".lint-baseline.json", JSON.stringify(out, null, 2) + "\n");
console.log(`.lint-baseline.json written: ${out.problems} problems (${errors} errors, ${warnings} warnings)`);
console.log("Now update the `npm run lint` line in CLAUDE.md §8 to match, in this same commit.");

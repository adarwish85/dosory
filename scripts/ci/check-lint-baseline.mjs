#!/usr/bin/env node
/**
 * Fails if lint got worse than the recorded baseline.
 *
 * "No NEW lint errors" has been the definition of done in CLAUDE.md §9 for the whole project,
 * but it was enforced by a human comparing two numbers by eye — which is how §8's baseline came
 * to be stale by 71 problems (it said 975/343/632 while the tree measured 904/282/622). This
 * makes the comparison mechanical so it stops depending on whose machine ran it.
 *
 * Two independent checks, because either alone can be gamed:
 *
 *   1. COUNTS must not increase. Catches "one more of something we already tolerate".
 *   2. RULE IDS must all be known. Catches a brand-new KIND of problem even when the total
 *      happens to fall — e.g. fixing three `no-explicit-any` while introducing one
 *      `react-hooks/rules-of-hooks` leaves the count lower and the codebase worse.
 *
 * Lowering the baseline is expected and encouraged: when counts drop, this prints the new numbers
 * and tells you to update .lint-baseline.json and CLAUDE.md §8 together. It does not auto-write
 * them, because a baseline that rewrites itself records nothing.
 *
 * Usage:  npx eslint --format json -o lint.json ; node scripts/ci/check-lint-baseline.mjs lint.json
 */
import { readFileSync } from "node:fs";

const reportPath = process.argv[2] || "lint.json";
const baselinePath = ".lint-baseline.json";

let report;
try {
    report = JSON.parse(readFileSync(reportPath, "utf8"));
} catch (err) {
    console.error(`Could not read the eslint JSON report at ${reportPath}: ${err.message}`);
    process.exit(2);
}

const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));

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
const problems = errors + warnings;

const known = new Set(baseline.ruleIds || []);
const newRuleIds = Object.keys(counts)
    .filter((id) => !known.has(id))
    .sort();

const fmt = (o) => `${o.problems} problems (${o.errors} errors, ${o.warnings} warnings)`;
const now = { problems, errors, warnings };

console.log(`baseline: ${fmt(baseline)}`);
console.log(`current:  ${fmt(now)}`);

const failures = [];

if (errors > baseline.errors) failures.push(`errors increased: ${baseline.errors} -> ${errors}`);
if (warnings > baseline.warnings) failures.push(`warnings increased: ${baseline.warnings} -> ${warnings}`);

if (newRuleIds.length) {
    failures.push(
        `new rule IDs not in the baseline (a new KIND of problem, regardless of the total):\n` +
            newRuleIds.map((id) => `    ${id} x${counts[id]}`).join("\n")
    );
}

if (failures.length) {
    console.error("\nLINT GATE FAILED\n");
    for (const f of failures) console.error(`  - ${f}`);
    console.error(
        "\nIf this is a deliberate, reviewed change, update .lint-baseline.json AND the §8 line in" +
            "\nCLAUDE.md in the same commit, and say why in the commit message.\n"
    );
    process.exit(1);
}

if (problems < baseline.problems) {
    console.log(
        `\nLint IMPROVED by ${baseline.problems - problems} (errors ${baseline.errors - errors}, ` +
            `warnings ${baseline.warnings - warnings}).\n` +
            `Regenerate .lint-baseline.json and update CLAUDE.md §8 so the next run holds this line:\n` +
            `    npx eslint --format json -o lint.json && node scripts/ci/regen-lint-baseline.mjs lint.json\n`
    );
}

console.log("\nLint gate passed.");

/**
 * Explicit lint-staged config, referenced by .husky/pre-commit via `--config`.
 *
 * Passing --config makes lint-staged use ONLY this file and disables its per-directory
 * config discovery. That discovery was the bug: `functions/node_modules/` is tracked in git
 * (8k+ files), and lint-staged would walk into a staged node_modules path, find the legacy
 * `lint-staged: { linters: { "*.{ts,tsx}": ["tslint --fix", "git add"] } }` field in
 * bs-logger/package.json, fail to parse the tslint-era `linters` shape, and crash every commit.
 *
 * As defence-in-depth the task functions also drop any node_modules path, so even a staged
 * vendored file is never handed to eslint/prettier.
 */
const q = (files) => files.map((f) => `"${f}"`).join(" ");
const srcOnly = (files) => files.filter((f) => !f.includes("node_modules/"));

export default {
    "*.{ts,tsx}": (files) => {
        const f = srcOnly(files);
        return f.length ? [`eslint --fix ${q(f)}`, `prettier --write ${q(f)}`] : [];
    },
    "*.{js,jsx,mjs,cjs}": (files) => {
        const f = srcOnly(files);
        return f.length ? [`prettier --write ${q(f)}`] : [];
    },
    "*.{json,md,css,yml,yaml}": (files) => {
        const f = srcOnly(files);
        return f.length ? [`prettier --write ${q(f)}`] : [];
    },
};

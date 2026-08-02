import path from "node:path";

export default {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/tests"],
    testMatch: ["**/*.test.ts"],
    // macOS AppleDouble sidecars (`._foo.test.ts`) are resource-fork binaries that live next
    // to real tests on exFAT volumes. ts-jest tries to parse them and reports 7 phantom suite
    // failures, drowning the real signal. ESLint already ignores them (Phase 1.1); do the same
    // here so a red run always means a REAL failure.
    testPathIgnorePatterns: ["/node_modules/", "/\\._"],
    moduleNameMapper: {
        "^@/(.*)$": path.join(import.meta.dirname, "$1"),
    },
    moduleDirectories: ["node_modules", "<rootDir>"],
};

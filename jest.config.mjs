import path from "node:path";

export default {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/tests"],
    testMatch: ["**/*.test.ts"],
    moduleNameMapper: {
        "^@/(.*)$": path.join(import.meta.dirname, "$1"),
    },
    moduleDirectories: ["node_modules", "<rootDir>"],
};

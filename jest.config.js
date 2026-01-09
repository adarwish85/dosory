const path = require('path');

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    moduleNameMapper: {
        '^@/(.*)$': path.join(__dirname, '$1')
    },
    moduleDirectories: ['node_modules', '<rootDir>']
};

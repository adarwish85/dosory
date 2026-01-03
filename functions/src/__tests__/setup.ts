/**
 * Jest Setup for Firebase Functions Tests
 * 
 * This file is run before each test suite.
 */

// Set environment variables for emulator
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
process.env.GCLOUD_PROJECT = 'dosory-test';

// Increase timeout for async operations
jest.setTimeout(30000);

// Silence console during tests (optional)
// console.log = jest.fn();
// console.warn = jest.fn();

beforeAll(() => {
    console.log('🔥 Running tests with Firebase Emulators');
    console.log(`   Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}`);
});

afterAll(() => {
    console.log('✅ Test suite complete');
});

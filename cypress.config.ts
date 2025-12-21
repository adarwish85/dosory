import { defineConfig } from "cypress";

export default defineConfig({
    e2e: {
        baseUrl: "http://localhost:3000",
        specPattern: "tests/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
        supportFile: false,
        viewportWidth: 1280,
        viewportHeight: 720,
        video: false,
    },
});

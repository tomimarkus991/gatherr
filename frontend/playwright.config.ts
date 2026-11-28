import { defineConfig, devices } from "@playwright/test";

// Set PW_PORT (and DEVTOOLS_PORT, see vite.config.ts) to run e2e in two checkouts at once.
const PORT = Number(process.env.PW_PORT) || 3100;

/**
 * End-to-end tests against the SPA in mock mode: MSW answers every /api/v1 call in the browser,
 * so no backend, database or Google sign-in is needed. Mock data lives in the page, so it resets on
 * every full page load; tests move between pages through the app, not with page.goto.
 */
export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: "retain-on-failure",
		locale: "en-US",
		timezoneId: "Europe/Tallinn",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: `vite dev --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		// GoogleOAuthProvider throws without a client ID; the mock never talks to Google.
		env: { VITE_ENABLE_MOCK: "true", VITE_GOOGLE_CLIENT_ID: "e2e-client-id.apps.googleusercontent.com" },
	},
});

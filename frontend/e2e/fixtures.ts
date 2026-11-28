import { test as base, expect, type Page } from "@playwright/test";

/** The MSW handlers accept this token as a signed-in user (src/mocks/handlers.ts). */
const MOCK_TOKEN = "mock-token";

export const test = base.extend<{ signedIn: Page }>({
	signedIn: async ({ page }, use) => {
		await page.addInitScript(token => localStorage.setItem("token", token), MOCK_TOKEN);
		await use(page);
	},
});

export { expect };

/**
 * Goes from the home page to a new event page: name, one date next month, default time range.
 * Closes the share prompt that the create flow opens, so the event page is ready to use.
 */
export async function createEvent(page: Page, name: string) {
	await page.goto("/");
	// Signed in, the create card moves into the event list once it loads; retry if Enter hit the old card
	await expect(async () => {
		await page.getByPlaceholder(/Team meeting/).fill(name);
		await page.getByPlaceholder(/Team meeting/).press("Enter");
		await expect(page).toHaveURL(/\/create\?name=/, { timeout: 2000 });
	}).toPass();

	// The month arrows have no label; the right chevron is the "next month" button.
	await page.locator("button:has(svg.lucide-chevron-right)").first().click();
	await page.locator("[data-date]").nth(10).click();
	await page.getByRole("button", { name: "Create Event" }).click();

	await expect(page).toHaveURL(/\/e\/[\w-]+\?fromCreate=true$/);
	await expect(page.getByRole("dialog", { name: "Share this event with your friends" })).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page).toHaveURL(/\/e\/[\w-]+$/);
	await expect(page.getByText(name, { exact: true })).toBeVisible();
}

/**
 * Replaces Google's sign-in script with a stub whose token client answers at once with the access
 * token "mock-google-<id>", which the MSW handlers sign in as that mock user (src/mocks/data.ts).
 * Call before the first page load; pick the account with `chooseGoogleAccount`.
 */
export async function stubGoogleSignIn(page: Page) {
	await page.route("https://accounts.google.com/gsi/client", route =>
		route.fulfill({
			contentType: "text/javascript",
			body: `window.google = { accounts: { oauth2: { initTokenClient: config => ({
				requestAccessToken: () => setTimeout(() =>
					config.callback({ access_token: "mock-google-" + (window.__googleAccountId ?? 1) })),
			}) } } };`,
		}),
	);
}

/** The mock user id the stubbed Google popup signs in as next. */
export async function chooseGoogleAccount(page: Page, userId: number) {
	await page.evaluate(id => {
		(window as unknown as { __googleAccountId: number }).__googleAccountId = id;
	}, userId);
}

/** Opens the user menu and clicks "Continue with Google". */
export async function signInFromUserMenu(page: Page) {
	await userMenu(page).click();
	await page.getByRole("dialog").getByRole("button", { name: "Continue with Google" }).click();
	await expect(userMenu(page).locator("svg.lucide-user-round-check")).toBeVisible();
	await page.keyboard.press("Escape");
}

/** Opens the user menu and clicks "Sign out". */
export async function signOutFromUserMenu(page: Page) {
	await userMenu(page).click();
	await page.getByRole("dialog").getByRole("button", { name: "Sign out" }).click();
	await expect(userMenu(page).locator("svg.lucide-user-round")).toBeVisible();
	await page.keyboard.press("Escape");
}

/** The user menu button (top right): a person icon, with a check mark when signed in. */
const userMenu = (page: Page) =>
	page.locator("button:has(svg.lucide-user-round, svg.lucide-user-round-check)");

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
	await page.getByPlaceholder(/Team meeting/).fill(name);
	await page.getByPlaceholder(/Team meeting/).press("Enter");
	await expect(page).toHaveURL(/\/create\?name=/);

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

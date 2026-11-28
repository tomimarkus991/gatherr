import { createEvent, expect, test } from "./fixtures";

/** Creates an event and stops on the share prompt that the create flow opens. */
async function createEventToSharePrompt(page: import("@playwright/test").Page, name: string) {
	await page.goto("/");
	await page.getByPlaceholder(/Team meeting/).fill(name);
	await page.getByPlaceholder(/Team meeting/).press("Enter");
	await page.locator("button:has(svg.lucide-chevron-right)").first().click();
	await page.locator("[data-date]").nth(10).click();
	await page.getByRole("button", { name: "Create Event" }).click();
	await expect(page).toHaveURL(/\/e\/[\w-]+\?fromCreate=true$/);
	const dialog = page.getByRole("dialog", { name: "Share this event with your friends" });
	await expect(dialog).toBeVisible();
	return dialog;
}

test("share prompt opens after creating and shares the clean event URL", async ({
	signedIn: page,
	baseURL,
}) => {
	await page.addInitScript(() => {
		const calls: ShareData[] = [];
		Object.assign(window, { shareCalls: calls });
		Object.defineProperty(navigator, "share", {
			value: (data: ShareData) => {
				calls.push(data);
				return Promise.resolve();
			},
			configurable: true,
		});
	});

	const dialog = await createEventToSharePrompt(page, "Quiz night");
	await expect(dialog.locator('img[src="/fireplace.svg"]')).toBeVisible();
	await dialog.getByRole("button", { name: "Share", exact: true }).click();

	const shortId = new URL(page.url()).pathname.split("/").pop();
	const calls = await page.evaluate(() => (window as unknown as { shareCalls: ShareData[] }).shareCalls);
	expect(calls).toEqual([{ url: `${baseURL}/e/${shortId}`, title: "Quiz night" }]);
});

test("share prompt copies the link when the share sheet is unavailable", async ({
	signedIn: page,
	context,
	baseURL,
}) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.addInitScript(() => {
		Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
	});

	const dialog = await createEventToSharePrompt(page, "Karaoke");
	await dialog.getByRole("button", { name: "Share", exact: true }).click();

	await expect(page.getByText("Link copied!")).toBeVisible();
	const shortId = new URL(page.url()).pathname.split("/").pop();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${baseURL}/e/${shortId}`);
});

// A reload resets the in-page mock data, so this checks the URL a reload would use; the test
// below shows that URL never opens the prompt.
test("closing the share prompt removes fromCreate so a reload does not reopen it", async ({
	signedIn: page,
}) => {
	const dialog = await createEventToSharePrompt(page, "Hike");
	await page.getByRole("dialog").locator("button:has(svg.lucide-x)").click();

	await expect(dialog).toBeHidden();
	await expect(page).toHaveURL(/\/e\/[\w-]+$/);

	// Replace, not push: going back must not land on the ?fromCreate=true entry.
	await page.goBack();
	await expect(page).not.toHaveURL(/fromCreate/);

});

test("visiting an event without fromCreate never shows the share prompt", async ({ page }) => {
	await page.goto("/e/game-night");
	await expect(page.getByText("Game Night", { exact: true })).toBeVisible();
	await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("share prompt is not shown again after the create helper closes it", async ({
	signedIn: page,
}) => {
	await createEvent(page, "Brunch");
	await expect(page.getByRole("dialog")).toHaveCount(0);
});

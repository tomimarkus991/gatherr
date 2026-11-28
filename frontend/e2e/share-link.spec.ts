import { expect, test } from "./fixtures";

// "game-night" is a fixed mock event, so its link is known up front.
const SHORT_ID = "game-night";
const EVENT_NAME = "Game Night";

test.describe("desktop", () => {
	test("event page shows the link as text and copies the clean URL, with no app buttons", async ({
		page,
		context,
		baseURL,
	}) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.goto(`/e/${SHORT_ID}?utm=x`);
		await expect(page.getByText(EVENT_NAME, { exact: true })).toBeVisible();

		const host = new URL(baseURL ?? "").host;
		await expect(page.getByText(`${host}/e/${SHORT_ID}`, { exact: true })).toBeVisible();
		await page.getByRole("button", { name: "Copy link" }).click();

		await expect(page.getByText("Link copied!")).toBeVisible();
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${baseURL}/e/${SHORT_ID}`);
		await expect(page.getByRole("link", { name: /WhatsApp|Telegram|Messenger/ })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Share", exact: true })).toHaveCount(0);
	});
});

test.describe("phone", () => {
	test.use({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });

	test.beforeEach(async ({ page }) => {
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
	});

	test("event page shows WhatsApp, Telegram and Messenger links with encoded URLs", async ({
		page,
		baseURL,
	}) => {
		await page.goto(`/e/${SHORT_ID}`);
		await expect(page.getByText(EVENT_NAME, { exact: true })).toBeVisible();

		const url = `${baseURL}/e/${SHORT_ID}`;
		const enc = encodeURIComponent;
		const expected = {
			"Share on WhatsApp": `https://wa.me/?text=${enc(`${EVENT_NAME} ${url}`)}`,
			"Share on Telegram": `https://t.me/share/url?url=${enc(url)}&text=${enc(EVENT_NAME)}`,
			"Share on Messenger": `fb-messenger://share?link=${enc(url)}`,
		};
		for (const [name, href] of Object.entries(expected)) {
			const link = page.getByRole("link", { name });
			await expect(link).toHaveAttribute("href", href);
			await expect(link).toHaveAttribute("rel", "noopener noreferrer");
		}

		const host = new URL(baseURL ?? "").host;
		await expect(page.getByText(`${host}/e/${SHORT_ID}`, { exact: true })).toBeVisible();
		await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();

		await page.getByRole("button", { name: "Share", exact: true }).click();
		const calls = await page.evaluate(() => (window as unknown as { shareCalls: ShareData[] }).shareCalls);
		expect(calls).toEqual([{ url, title: EVENT_NAME }]);

		// Fits a 375px phone without sideways scrolling.
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
	});

	test("share prompt shows the link, copy and the app buttons", async ({ signedIn: page, baseURL }) => {
		await page.goto(`/e/${SHORT_ID}?fromCreate=true`);
		const dialog = page.getByRole("dialog", { name: "Share this event with your friends" });
		await expect(dialog).toBeVisible();

		const host = new URL(baseURL ?? "").host;
		await expect(dialog.getByText(`${host}/e/${SHORT_ID}`, { exact: true })).toBeVisible();
		await expect(dialog.getByRole("button", { name: "Copy link" })).toBeVisible();
		await expect(dialog.getByRole("button", { name: "Share", exact: true })).toBeVisible();
		await expect(dialog.getByRole("link", { name: "Share on WhatsApp" })).toBeVisible();
		await expect(dialog.getByRole("link", { name: "Share on Telegram" })).toBeVisible();
		await expect(dialog.getByRole("link", { name: "Share on Messenger" })).toBeVisible();
	});
});

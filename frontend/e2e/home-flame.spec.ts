import { expect, signInFromUserMenu, stubGoogleSignIn, test } from "./fixtures";

test("signed in with events, the flame background sits behind the event list", async ({ page }) => {
	await stubGoogleSignIn(page);
	await page.goto("/");
	await signInFromUserMenu(page);

	const flame = page.getByTestId("flame-background");
	await expect(flame.getByRole("link", { name: /Oliver's picnic/ })).toBeVisible();
	await expect(flame.locator("canvas")).toHaveCount(1);
});

test("the decrypting hero title stays on one line while it scrambles (375px)", async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 800 });
	// A fake clock lets the test step through the 1 s decrypt frame by frame.
	await page.clock.install();
	await page.goto("/");
	const layer = page.locator("p.text-4xl [aria-hidden]").first();
	await expect(layer).toBeAttached();

	/** Distinct line tops of the visible title text. */
	const lineCount = () =>
		layer.evaluate(el => {
			const range = document.createRange();
			range.selectNodeContents(el);
			return new Set(
				Array.from(range.getClientRects())
					.filter(rect => rect.width > 0)
					.map(rect => Math.round(rect.top)),
			).size;
		});

	const counts: number[] = [];
	for (let ms = 0; ms <= 1100; ms += 50) {
		await page.clock.runFor(50);
		counts.push(await lineCount());
	}

	expect(Math.min(...counts)).toBe(1);
	expect(Math.max(...counts)).toBe(1);
});

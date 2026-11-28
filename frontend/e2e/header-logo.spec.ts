import { createEvent, expect, test } from "./fixtures";

test("signed-in user goes home from the event page logo", async ({ signedIn: page }) => {
	await createEvent(page, "Pizza night");
	await page.getByRole("link", { name: "Gatherr" }).click();
	await expect(page).toHaveURL(/\/$/);
});

test("signed-out visitor goes home from the event page logo", async ({ page }) => {
	await page.goto("/e/game-night");
	await page.getByRole("link", { name: "Gatherr" }).click();
	await expect(page).toHaveURL(/\/$/);
});

test("logo shows top left on phone width without horizontal scroll", async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 800 });
	await page.goto("/e/game-night");

	const logo = page.getByRole("link", { name: "Gatherr" });
	await expect(logo).toBeVisible();
	const box = await logo.boundingBox();
	expect(box?.x).toBeLessThan(60);
	expect(box?.y).toBeLessThan(60);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test("logo on the create page goes home", async ({ page }) => {
	await page.goto("/create?name=Test");
	await page.getByRole("link", { name: "Gatherr home" }).click();
	await expect(page).toHaveURL(/\/$/);
});

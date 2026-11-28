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

test("navbar wordmark sits in the centre with the fireplace on the left (375px)", async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 800 });
	await page.goto("/create?name=Test");

	const wordmark = page.getByRole("link", { name: "Gatherr home" });
	const box = await wordmark.boundingBox();
	const centre = box ? box.x + box.width / 2 : 0;
	expect(Math.abs(centre - 375 / 2)).toBeLessThan(8);

	const fireplace = await page.locator("nav img[src='/fireplace.svg']").boundingBox();
	expect(fireplace?.x).toBeLessThan(60);
});

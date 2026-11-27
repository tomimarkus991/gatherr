import { createEvent, expect, test } from "./fixtures";

test("participant marks slots, saves, and appears with that many slots", async ({ signedIn: page }) => {
	await createEvent(page, "Team lunch");

	await page.getByRole("tab", { name: "Your availability" }).click();
	const slots = page.locator("[data-slot]");
	await slots.nth(0).click();
	await slots.nth(1).click();
	await slots.nth(2).click();
	await page.getByRole("button", { name: "Save" }).click();

	await expect(page.getByText("3 time slots")).toBeVisible();
});

test("select all marks every slot", async ({ signedIn: page }) => {
	await createEvent(page, "Board games");

	await page.getByRole("tab", { name: "Your availability" }).click();
	const total = await page.locator("[data-slot]").count();
	await page.getByRole("button", { name: "Select all", exact: true }).click();
	await page.getByRole("button", { name: "Save" }).click();

	await expect(page.getByText(`${total} time slots`)).toBeVisible();
});

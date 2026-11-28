import { createEvent, expect, test } from "./fixtures";

// A createEvent event has one date with 30-minute slots from 08:00, so the 08:00 row holds one cell
// and the date column holds every cell.

test("a time label turns orange when its row is fully marked, and dark again when one is unmarked", async ({
	signedIn: page,
}) => {
	await createEvent(page, "Row label");
	await page.getByRole("tab", { name: "Your availability" }).click();

	const label = page.getByRole("button", { name: "08:00", exact: true });
	await expect(label).toHaveAttribute("data-full", "false");
	await label.click();
	await expect(label).toHaveAttribute("data-full", "true");
	await expect(label).toHaveClass(/bg-primary/);

	await page.locator('[data-slot^="0800-"]').click();
	await expect(label).toHaveAttribute("data-full", "false");
	await expect(label).not.toHaveClass(/bg-primary/);
});

test("a date label turns orange when its column is fully marked, and dark again when one is unmarked", async ({
	signedIn: page,
}) => {
	await createEvent(page, "Column label");
	await page.getByRole("tab", { name: "Your availability" }).click();

	const label = page.getByRole("tabpanel").locator("button[data-column]");
	await expect(label).toHaveAttribute("data-full", "false");
	await label.click();
	await expect(label).toHaveAttribute("data-full", "true");
	await expect(label).toHaveClass(/bg-primary/);

	await page.locator("[data-slot]").nth(3).click();
	await expect(label).toHaveAttribute("data-full", "false");
	await expect(label).not.toHaveClass(/bg-primary/);
});

test("one text toggle selects and deselects all, and Save sits below the grid", async ({
	signedIn: page,
}) => {
	await createEvent(page, "Toggle all");
	await page.getByRole("tab", { name: "Your availability" }).click();

	const total = await page.locator("[data-slot]").count();
	await expect(page.getByRole("button", { name: "Deselect all", exact: true })).toHaveCount(0);
	await page.getByRole("button", { name: "Select all", exact: true }).click();
	await expect(page.locator("[data-slot] svg.lucide-check")).toHaveCount(total);
	await expect(page.getByRole("button", { name: "Select all", exact: true })).toHaveCount(0);

	await page.getByRole("button", { name: "Deselect all", exact: true }).click();
	await expect(page.locator("[data-slot] svg.lucide-check")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Select all", exact: true })).toBeVisible();

	const save = await page.getByRole("button", { name: "Save" }).boundingBox();
	const lastCell = await page.locator("[data-slot]").last().boundingBox();
	expect(save!.y).toBeGreaterThan(lastCell!.y + lastCell!.height);
});

test("a grid wider than the viewport gets arrow buttons that scroll it", async ({ signedIn: page }) => {
	await page.setViewportSize({ width: 480, height: 900 });
	await page.goto("/e/game-night");

	for (const tab of ["Your availability", "Group availability"]) {
		await page.getByRole("tab", { name: tab }).click();
		const panel = page.getByRole("tabpanel");
		const left = panel.getByRole("button", { name: "Scroll left" });
		const right = panel.getByRole("button", { name: "Scroll right" });

		await expect(right).toBeVisible();
		await expect(left).toHaveCount(0);
		await right.click();
		await expect(left).toBeVisible();
	}
});

test("a grid that fits shows no arrow buttons", async ({ signedIn: page }) => {
	await createEvent(page, "Narrow");
	for (const tab of ["Your availability", "Group availability"]) {
		await page.getByRole("tab", { name: tab }).click();
		await expect(page.locator("[data-slot]").first().or(page.getByRole("tabpanel").locator("button.relative").first())).toBeVisible();
		await expect(page.getByRole("button", { name: /^Scroll (left|right)$/ })).toHaveCount(0);
	}
});

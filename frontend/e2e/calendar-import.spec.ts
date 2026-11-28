import type { Page } from "@playwright/test";
import { createEvent, expect, test } from "./fixtures";

// The mock calendars (src/mocks/data.ts) are busy every day at: Personal 13:00, Work 10:00 and
// 17:00, Family 21:00. A createEvent event runs 08:00–17:00 in 30-minute slots on one date.

/** Starts the mock already connected to Google Calendar (the flag survives reloads in sessionStorage). */
async function connectCalendar(page: Page) {
	await page.addInitScript(() => sessionStorage.setItem("mockCalendarConnected", "true"));
}

async function openPicker(page: Page) {
	await page.getByRole("tab", { name: "Your availability" }).click();
	await page.getByRole("button", { name: "Import from Google Calendar" }).click();
	await expect(page.getByText("Select calendars to import")).toBeVisible();
}

async function importFrom(page: Page, calendars: string[]) {
	for (const name of calendars) await page.getByRole("checkbox", { name }).check();
	await page.getByRole("button", { name: "Import busy times" }).click();
}

test("connect step lands back on game-night, then import keeps the 19:00 peak free", async ({
	signedIn: page,
}) => {
	await page.goto("/e/game-night");
	await page.getByRole("tab", { name: "Your availability" }).click();
	await page.getByRole("button", { name: "Import from Google Calendar" }).click();

	await expect(page.getByText("Connect your Google Calendar to import busy times.")).toBeVisible();
	await page.getByRole("button", { name: "Connect Google Calendar" }).click();
	await expect(page.getByText("Google Calendar connected!")).toBeVisible();
	await expect(page).toHaveURL(/\/e\/game-night$/, { timeout: 5000 });

	// Mark everything, then import every calendar: busy slots go, the Wed 13 May 19:00 peak stays.
	await page.getByRole("tab", { name: "Your availability" }).click();
	await page.getByRole("button", { name: "Select all", exact: true }).click();
	await page.getByRole("button", { name: "Import from Google Calendar" }).click();
	await importFrom(page, ["Personal", "Work", "Family"]);

	await expect(page.getByText(/busy slots removed from your selection\. Availability saved\./)).toBeVisible();
	await expect(page.locator('[data-slot="1300-13052026"]')).toHaveAttribute("data-blocked", "true");
	await expect(page.locator('[data-slot="1900-13052026"] svg.lucide-check')).toHaveCount(1);

	// The import already saved every slot except the blocked ones; the group tab shows it.
	const total = await page.locator("[data-slot]").count();
	const blocked = await page.locator("[data-slot][data-blocked]").count();
	expect(blocked).toBeGreaterThan(0);
	await page.getByRole("tab", { name: "Group availability" }).click();
	await expect(page.getByText(`${total - blocked} time slots`)).toBeVisible();
});

test("picker lists the calendars, explains Busy, and select all toggles them", async ({
	signedIn: page,
}) => {
	await connectCalendar(page);
	await createEvent(page, "Calendar list");
	await openPicker(page);

	await expect(page.getByText("Only events marked Busy in Google Calendar count.", { exact: false })).toBeVisible();
	const boxes = page.getByRole("checkbox");
	await expect(boxes).toHaveCount(3);
	await expect(page.getByRole("checkbox", { name: "Personal" })).toBeVisible();
	await expect(page.getByRole("checkbox", { name: "Work" })).toBeVisible();
	await expect(page.getByRole("checkbox", { name: "Family" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Import busy times" })).toBeDisabled();

	// The picker's toggle comes before the grid's "Select all" in the page.
	await page.getByRole("button", { name: "Select all", exact: true }).first().click();
	for (const box of await boxes.all()) await expect(box).toBeChecked();
	await page.getByRole("button", { name: "Deselect all", exact: true }).first().click();
	for (const box of await boxes.all()) await expect(box).not.toBeChecked();

	// Keyboard: the styled squares are real checkboxes, so Space toggles them.
	await page.getByRole("checkbox", { name: "Work" }).focus();
	await page.keyboard.press("Space");
	await expect(page.getByRole("checkbox", { name: "Work" })).toBeChecked();

	await page.getByRole("button", { name: "Cancel" }).click();
	await expect(page.getByRole("button", { name: "Import from Google Calendar" })).toBeVisible();
});

test("import removes selected busy slots and says how many", async ({ signedIn: page }) => {
	await connectCalendar(page);
	await createEvent(page, "Busy removed");
	await page.getByRole("tab", { name: "Your availability" }).click();
	const total = await page.locator("[data-slot]").count();
	await page.getByRole("button", { name: "Select all", exact: true }).click();

	await page.getByRole("button", { name: "Import from Google Calendar" }).click();
	await importFrom(page, ["Personal"]);

	await expect(page.getByText("2 busy slots removed from your selection. Availability saved.")).toBeVisible();
	// Saved by the import itself, without pressing Save.
	await page.getByRole("tab", { name: "Group availability" }).click();
	await expect(page.getByText(`${total - 2} time slots`)).toBeVisible();
});

test("busy cells show blocked, select all skips them, tapping one unblocks it", async ({
	signedIn: page,
}) => {
	await connectCalendar(page);
	await createEvent(page, "Blocked cells");
	await openPicker(page);
	await importFrom(page, ["Personal"]);
	await expect(page.getByText(/Availability saved/)).toBeVisible();

	const blocked = page.locator("[data-slot][data-blocked]");
	await expect(blocked).toHaveCount(2);
	await expect(blocked.locator("svg.lucide-ban")).toHaveCount(2);
	await expect(blocked.first()).toHaveAttribute("data-slot", /^1300-/);

	const total = await page.locator("[data-slot]").count();
	await page.getByRole("button", { name: "Select all", exact: true }).click();
	await expect(page.locator("[data-slot] svg.lucide-check")).toHaveCount(total - 2);
	await expect(blocked).toHaveCount(2);

	// The 13:00 row toggle skips its blocked cell too: it deselects the row's other cells only.
	await page.getByRole("button", { name: "13:00", exact: true }).click();
	await expect(page.locator('[data-slot^="1300-"]')).toHaveAttribute("data-blocked", "true");

	await blocked.first().click();
	await expect(page.locator('[data-slot^="1300-"]')).not.toHaveAttribute("data-blocked", /.*/);
	await expect(page.locator('[data-slot^="1300-"] svg.lucide-check')).toHaveCount(1);
	await expect(blocked).toHaveCount(1);
});

test("import with nothing selected says how many busy slots it found", async ({
	signedIn: page,
}) => {
	await connectCalendar(page);
	await createEvent(page, "Busy none selected");
	await openPicker(page);
	await importFrom(page, ["Personal"]);

	await expect(page.getByText("2 busy slots found, none were selected. Availability saved.")).toBeVisible();
});

test("import with no busy slots says no conflicts", async ({ signedIn: page }) => {
	await connectCalendar(page);
	await createEvent(page, "No conflicts");
	await openPicker(page);
	await importFrom(page, ["Family"]);

	await expect(page.getByText("No conflicts found in your calendars. Availability saved.")).toBeVisible();
	await expect(page.locator("[data-slot][data-blocked]")).toHaveCount(0);
});

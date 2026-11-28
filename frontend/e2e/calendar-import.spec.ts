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

test("busy cells show blocked, select all skips them, tapping one asks before unblocking it", async ({
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
	await page.getByRole("dialog").getByRole("button", { name: "Mark available" }).click();
	await expect(page.locator('[data-slot^="1300-"]')).not.toHaveAttribute("data-blocked", /.*/);
	await expect(page.locator('[data-slot^="1300-"] svg.lucide-check')).toHaveCount(1);
	await expect(blocked).toHaveCount(1);
});

/** A new event with Personal imported: its 13:00 and 13:30 cells are blocked, busy 13:00–14:00. */
async function importPersonal(page: Page, name: string) {
	await connectCalendar(page);
	await createEvent(page, name);
	await openPicker(page);
	await importFrom(page, ["Personal"]);
	await expect(page.getByText(/Availability saved/)).toBeVisible();
	await expect(page.locator("[data-slot][data-blocked]")).toHaveCount(2);
}

const cell = (page: Page, time: string) => page.locator(`[data-slot^="${time}-"]`);

/** Drags the mouse through the centres of the cells at `times`, which must fit in the viewport. */
async function drag(page: Page, times: string[]) {
	// The grid handles the drag with elementFromPoint, which only sees the viewport.
	await cell(page, times[Math.floor(times.length / 2)]).evaluate(el =>
		el.scrollIntoView({ block: "center" }),
	);
	const points = [];
	for (const time of times) {
		const box = await cell(page, time).boundingBox();
		if (!box) throw new Error(`no cell at ${time}`);
		points.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
	}
	await page.mouse.move(points[0].x, points[0].y);
	await page.mouse.down();
	for (const point of points.slice(1)) await page.mouse.move(point.x, point.y, { steps: 4 });
	await page.mouse.up();
}

test("hovering a blocked cell says which calendar is busy and when", async ({ signedIn: page }) => {
	await importPersonal(page, "Blocked tooltip");

	await cell(page, "1330").hover();
	await expect(page.getByRole("tooltip")).toHaveText("Busy in Personal · 13:00–14:00");

	await cell(page, "1200").hover();
	await expect(page.getByRole("tooltip")).toHaveCount(0);
});

test("tapping a blocked cell and confirming marks it available", async ({ signedIn: page }) => {
	await importPersonal(page, "Blocked confirm");

	await cell(page, "1300").click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toContainText(
		"You're busy here (Personal, 13:00–14:00). Mark yourself available anyway?",
	);
	await dialog.getByRole("button", { name: "Mark available" }).click();

	await expect(dialog).toHaveCount(0);
	await expect(cell(page, "1300")).not.toHaveAttribute("data-blocked", /.*/);
	await expect(cell(page, "1300").locator("svg.lucide-check")).toHaveCount(1);
	await expect(cell(page, "1330")).toHaveAttribute("data-blocked", "true");
});

test("tapping a blocked cell and cancelling keeps it blocked", async ({ signedIn: page }) => {
	await importPersonal(page, "Blocked cancel");

	await cell(page, "1300").click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await dialog.getByRole("button", { name: "Cancel" }).click();

	await expect(dialog).toHaveCount(0);
	await expect(cell(page, "1300")).toHaveAttribute("data-blocked", "true");
	await expect(cell(page, "1300").locator("svg.lucide-check")).toHaveCount(0);
});

test("dragging across blocked cells skips them without asking", async ({ signedIn: page }) => {
	await importPersonal(page, "Blocked drag");

	// One date column: drag down from 12:00 to 14:00, across the blocked 13:00 and 13:30.
	await drag(page, ["1200", "1230", "1300", "1330", "1400"]);

	await expect(page.getByRole("dialog")).toHaveCount(0);
	for (const time of ["1200", "1230", "1400"]) {
		await expect(cell(page, time).locator("svg.lucide-check")).toHaveCount(1);
	}
	for (const time of ["1300", "1330"]) {
		await expect(cell(page, time)).toHaveAttribute("data-blocked", "true");
		await expect(cell(page, time).locator("svg.lucide-check")).toHaveCount(0);
	}
});

test("a drag that starts on a blocked cell skips it too", async ({ signedIn: page }) => {
	await importPersonal(page, "Blocked drag start");

	await drag(page, ["1330", "1400"]);

	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(cell(page, "1330")).toHaveAttribute("data-blocked", "true");
	await expect(cell(page, "1400").locator("svg.lucide-check")).toHaveCount(1);
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

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/** Opens the group heatmap and the popover of its nth slot cell. */
async function openGroupSlot(page: Page, nth: number) {
	await page.getByRole("tab", { name: "Group availability" }).click();
	const panel = page.getByRole("tabpanel");
	await panel.locator("button.relative").nth(nth).click();
	return page.getByRole("dialog");
}

/** Waits until the signed-in user has loaded; before that no one sees organiser actions. */
async function waitForMe(page: Page) {
	await expect(page.locator("svg.lucide-user-round-check")).toBeVisible();
}

test("organiser starts the time round on a date and the event asks for times on it", async ({
	signedIn: page,
}) => {
	await page.goto("/e/team-trip");
	await waitForMe(page);
	await expect(page.getByTestId("time-round-date")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Day votes" })).toHaveCount(0);

	// The first date column is Mon 7 Dec 2026.
	const popover = await openGroupSlot(page, 0);
	await popover.getByRole("button", { name: "Pick a time for this date" }).click();
	await popover.getByLabel("Start time").fill("18:00");
	await popover.getByLabel("End time").fill("20:00");
	await popover.getByLabel("Increment").selectOption("60");
	await popover.getByRole("button", { name: "Start time round" }).click();

	await expect(page.getByText("Time round started.", { exact: false })).toBeVisible();
	await expect(page.getByTestId("time-round-date")).toContainText("7 December");

	// "Yours": one column for the chosen date, one row per time.
	await page.getByRole("tab", { name: "Your availability" }).click();
	const yours = page.getByRole("tabpanel");
	await expect(yours.getByRole("button", { name: "18:00" })).toBeVisible();
	await expect(yours.getByRole("button", { name: "19:00" })).toBeVisible();
	await expect(yours.getByRole("button", { name: "20:00" })).toBeVisible();
	await expect(yours.locator("[data-slot]")).toHaveCount(3);

	// The date votes stay, read-only, in a collapsed section.
	await page.getByRole("button", { name: "Day votes" }).click();
	const dayVotes = page.getByTestId("day-votes");
	await expect(dayVotes.locator("[data-day]")).toHaveCount(3);
	await expect(dayVotes.locator('[data-day="07122026"]')).toContainText("2");
});

test("a participant sees the time grid on the chosen date and the date votes", async ({
	signedIn: page,
}) => {
	await page.goto("/e/olivers-time-round");
	await waitForMe(page);
	await expect(page.getByTestId("time-round-date")).toContainText("8 December");

	await page.getByRole("tab", { name: "Your availability" }).click();
	const yours = page.getByRole("tabpanel");
	await expect(yours.getByRole("button", { name: "17:00" })).toBeVisible();
	await expect(yours.locator("[data-slot]")).toHaveCount(5);
	await expect(yours.locator("[data-slot]").first()).toHaveAttribute("data-slot", /-08122026$/);

	await page.getByRole("button", { name: "Day votes" }).click();
	await expect(page.getByTestId("day-votes").locator("[data-day]")).toHaveCount(2);

	// Already in the time round: no one can start it again.
	const popover = await openGroupSlot(page, 0);
	await expect(popover.getByRole("button", { name: "Pick a time for this date" })).toHaveCount(0);
});

test("a participant who is not the organiser never sees the start action", async ({
	signedIn: page,
}) => {
	await page.goto("/e/olivers-day-vote");
	await expect(page.getByText("Oliver's day vote", { exact: true })).toBeVisible();
	await waitForMe(page);

	const popover = await openGroupSlot(page, 0);
	await expect(popover).toBeVisible();
	await expect(popover.getByRole("button", { name: "Pick a time for this date" })).toHaveCount(0);
});

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/** Opens the group heatmap and the popover of its nth slot cell. */
async function openGroupSlot(page: Page, nth: number) {
	await page.getByRole("tab", { name: "Group availability" }).click();
	const panel = page.getByRole("tabpanel");
	await panel.locator("button.relative").nth(nth).click();
	return page.getByRole("dialog");
}

test("organiser confirms a time and everyone sees it on the event page", async ({
	signedIn: page,
}) => {
	await page.goto("/e/game-night");
	await expect(page.getByTestId("confirmed-time")).toHaveCount(0);

	const popover = await openGroupSlot(page, 0);
	const confirm = popover.getByRole("button", { name: /^Confirm / });
	await expect(confirm).toBeVisible();
	const label = (await confirm.textContent()) ?? "";
	const time = label.match(/\d{2}:\d{2}/)?.[0];
	expect(time).toBeTruthy();
	await confirm.click();

	await expect(page.getByText("Final time confirmed.", { exact: false })).toBeVisible();
	await expect(popover).toBeHidden();
	const banner = page.getByTestId("confirmed-time");
	await expect(banner).toContainText("Final time");
	await expect(banner).toContainText(`${time}–`);
});

test("confirming another slot replaces the shown time", async ({ signedIn: page }) => {
	await page.goto("/e/game-night");

	await (await openGroupSlot(page, 0)).getByRole("button", { name: /^Confirm / }).click();
	const banner = page.getByTestId("confirmed-time");
	await expect(banner).toBeVisible();
	const first = await banner.textContent();
	await expect(page.getByRole("dialog")).toHaveCount(0);

	// A cell further on is a different slot (another day, time or both).
	const popover = await openGroupSlot(page, 7);
	const second = popover.getByRole("button", { name: /^Confirm / });
	const secondTime = ((await second.textContent()) ?? "").match(/\d{2}:\d{2}/)?.[0];
	await second.click();

	// Retries until the banner shows the new slot, then checks its time.
	await expect(banner).not.toHaveText(first ?? "");
	await expect(banner).toContainText(`${secondTime}–`);
});

test("a signed-in participant who is not the organiser sees no confirm action", async ({
	signedIn: page,
}) => {
	await page.goto("/e/olivers-picnic");
	await expect(page.getByText("Oliver's picnic", { exact: true })).toBeVisible();
	// Wait until the signed-in user has loaded; before that no one sees the action.
	await expect(page.locator("svg.lucide-user-round-check")).toBeVisible();

	const popover = await openGroupSlot(page, 0);
	await expect(popover).toBeVisible();
	await expect(popover.getByRole("button", { name: /^Confirm / })).toHaveCount(0);
});

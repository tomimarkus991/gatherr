import { expect, signInFromUserMenu, stubGoogleSignIn, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
	await stubGoogleSignIn(page);
	await page.goto("/");
	await signInFromUserMenu(page);
});

test("signed in, the create card sits above my events", async ({ page }) => {
	const firstEvent = page.getByRole("link", { name: /Oliver's picnic/ });
	await expect(firstEvent).toBeVisible();
	const input = page.getByPlaceholder(/./).first();

	const inputBox = await input.boundingBox();
	const eventBox = await firstEvent.boundingBox();
	expect(inputBox && eventBox && inputBox.y < eventBox.y).toBe(true);
});

test("each event shows its status and when it was created, newest first", async ({ page }) => {
	const timeRound = page.getByRole("link", { name: /Oliver's time round/ });
	const picnic = page.getByRole("link", { name: /Oliver's picnic/ });

	await expect(timeRound.getByTestId("event-meta")).toContainText("Picking a time");
	await expect(timeRound.getByTestId("event-meta")).toContainText("Created");
	await expect(picnic.getByTestId("event-meta")).toContainText("Open");

	// The time round was created today; the picnic some time in the past
	const timeRoundBox = await timeRound.boundingBox();
	const picnicBox = await picnic.boundingBox();
	expect(timeRoundBox && picnicBox && timeRoundBox.y < picnicBox.y).toBe(true);
});

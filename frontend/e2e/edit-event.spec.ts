import { createEvent, expect, test } from "./fixtures";

test("creator edits the event name and description", async ({ signedIn: page }) => {
	await createEvent(page, "Book club");

	await page.getByRole("button", { name: "Edit" }).click();
	const dialog = page.getByRole("dialog", { name: "Edit event" });
	await expect(dialog.getByLabel("Name")).toHaveValue("Book club");
	await expect(dialog.getByLabel("Description")).toHaveValue("");

	await dialog.getByLabel("Name").fill("Poetry club");
	await dialog.getByLabel("Description").fill("Bring a favourite poem");
	await dialog.getByRole("button", { name: "Save" }).click();

	await expect(dialog).toBeHidden();
	await expect(page.getByText("Poetry club", { exact: true })).toBeVisible();
	await expect(page.getByText("Bring a favourite poem")).toBeVisible();

	// Reopening prefills the saved values.
	await page.getByRole("button", { name: "Edit" }).click();
	await expect(dialog.getByLabel("Name")).toHaveValue("Poetry club");
	await expect(dialog.getByLabel("Description")).toHaveValue("Bring a favourite poem");
});

test("signed-out visitor sees no Edit button", async ({ page }) => {
	await page.goto("/e/game-night");
	await expect(page.getByText("Game Night", { exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
});

test("signed-in user who is not the creator sees no Edit button", async ({ signedIn: page }) => {
	await page.goto("/e/olivers-picnic");
	await expect(page.getByText("Oliver's picnic", { exact: true })).toBeVisible();
	// Wait until the signed-in user has loaded; before that no one sees the button.
	await expect(page.locator("svg.lucide-user-round-check")).toBeVisible();
	await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
});

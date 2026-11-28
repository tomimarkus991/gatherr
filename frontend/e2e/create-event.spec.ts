import { createEvent, expect, test } from "./fixtures";

test("signed-in organiser creates an event from the home page", async ({ signedIn: page }) => {
	await createEvent(page, "Game night");
	await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
});

test("create button stays disabled until the event has a name", async ({ page }) => {
	await page.goto("/");
	const button = page.getByRole("button", { name: "Create event", exact: true });
	await expect(button).toBeDisabled();
	await page.getByPlaceholder(/Team meeting/).fill("Coffee");
	await expect(button).toBeEnabled();
});

test("signed-out visitor is asked to sign in before the event is created", async ({ page }) => {
	await page.goto("/create?name=Coffee");
	await page.locator("button:has(svg.lucide-chevron-right)").first().click();
	await page.locator("[data-date]").nth(10).click();
	await page.getByRole("button", { name: "Create Event" }).click();

	await expect(page.getByRole("dialog")).toContainText("Sign in to create event");
	await expect(page).toHaveURL(/\/create/);
});

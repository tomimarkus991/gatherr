import {
	createEvent,
	expect,
	signInFromUserMenu,
	signOutFromUserMenu,
	stubGoogleSignIn,
	test,
	chooseGoogleAccount,
} from "./fixtures";

// The signed-in mock user (ME) is a member of "Oliver's picnic"; signed out, the home page shows the hero.
const myEvent = (page: import("@playwright/test").Page) =>
	page.getByRole("link", { name: /Oliver's picnic/ });

test.beforeEach(async ({ page }) => {
	await stubGoogleSignIn(page);
});

test("signing in on the home page shows my events without a reload (#134)", async ({ page }) => {
	await page.goto("/");
	await signInFromUserMenu(page);

	await expect(myEvent(page)).toBeVisible();
});

test("signing out and in again shows my events without a reload (#134)", async ({ page }) => {
	await page.goto("/");
	await signInFromUserMenu(page);
	await expect(myEvent(page)).toBeVisible();

	await signOutFromUserMenu(page);
	await expect(page.getByText("Plan any gathering")).toBeVisible();

	await signInFromUserMenu(page);
	await expect(myEvent(page)).toBeVisible();
});

test("after switching accounts the Yours grid shows none of the previous account's times (#124)", async ({
	signedIn: page,
}) => {
	// Signed in as ME (user 1) by token; the switch below goes through the Google sign-in button.
	await createEvent(page, "Account switch");

	await page.getByRole("tab", { name: "Your availability" }).click();
	const slots = page.locator("[data-slot]");
	await slots.nth(0).click();
	await slots.nth(1).click();
	const checkedSlots = page.locator("[data-slot] svg.lucide-check");
	await expect(checkedSlots).toHaveCount(2);
	await page.getByRole("button", { name: "Save" }).click();
	await expect(page.getByText("2 time slots")).toBeVisible();

	await signOutFromUserMenu(page);
	await chooseGoogleAccount(page, 2);
	await signInFromUserMenu(page);

	await page.getByRole("tab", { name: "Your availability" }).click();
	await expect(slots.first()).toBeEnabled();
	await expect(checkedSlots).toHaveCount(0);
});

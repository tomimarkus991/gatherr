import { expect, test } from "./fixtures";

// The backend redirects here after Google: /calendar-connect?success=true or ?error=...
test.describe("calendar connect return page", () => {
	test("success shows the connected message and goes back to the event page", async ({
		signedIn: page,
	}) => {
		await page.addInitScript(() =>
			sessionStorage.setItem("calendarConnectReturnTo", "/e/happy-blue-fox-123456"),
		);
		await page.goto("/calendar-connect?success=true");

		await expect(page.getByText("Google Calendar connected!")).toBeVisible();
		await expect(page).toHaveURL(/\/e\/happy-blue-fox-123456$/, { timeout: 5000 });
	});

	test("access_denied shows the declined message and falls back to home", async ({ page }) => {
		await page.goto("/calendar-connect?error=access_denied");

		await expect(page.getByText("You declined calendar access.", { exact: false })).toBeVisible();
		await expect(page).toHaveURL(/\/$/, { timeout: 5000 });
	});
});

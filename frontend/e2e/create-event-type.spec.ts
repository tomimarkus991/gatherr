import { expect, test } from "./fixtures";

const tabs = [
	{ tab: "Dates", type: "SPECIFIC_DATES", pick: "date" },
	{ tab: "Dates + times", type: "SPECIFIC_DATES_AND_TIMES", pick: "date" },
	{ tab: "Weekdays", type: "WEEKDAYS", pick: "weekday" },
	{ tab: "Weekdays + times", type: "WEEKDAYS_AND_TIMES", pick: "weekday" },
] as const;

for (const { tab, type, pick } of tabs) {
	test(`the "${tab}" tab creates a ${type} event`, async ({ signedIn: page }) => {
		await page.goto("/create?name=Type%20test");
		await page.getByRole("tab", { name: tab, exact: true }).click();
		await expect(page.getByRole("tab", { name: tab, exact: true })).toHaveAttribute(
			"aria-selected",
			"true",
		);

		const hasTimes = type.endsWith("_AND_TIMES");
		await expect(page.getByText("Pick a time range")).toBeVisible({ visible: hasTimes });

		if (pick === "date") {
			await page.locator("button:has(svg.lucide-chevron-right)").first().click();
			await page.locator("[data-date]").nth(10).click();
		} else {
			await page.getByRole("button", { name: "Mon", exact: true }).click();
		}

		const request = page.waitForRequest(
			req => req.method() === "POST" && req.url().endsWith("/api/v1/events"),
		);
		await page.getByRole("button", { name: "Create Event" }).click();
		expect((await request).postDataJSON().type).toBe(type);
	});
}

test("an old draft's event type selects the matching tab", async ({ page }) => {
	await page.addInitScript(() =>
		localStorage.setItem(
			"gatherr:create-event-draft",
			JSON.stringify({
				eventType: "WEEKDAYS",
				calendarSelectedDates: [],
				selectedDays: ["MON"],
				startTime: 8,
				endTime: 17,
				timeIncrement: 30,
				timezone: "Europe/Tallinn",
			}),
		),
	);
	await page.goto("/create?name=Draft");
	await expect(page.getByRole("tab", { name: "Weekdays", exact: true })).toHaveAttribute(
		"aria-selected",
		"true",
	);
});

test("the advanced section has no time ranges button", async ({ page }) => {
	await page.goto("/create?name=Advanced");
	await page.getByRole("heading", { name: "Advanced" }).click();
	await expect(page.getByText("Time increment:")).toBeVisible();
	await expect(page.getByRole("button", { name: /time ranges/ })).toHaveCount(0);
});

test("type tabs fit at phone width without horizontal scroll", async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 800 });
	await page.goto("/create?name=Phone");
	await expect(page.getByRole("tab", { name: "Weekdays + times", exact: true })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

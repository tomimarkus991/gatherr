import { expect, test } from "./fixtures";

/** Trip events (#148): vote on whole date ranges. */

test("organiser creates a trip, answers it, sees the best range and confirms it", async ({
	signedIn: page,
}) => {
	await page.goto("/create?name=Rome%20trip");
	await page.getByRole("tab", { name: "Trip", exact: true }).click();
	const picker = page.getByTestId("trip-range-picker");
	await expect(picker.getByText("Pick a start day, then an end day")).toBeVisible();

	// Next month: every day is in the future. Start day, then end day; the same day twice is one day.
	await page.locator("button:has(svg.lucide-chevron-right)").first().click();
	const days = page.locator("[data-date]");
	await days.nth(8).click();
	await expect(picker.getByText("Now pick the end day")).toBeVisible();
	await days.nth(10).click();
	await days.nth(15).click();
	await days.nth(19).click();
	await days.nth(22).click();
	await days.nth(22).click();

	const options = picker.locator("li[data-range]");
	await expect(options).toHaveCount(3);
	await expect(options.nth(0)).toContainText("3 days");
	await expect(options.nth(1)).toContainText("5 days");
	await expect(options.nth(2)).toContainText("1 day");
	await options.nth(0).getByPlaceholder("Label (optional)").fill("Rome, Ryanair €89");

	// A link that is not http(s) blocks creating until it is fixed.
	const link = options.nth(0).getByPlaceholder("Link (optional)");
	await link.fill("ryanair.com");
	await expect(picker.getByText("Use a link that starts with http:// or https://")).toBeVisible();
	await expect(page.getByRole("button", { name: "Create Event" })).toBeDisabled();
	await link.fill("https://www.ryanair.com");

	const create = page.waitForRequest(
		req => req.method() === "POST" && req.url().endsWith("/api/v1/events"),
	);
	await page.getByRole("button", { name: "Create Event" }).click();
	const body = (await create).postDataJSON();
	expect(body.type).toBe("DATE_RANGES");
	expect(body.times).toHaveLength(3);
	for (const key of body.times) expect(key).toMatch(/^\d{8}-\d{8}$/);
	expect(body.rangeDetails).toEqual({
		[body.times[0]]: { label: "Rome, Ryanair €89", link: "https://www.ryanair.com" },
	});
	const [first, second, third] = body.times as string[];

	await expect(page.getByRole("dialog", { name: "Share this event with your friends" })).toBeVisible();
	await page.keyboard.press("Escape");

	const answers = page.getByTestId("trip-answers");
	await expect(answers.locator("li[data-range]")).toHaveCount(3);
	await expect(answers.locator(`li[data-range="${first}"]`)).toContainText("Rome, Ryanair €89");
	await expect(
		answers.locator(`li[data-range="${first}"]`).getByRole("link", { name: "Open link" }),
	).toHaveAttribute("href", "https://www.ryanair.com");

	await answers.locator(`li[data-range="${first}"]`).getByRole("button", { name: "No" }).click();
	await answers.locator(`li[data-range="${second}"]`).getByRole("button", { name: "Yes" }).click();
	await answers.locator(`li[data-range="${third}"]`).getByRole("button", { name: "No" }).click();
	const respond = page.waitForRequest(
		req => req.method() === "PUT" && req.url().endsWith("/respond"),
	);
	await answers.getByRole("button", { name: "Save" }).click();
	const saved = (await respond).postDataJSON();
	expect(saved.available).toEqual([second]);
	expect(saved.notAvailable.sort()).toEqual([first, third].sort());

	const results = page.getByTestId("trip-results");
	const best = results.locator("li[data-best]");
	await expect(best).toHaveCount(1);
	await expect(best).toHaveAttribute("data-range", second);
	await expect(best).toContainText("1 / 1 yes");
	await expect(best).toContainText("Best");

	await best.getByRole("button", { name: /^Confirm / }).click();
	await expect(page.getByText("Final time confirmed.", { exact: false })).toBeVisible();
	const banner = page.getByTestId("confirmed-time");
	await expect(banner).toContainText(" – ");
	await expect(banner).toContainText("all day");
});

test("a participant answers a trip and the results move", async ({ signedIn: page }) => {
	await page.goto("/e/olivers-trip");
	await expect(page.getByText("Oliver's Rome trip", { exact: true })).toBeVisible();

	const results = page.getByTestId("trip-results");
	const dec14 = results.locator('li[data-range="14122026-18122026"]');
	await expect(dec14).toHaveAttribute("data-best", "true");
	await expect(dec14).toContainText("Mon 14 – Fri 18 Dec");
	await expect(dec14).toContainText("2 / 2 yes");
	// Not the organiser: no confirm action.
	await expect(results.getByRole("button", { name: /^Confirm / })).toHaveCount(0);

	const answers = page.getByTestId("trip-answers");
	await expect(answers.locator('li[data-range="01122026-03122026"]')).toContainText(
		"Rome, Ryanair €89",
	);
	await answers
		.locator('li[data-range="01122026-03122026"]')
		.getByRole("button", { name: "Yes" })
		.click();
	await answers
		.locator('li[data-range="23122026-26122026"]')
		.getByRole("button", { name: "No" })
		.click();
	await answers.getByRole("button", { name: "Save" }).click();

	await expect(dec14).toContainText("2 / 3 yes");
	const dec1 = results.locator('li[data-range="01122026-03122026"]');
	await expect(dec1).toContainText("2 / 3 yes");
	// A tie: both ranges with the most Yes answers are best.
	await expect(results.locator("li[data-best]")).toHaveCount(2);
	await expect(results.locator('li[data-range="23122026-26122026"]')).toContainText("0 / 3 yes");
});

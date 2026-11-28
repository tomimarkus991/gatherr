import { createEvent, expect, test } from "./fixtures";

/** Mirrors TOTAL_EVENTS_OFFSET in src/components/ui/pages/home/TotalEventsCount.tsx. */
const TOTAL_EVENTS_OFFSET = 14_432;

test("signed in, the total events counter celebrates at the bottom of the home page", async ({
	signedIn: page,
}) => {
	// Mock data resets on a full page load, so create an event and go home through the app.
	await createEvent(page, "Pizza night");
	await page.getByRole("link", { name: "Gatherr" }).click();
	await expect(page.getByText("Pizza night")).toBeVisible();

	// The real count, from the same mock stats endpoint the page uses.
	const { totalEvents } = await page.evaluate(() => fetch("/api/v1/stats").then(r => r.json()));
	const expected = new Intl.NumberFormat("en-US").format(totalEvents + TOTAL_EVENTS_OFFSET);

	const counter = page.getByTestId("total-events-count");
	await expect(counter).toHaveCount(1);
	await counter.scrollIntoViewIfNeeded();
	// The decrypted (visible) layer settles on the final number.
	await expect(counter.locator("[aria-hidden]")).toHaveText(expected);
	await expect(counter).toContainText("events created so far");

	// Below the create-event card, above the footer.
	const counterBox = await counter.boundingBox();
	const createBox = await page.getByRole("button", { name: "Create event", exact: true }).boundingBox();
	const footerBox = await page.getByRole("link", { name: "Privacy policy" }).boundingBox();
	expect(counterBox && createBox && counterBox.y > createBox.y).toBe(true);
	expect(counterBox && footerBox && counterBox.y + counterBox.height <= footerBox.y).toBe(true);
});

test("signed out, the same celebrating counter sits under the create card", async ({ page }) => {
	await page.goto("/");

	const counter = page.getByTestId("total-events-count");
	await expect(counter).toHaveCount(1);
	await counter.scrollIntoViewIfNeeded();
	await expect(counter).toContainText("events created so far");
	await expect(counter.locator("p.font-number")).toBeVisible();

	const counterBox = await counter.boundingBox();
	const createBox = await page.getByRole("button", { name: "Create event", exact: true }).boundingBox();
	expect(counterBox && createBox && counterBox.y > createBox.y).toBe(true);
});

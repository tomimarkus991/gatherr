import { createEvent, expect, test } from "./fixtures";

test("share link copies the event URL when the share sheet is unavailable", async ({
	signedIn: page,
	context,
	baseURL,
}) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	// Desktop browsers without the Web Share API fall back to the clipboard; force that path.
	await page.addInitScript(() => {
		Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
	});

	await createEvent(page, "Movie night");
	await page.getByRole("button", { name: "Share link" }).click();

	await expect(page.getByText("Link copied!")).toBeVisible();
	const shortId = new URL(page.url()).pathname.split("/").pop();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${baseURL}/e/${shortId}`);
});

import { expect, test } from "./fixtures";

test("the browser tab shows the event name on the event page, and Gatherr again at home", async ({
	page,
}) => {
	await page.goto("/e/olivers-picnic");
	await expect(page).toHaveTitle("Oliver's picnic · Gatherr");

	await page.getByRole("link", { name: "Gatherr" }).click();
	await expect(page).toHaveTitle("Gatherr");
});

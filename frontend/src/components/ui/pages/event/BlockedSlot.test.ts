import { describe, expect, it } from "vitest";
import { describeBusy } from "./BlockedSlot";

describe("describeBusy", () => {
	it("joins the calendar names and shows the busy time in the given timezone", () => {
		const detail = {
			slot: "1000-13052026",
			calendars: ["Work", "Home"],
			start: "2026-05-13T07:00:00Z",
			end: "2026-05-13T08:30:00Z",
		};
		expect(describeBusy(detail, "Europe/Tallinn")).toEqual({
			calendars: "Work, Home",
			time: "10:00–11:30",
		});
		expect(describeBusy(detail, "UTC")?.time).toBe("07:00–08:30");
	});

	it("keeps a period ending at midnight on one day, and adds dates when it spans days", () => {
		const untilMidnight = {
			calendars: ["Work"],
			start: "2026-05-13T20:00:00Z",
			end: "2026-05-13T21:00:00Z",
		};
		expect(describeBusy(untilMidnight, "Europe/Tallinn")?.time).toBe("23:00–00:00");

		const overnight = {
			calendars: ["Work"],
			start: "2026-05-13T20:00:00Z",
			end: "2026-05-14T06:00:00Z",
		};
		expect(describeBusy(overnight, "Europe/Tallinn")?.time).toBe("13 May 23:00–14 May 09:00");
	});

	it("is null without a detail, a time or a calendar", () => {
		expect(describeBusy(undefined, "UTC")).toBeNull();
		expect(describeBusy({ calendars: ["Work"] }, "UTC")).toBeNull();
		expect(
			describeBusy(
				{ calendars: [], start: "2026-05-13T07:00:00Z", end: "2026-05-13T08:00:00Z" },
				"UTC",
			),
		).toBeNull();
	});
});

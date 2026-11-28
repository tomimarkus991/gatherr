import { describe, expect, it } from "vitest";
import { eventStatus, formatCreatedDate } from "./eventStatus";

describe("eventStatus", () => {
	it("is decided once a time is confirmed, even in the time round", () => {
		expect(eventStatus({ confirmedStart: "2026-12-08T17:00:00+02:00", round: "TIME" })).toBe(
			"decided",
		);
	});
	it("is picking a time in the time round", () => {
		expect(eventStatus({ round: "TIME" })).toBe("pickingTime");
	});
	it("is open otherwise", () => {
		expect(eventStatus({ round: "DATE" })).toBe("open");
		expect(eventStatus({})).toBe("open");
	});
});

describe("formatCreatedDate", () => {
	it("formats day and short month", () => {
		expect(formatCreatedDate("2026-11-12T10:00:00Z", "en")).toBe("Nov 12");
	});
	it("is null without a valid date", () => {
		expect(formatCreatedDate(undefined, "en")).toBeNull();
		expect(formatCreatedDate("nope", "en")).toBeNull();
	});
});

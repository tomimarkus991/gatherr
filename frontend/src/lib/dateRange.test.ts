import { enUS } from "date-fns/locale";
import { describe, expect, it } from "vitest";
import {
	bestRanges,
	formatRange,
	isRangeKey,
	parseRangeKey,
	rangeKey,
	rangeLength,
} from "./dateRange";

describe("range keys", () => {
	it("parses start and end, both days included", () => {
		const range = parseRangeKey("01122026-03122026");
		expect(range?.start).toEqual(new Date(2026, 11, 1));
		expect(range?.end).toEqual(new Date(2026, 11, 3));
		expect(rangeLength("01122026-03122026")).toBe(3);
		expect(rangeLength("01122026-01122026")).toBe(1);
	});
	it("rejects malformed keys and ranges ending before they start", () => {
		expect(parseRangeKey("01122026")).toBeNull();
		expect(parseRangeKey("0900-01122026")).toBeNull();
		expect(parseRangeKey("31022026-01032026")).toBeNull();
		expect(parseRangeKey("03122026-01122026")).toBeNull();
		expect(isRangeKey("0900-01122026")).toBe(false);
		expect(isRangeKey("01122026-03122026")).toBe(true);
	});
	it("orders the two picked days", () => {
		expect(rangeKey(new Date(2026, 11, 3), new Date(2026, 11, 1))).toBe("01122026-03122026");
	});
});

describe("formatRange", () => {
	it("shares the month when it can", () => {
		expect(formatRange("01122026-03122026", enUS)).toBe("Tue 1 – Thu 3 Dec");
	});
	it("names both months across a month", () => {
		expect(formatRange("30112026-02122026", enUS)).toBe("Mon 30 Nov – Wed 2 Dec");
	});
	it("shows one day for a one-day range", () => {
		expect(formatRange("01122026-01122026", enUS)).toBe("Tue 1 Dec");
	});
	it("adds the year across a year", () => {
		expect(formatRange("30122026-02012027", enUS)).toBe("Wed 30 Dec 2026 – Sat 2 Jan 2027");
	});
});

describe("bestRanges", () => {
	it("picks every range with the most Yes answers", () => {
		expect(
			bestRanges([
				{ slot: "a", count: 1 },
				{ slot: "b", count: 3 },
				{ slot: "c", count: 3 },
			]),
		).toEqual(new Set(["b", "c"]));
	});
	it("picks none when nobody said Yes", () => {
		expect(bestRanges([{ slot: "a", count: 0 }])).toEqual(new Set());
	});
});

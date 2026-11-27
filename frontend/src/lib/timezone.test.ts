import { describe, expect, it } from "vitest";
import { compareDays, convertSlot, isWeekday, joinSlot, parseSlot } from "./timezone";

// A Wednesday in summer: Tallinn is UTC+3, London is UTC+1.
const NOW = new Date("2026-06-10T12:00:00Z");

describe("parseSlot", () => {
	it("splits every event type into time and day", () => {
		expect(parseSlot("0900-31032026")).toEqual({ time: "0900", day: "31032026" });
		expect(parseSlot("0900-MON")).toEqual({ time: "0900", day: "MON" });
		expect(parseSlot("31032026")).toEqual({ time: null, day: "31032026" });
		expect(parseSlot("FRI")).toEqual({ time: null, day: "FRI" });
	});

	it("round-trips through joinSlot", () => {
		for (const slot of ["0900-31032026", "0900-MON", "31032026", "FRI"]) {
			const { time, day } = parseSlot(slot);
			expect(joinSlot(time, day)).toBe(slot);
		}
	});
});

describe("isWeekday", () => {
	it("tells weekday codes from dates", () => {
		expect(isWeekday("MON")).toBe(true);
		expect(isWeekday("31032026")).toBe(false);
	});
});

describe("convertSlot", () => {
	it("shifts date and time slots", () => {
		expect(convertSlot("0900-01062026", "Europe/Tallinn", "Europe/London", NOW)).toBe(
			"0700-01062026",
		);
	});

	it("moves a date and time slot to the previous day across midnight", () => {
		expect(convertSlot("0030-02062026", "Europe/Tallinn", "Europe/London", NOW)).toBe(
			"2230-01062026",
		);
	});

	it("shifts weekday and time slots, rolling over to the previous weekday", () => {
		expect(convertSlot("0900-MON", "Europe/Tallinn", "Europe/London", NOW)).toBe("0700-MON");
		expect(convertSlot("0030-MON", "Europe/Tallinn", "Europe/London", NOW)).toBe("2230-SUN");
	});

	it("rolls a Sunday slot forward to Monday", () => {
		expect(convertSlot("2330-SUN", "Europe/London", "Europe/Tallinn", NOW)).toBe("0130-MON");
	});

	it("leaves slots without a time unchanged", () => {
		expect(convertSlot("01062026", "Europe/Tallinn", "Europe/London", NOW)).toBe("01062026");
		expect(convertSlot("MON", "Europe/Tallinn", "Europe/London", NOW)).toBe("MON");
	});

	it("leaves slots unchanged when both timezones match", () => {
		expect(convertSlot("0030-MON", "Europe/Tallinn", "Europe/Tallinn", NOW)).toBe("0030-MON");
	});
});

describe("compareDays", () => {
	it("sorts dates chronologically", () => {
		expect(["01042026", "31032026", "15012027"].sort(compareDays)).toEqual([
			"31032026",
			"01042026",
			"15012027",
		]);
	});

	it("sorts weekdays Monday first", () => {
		expect(["SUN", "WED", "MON", "FRI"].sort(compareDays)).toEqual(["MON", "WED", "FRI", "SUN"]);
	});
});

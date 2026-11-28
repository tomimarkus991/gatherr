import { describe, expect, it } from "vitest";
import { timeIncrementSlots } from "./timeIncrementExample";

describe("timeIncrementSlots", () => {
	it("lists the first slots for 15, 30 and 60 minutes", () => {
		expect(
			timeIncrementSlots({ startHour: 18, endHour: 23, increment: 15, timeFormat24: true }),
		).toBe("18:00, 18:15, 18:30, …");
		expect(
			timeIncrementSlots({ startHour: 18, endHour: 23, increment: 30, timeFormat24: true }),
		).toBe("18:00, 18:30, 19:00, …");
		expect(
			timeIncrementSlots({ startHour: 18, endHour: 23, increment: 60, timeFormat24: true }),
		).toBe("18:00, 19:00, 20:00, …");
	});

	it("shows fewer slots when the start time is near the end of the range", () => {
		expect(
			timeIncrementSlots({ startHour: 22, endHour: 23, increment: 60, timeFormat24: true }),
		).toBe("22:00, 23:00");
		expect(
			timeIncrementSlots({ startHour: 23, endHour: 23, increment: 30, timeFormat24: true }),
		).toBe("23:00");
	});

	it("uses the 12-hour clock when asked", () => {
		expect(
			timeIncrementSlots({ startHour: 18, endHour: 23, increment: 30, timeFormat24: false }),
		).toBe("6:00 PM, 6:30 PM, 7:00 PM, …");
	});
});

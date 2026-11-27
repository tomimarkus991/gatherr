import { addDays, format, startOfWeek } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Event slots, by event type:
 *
 * SPECIFIC_DATES_AND_TIMES → "HHmm-ddMMyyyy"  "0900-31032026"
 * SPECIFIC_DATES           → "ddMMyyyy"       "31032026"
 * WEEKDAYS_AND_TIMES       → "HHmm-DDD"       "0900-MON"
 * WEEKDAYS                 → "DDD"            "MON"
 *
 * "day" below is the date or weekday part, "time" the optional HHmm part.
 */
export const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

const TIME_REGEX = /^\d{4}$/;
const DATE_REGEX = /^\d{8}$/;

export const isWeekday = (day: string) => (WEEKDAYS as readonly string[]).includes(day);

export function parseSlot(slot: string): { time: string | null; day: string } {
	const [first, second] = slot.split("-");
	if (second !== undefined && TIME_REGEX.test(first)) return { time: first, day: second };
	return { time: null, day: slot };
}

export const joinSlot = (time: string | null, day: string) => (time ? `${time}-${day}` : day);

/** Calendar date (yyyy-MM-dd) a day stands for; weekdays map onto the week containing `now`. */
function referenceDate(day: string, now: Date): string | null {
	if (DATE_REGEX.test(day)) return `${day.slice(4, 8)}-${day.slice(2, 4)}-${day.slice(0, 2)}`;
	const index = WEEKDAYS.indexOf(day as (typeof WEEKDAYS)[number]);
	if (index === -1) return null;
	const date = addDays(startOfWeek(now, { weekStartsOn: 1 }), index);
	return format(date, "yyyy-MM-dd");
}

/**
 * Converts a slot from one timezone to another. Slots without a time are all-day and stay as they are.
 * Weekday slots are converted through the current week, so a slot can move to the neighbouring weekday.
 */
export function convertSlot(slot: string, fromTz: string, toTz: string, now = new Date()): string {
	const { time, day } = parseSlot(slot);
	if (fromTz === toTz || !time) return slot;
	const date = referenceDate(day, now);
	if (!date) return slot;

	const instant = fromZonedTime(`${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:00`, fromTz);
	const convertedTime = formatInTimeZone(instant, toTz, "HHmm");
	const convertedDay = isWeekday(day)
		? WEEKDAYS[(Number(formatInTimeZone(instant, toTz, "i")) + 6) % 7]
		: formatInTimeZone(instant, toTz, "ddMMyyyy");
	return joinSlot(convertedTime, convertedDay);
}

/** Sort order for days: dates chronologically, weekdays Monday first. */
export function compareDays(a: string, b: string): number {
	if (isWeekday(a) && isWeekday(b)) {
		return (
			WEEKDAYS.indexOf(a as (typeof WEEKDAYS)[number]) -
			WEEKDAYS.indexOf(b as (typeof WEEKDAYS)[number])
		);
	}
	const sortable = (d: string) => d.slice(4, 8) + d.slice(2, 4) + d.slice(0, 2);
	return sortable(a).localeCompare(sortable(b));
}

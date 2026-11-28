import { differenceInCalendarDays, format, isSameDay, isSameMonth, isSameYear } from "date-fns";
import type { Locale } from "date-fns/locale";

/**
 * Trip events (DATE_RANGES, issue #148): each slot is a date range "ddMMyyyy-ddMMyyyy",
 * both days included, e.g. "01122026-03122026" for 1–3 December 2026.
 */
const RANGE_KEY = /^(\d{2})(\d{2})(\d{4})-(\d{2})(\d{2})(\d{4})$/;

export const isRangeKey = (slot: string) => RANGE_KEY.test(slot);

/** The first and last day of a range key as local dates, or null if the key is malformed. */
export function parseRangeKey(key: string): { start: Date; end: Date } | null {
	const match = RANGE_KEY.exec(key);
	if (!match) return null;
	const [, sd, sm, sy, ed, em, ey] = match.map(Number);
	const start = new Date(sy, sm - 1, sd);
	const end = new Date(ey, em - 1, ed);
	if (start.getDate() !== sd || end.getDate() !== ed || end < start) return null;
	return { start, end };
}

/** The range key for two days; the earlier one becomes the start. */
export function rangeKey(a: Date, b: Date): string {
	const [start, end] = a <= b ? [a, b] : [b, a];
	return `${format(start, "ddMMyyyy")}-${format(end, "ddMMyyyy")}`;
}

/** Days in the range, both ends included. */
export const rangeLength = (key: string) => {
	const range = parseRangeKey(key);
	return range ? differenceInCalendarDays(range.end, range.start) + 1 : 0;
};

/** "Tue 1 – Thu 3 Dec", "Mon 30 Nov – Wed 2 Dec", "Tue 1 Dec"; the year only when the range crosses one. */
export function formatRange(key: string, locale?: Locale): string {
	const range = parseRangeKey(key);
	if (!range) return key;
	const { start, end } = range;
	const options = { locale };
	if (isSameDay(start, end)) return format(start, "EEE d MMM", options);
	if (!isSameYear(start, end)) {
		return `${format(start, "EEE d MMM yyyy", options)} – ${format(end, "EEE d MMM yyyy", options)}`;
	}
	if (isSameMonth(start, end)) {
		return `${format(start, "EEE d", options)} – ${format(end, "EEE d MMM", options)}`;
	}
	return `${format(start, "EEE d MMM", options)} – ${format(end, "EEE d MMM", options)}`;
}

/** The ranges with the most Yes answers; none when nobody said Yes to anything. */
export function bestRanges(slots: { slot?: string; count?: number }[]): Set<string> {
	const max = Math.max(0, ...slots.map(slot => slot.count ?? 0));
	if (max === 0) return new Set();
	return new Set(
		slots.filter(slot => slot.slot && (slot.count ?? 0) === max).map(slot => slot.slot as string),
	);
}

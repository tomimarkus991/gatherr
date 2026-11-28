import { addMinutes, format, setHours, startOfDay } from "date-fns";

const SHOWN_SLOTS = 3;

interface Props {
	startHour: number;
	endHour: number;
	increment: number;
	timeFormat24: boolean;
}

/** The first slots from startHour to endHour, e.g. "18:00, 18:30, 19:00, …". */
export function timeIncrementSlots({ startHour, endHour, increment, timeFormat24 }: Props) {
	const start = setHours(startOfDay(new Date()), startHour);
	const slotCount = Math.floor(((endHour - startHour) * 60) / increment) + 1;
	const slots = Array.from({ length: Math.min(slotCount, SHOWN_SLOTS) }, (_, i) =>
		format(addMinutes(start, i * increment), timeFormat24 ? "HH:mm" : "h:mm a"),
	);
	return slotCount > SHOWN_SLOTS ? `${slots.join(", ")}, …` : slots.join(", ");
}

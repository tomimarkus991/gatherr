import { formatInTimeZone } from "date-fns-tz";
import { CalendarCheckIcon } from "lucide-react";
import { m } from "../../../../paraglide/messages";
import { dateFnsLocale } from "../create/calendar/Calendar";

interface Props {
	confirmedStart: string;
	confirmedEnd: string;
	eventTimezone: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The final time the organiser confirmed, shown to everyone in the event timezone. */
export const ConfirmedTime = ({ confirmedStart, confirmedEnd, eventTimezone }: Props) => {
	const start = new Date(confirmedStart);
	const end = new Date(confirmedEnd);
	const options = { locale: dateFnsLocale };
	const allDay =
		end.getTime() - start.getTime() >= DAY_MS &&
		formatInTimeZone(start, eventTimezone, "HH:mm") === "00:00";
	// A confirmed trip range spans several days: show its first and last day.
	const lastDay = formatInTimeZone(
		new Date(end.getTime() - 1),
		eventTimezone,
		"EEEE d MMMM",
		options,
	);
	const firstDay = formatInTimeZone(start, eventTimezone, "EEEE d MMMM", options);
	const day = allDay && lastDay !== firstDay ? `${firstDay} – ${lastDay}` : firstDay;
	const time = allDay
		? m.event_confirmed_all_day()
		: `${formatInTimeZone(start, eventTimezone, "HH:mm")}–${formatInTimeZone(end, eventTimezone, "HH:mm")}`;
	const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

	return (
		<div
			data-testid="confirmed-time"
			className="flex flex-row items-start gap-3 p-4 mb-3 rounded-xl bg-canvas border-2 border-primary"
		>
			<CalendarCheckIcon className="size-6 shrink-0 text-primary" />
			<div>
				<p className="text-sm text-info">{m.event_confirmed_title()}</p>
				<p className="text-lg font-semibold">
					{day}, {time}
				</p>
				{userTz !== eventTimezone && <p className="text-xs text-info">{eventTimezone}</p>}
			</div>
		</div>
	);
};

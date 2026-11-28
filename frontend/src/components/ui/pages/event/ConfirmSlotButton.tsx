import { isAxiosError } from "axios";
import { format } from "date-fns";
import { CalendarCheckIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirmEvent } from "../../../../hooks/mutation/useConfirmEvent";
import { formatRange, isRangeKey } from "../../../../lib/dateRange";
import { parseSlot, WEEKDAYS } from "../../../../lib/timezone";
import { m } from "../../../../paraglide/messages";
import { Button } from "../../button";
import { dateFnsLocale } from "../create/calendar/Calendar";

interface Props {
	shortId: string;
	/** The event slot key (in the event timezone), e.g. "1900-13052026". */
	slot: string;
	eventTimezone: string;
	onConfirmed: () => void;
}

/**
 * A slot key as readable text in the event timezone: "19:00, Wed 13 May", "Mon", "Wed 13 May",
 * or for a trip range "Tue 1 – Thu 3 Dec".
 */
export function readableSlot(slot: string): string {
	if (isRangeKey(slot)) return formatRange(slot, dateFnsLocale);
	const { time, day } = parseSlot(slot);
	const weekday = WEEKDAYS.indexOf(day as (typeof WEEKDAYS)[number]);
	const dayText =
		weekday >= 0
			? // 1 Jan 2024 was a Monday, so WEEKDAYS index i is that date plus i days.
				format(new Date(2024, 0, 1 + weekday), "EEEE", { locale: dateFnsLocale })
			: format(
					new Date(Number(day.slice(4, 8)), Number(day.slice(2, 4)) - 1, Number(day.slice(0, 2))),
					"EEE d MMM",
					{ locale: dateFnsLocale },
				);
	return time ? `${time.slice(0, 2)}:${time.slice(2, 4)}, ${dayText}` : dayText;
}

/** The organiser's "Confirm this time" action in a group heatmap slot. */
export const ConfirmSlotButton = ({ shortId, slot, eventTimezone, onConfirmed }: Props) => {
	const { mutate: confirm, isPending } = useConfirmEvent();
	const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const when = readableSlot(slot) + (userTz === eventTimezone ? "" : ` (${eventTimezone})`);

	const handleClick = () =>
		confirm(
			{ shortId, slot },
			{
				onSuccess: () => {
					toast.success(m.event_confirm_success());
					onConfirmed();
				},
				onError: error => {
					const status = isAxiosError(error) ? error.response?.status : undefined;
					toast.error(status === 403 ? m.event_confirm_forbidden() : m.event_confirm_failed());
				},
			},
		);

	return (
		<Button size="xs" className="mt-4 w-full" disabled={isPending} onClick={handleClick}>
			<CalendarCheckIcon className="size-4 mr-2 shrink-0" />
			{m.event_confirm_button({ when })}
		</Button>
	);
};

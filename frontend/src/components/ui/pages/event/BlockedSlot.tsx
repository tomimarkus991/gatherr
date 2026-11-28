import { formatInTimeZone } from "date-fns-tz";
import type { ReactNode } from "react";
import { m } from "../../../../paraglide/messages";
import { Button } from "../../button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../dialog";
import { Popover, PopoverAnchor, PopoverContent } from "../../popover";
import { dateFnsLocale } from "../create/calendar/Calendar";
import type { BusySlotDetail } from "./CalendarImport";

/**
 * Why a slot is blocked, for the tooltip and the confirm dialog: the busy calendars ("Work, Home")
 * and the busy time in `timeZone` ("10:00–11:00"; with dates when it spans midnight).
 * Null when the import sent no detail for the slot.
 */
export function describeBusy(
	detail: BusySlotDetail | undefined,
	timeZone: string,
): { calendars: string; time: string } | null {
	if (!detail?.start || !detail.end || !detail.calendars?.length) return null;
	const start = new Date(detail.start);
	const end = new Date(detail.end);
	// An end at midnight still belongs to the start's day.
	const sameDay =
		formatInTimeZone(start, timeZone, "yyyy-MM-dd") ===
		formatInTimeZone(new Date(end.getTime() - 1), timeZone, "yyyy-MM-dd");
	const pattern = sameDay ? "HH:mm" : "d MMM HH:mm";
	const format = (date: Date) =>
		formatInTimeZone(date, timeZone, pattern, { locale: dateFnsLocale });
	return { calendars: detail.calendars.join(", "), time: `${format(start)}–${format(end)}` };
}

interface TooltipProps {
	open: boolean;
	detail: BusySlotDetail | undefined;
	timeZone: string;
	children: ReactNode;
}

/** A hover tooltip on a blocked cell: "Busy in Work · 10:00–11:00". The cell is the child. */
export const BlockedSlotTooltip = ({ open, detail, timeZone, children }: TooltipProps) => {
	const busy = describeBusy(detail, timeZone);
	return (
		<Popover open={open}>
			<PopoverAnchor asChild>{children}</PopoverAnchor>
			<PopoverContent
				role="tooltip"
				side="top"
				className="pointer-events-none w-auto px-3 py-1.5 text-sm whitespace-nowrap"
				onOpenAutoFocus={e => e.preventDefault()}
				onCloseAutoFocus={e => e.preventDefault()}
			>
				{busy ? m.blocked_slot_tooltip(busy) : m.blocked_slot_busy()}
			</PopoverContent>
		</Popover>
	);
};

interface DialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	detail: BusySlotDetail | undefined;
	timeZone: string;
	onConfirm: () => void;
}

/** Asks before a tap marks a blocked (busy) cell as available. Cancelling keeps it blocked. */
export const BlockedSlotDialog = ({
	open,
	onOpenChange,
	detail,
	timeZone,
	onConfirm,
}: DialogProps) => {
	const busy = describeBusy(detail, timeZone);
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[calc(100%-2rem)] max-w-md">
				<DialogHeader>
					<DialogTitle className="font-medium text-2xl">{m.blocked_slot_busy()}</DialogTitle>
				</DialogHeader>
				<DialogDescription className="text-center">
					{busy ? m.blocked_slot_confirm_text(busy) : m.blocked_slot_confirm_text_unknown()}
				</DialogDescription>
				<div className="flex flex-row gap-2 justify-center">
					<Button size="sm" className="px-4" onClick={onConfirm}>
						{m.blocked_slot_confirm_yes()}
					</Button>
					<Button size="sm" variant="red" onClick={() => onOpenChange(false)}>
						{m.blocked_slot_confirm_no()}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

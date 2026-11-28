import { CalendarDaysIcon, Loader2Icon, PlugZapIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useGetBusySlots } from "../../../../hooks/mutation/useGetBusySlots";
import { useRevokeCalendarAccess } from "../../../../hooks/mutation/useRevokeCalendarAccess";
import { useListCalendars } from "../../../../hooks/query/useListCalendars";
import { GatherrApiClient } from "../../../../lib/axios";
import { rememberCalendarConnectReturn } from "../../../../lib/calendarConnectReturn";
import { Button } from "../../button";

interface Props {
	shortId: string;
	/** Called with the busy slot strings once the user confirms their selection. */
	onBusySlotsLoaded: (slots: string[]) => void;
}

type Step = "idle" | "picking" | "loading";

export const CalendarImport = ({ shortId, onBusySlotsLoaded }: Props) => {
	const [step, setStep] = useState<Step>("idle");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	// Only fetch calendar list once the user has clicked "Import" (and is connected)
	const {
		data: calendarList,
		isLoading: calendarsLoading,
		isError: notConnected,
	} = useListCalendars(step === "picking");

	const { mutate: getBusySlots, isPending: busyLoading } = useGetBusySlots();
	const { mutate: revokeAccess, isPending: revoking } = useRevokeCalendarAccess();

	const handleConnectClick = async () => {
		// A full-page navigation can't carry the bearer token, so fetch the consent URL first
		// (it embeds a signed state naming the user), then send the browser to Google.
		const { data } = await GatherrApiClient.get<{ url: string }>("/auth/google/calendar/url");
		rememberCalendarConnectReturn(window.location.pathname);
		window.location.href = data.url;
	};

	const handleImportClick = () => {
		setStep("picking");
		setSelectedIds(new Set());
	};

	const toggleCalendar = (id: string) => {
		setSelectedIds(prev => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	};

	const handleConfirm = () => {
		if (selectedIds.size === 0) return;
		setStep("loading");
		getBusySlots(
			{ shortId, calendarIds: [...selectedIds] },
			{
				onSuccess: ({ busySlots }) => {
					onBusySlotsLoaded(busySlots ?? []);
					setStep("idle");
				},
				onError: () => setStep("picking"),
			},
		);
	};

	// After OAuth redirect back, the calendar list will load.
	// If the user is not connected yet, notConnected will be true (403).
	const isConnected = !notConnected && calendarList !== undefined;

	if (step === "idle") {
		return (
			<Button size="sm" className="flex items-center gap-2" onClick={handleImportClick}>
				<CalendarDaysIcon className="size-4" />
				Import from Google Calendar
			</Button>
		);
	}

	if (step === "picking" && calendarsLoading) {
		return (
			<div className="flex items-center gap-2 text-sm text-info">
				<Loader2Icon className="size-4 animate-spin" />
				Loading your calendars...
			</div>
		);
	}

	if (step === "picking" && notConnected) {
		return (
			<div className="flex flex-col gap-3 p-4 bg-canvas rounded-xl">
				<p className="text-sm">Connect your Google Calendar to import busy times.</p>
				<Button size="sm" className="flex items-center gap-2" onClick={handleConnectClick}>
					<PlugZapIcon className="size-4" />
					Connect Google Calendar
				</Button>
				<button
					type="button"
					className="text-xs text-info underline"
					onClick={() => setStep("idle")}
				>
					Cancel
				</button>
			</div>
		);
	}

	if (step === "picking" && isConnected) {
		const calendars = calendarList?.calendars ?? [];
		const allIds = calendars.map(cal => cal.id ?? "").filter(Boolean);
		const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
		return (
			<div className="flex flex-col gap-3 p-4 bg-canvas rounded-xl">
				<div className="flex items-center justify-between gap-2">
					<p className="text-sm font-semibold">Select calendars to import from:</p>
					{allIds.length > 1 && (
						<button
							type="button"
							className="text-xs text-info underline cursor-pointer shrink-0"
							onClick={() => setSelectedIds(allSelected ? new Set() : new Set(allIds))}
						>
							{allSelected ? "Deselect all" : "Select all"}
						</button>
					)}
				</div>

				{calendars.length === 0 ? (
					<p className="text-sm text-info">No calendars found in your Google account.</p>
				) : (
					<ul className="flex flex-col gap-2">
						{calendars.map(cal => (
							<li key={cal.id}>
								<label className="flex items-center gap-2 cursor-pointer text-sm">
									<input
										type="checkbox"
										className="accent-primary"
										checked={selectedIds.has(cal.id ?? "")}
										onChange={() => toggleCalendar(cal.id ?? "")}
									/>
									{cal.summary ?? cal.id}
								</label>
							</li>
						))}
					</ul>
				)}

				<div className="flex gap-2 mt-1">
					<Button size="sm" disabled={selectedIds.size === 0} onClick={handleConfirm}>
						Import busy times
					</Button>
					<Button size="sm" onClick={() => setStep("idle")}>
						Cancel
					</Button>
				</div>

				<button
					type="button"
					className="flex items-center gap-1 text-xs text-red-400 mt-1 cursor-pointer"
					onClick={() => revokeAccess()}
					disabled={revoking}
				>
					<Trash2Icon className="size-3" />
					Disconnect Google Calendar
				</button>
			</div>
		);
	}

	if (step === "loading" || busyLoading) {
		return (
			<div className="flex items-center gap-2 text-sm text-info">
				<Loader2Icon className="size-4 animate-spin" />
				Fetching busy times...
			</div>
		);
	}

	return null;
};

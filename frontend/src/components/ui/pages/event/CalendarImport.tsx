import { CalendarIcon, Loader2Icon, PlugZapIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import type { components } from "../../../../api/types.gen";
import { useGetBusySlots } from "../../../../hooks/mutation/useGetBusySlots";
import { useRevokeCalendarAccess } from "../../../../hooks/mutation/useRevokeCalendarAccess";
import { useListCalendars } from "../../../../hooks/query/useListCalendars";
import { GatherrApiClient } from "../../../../lib/axios";
import { rememberCalendarConnectReturn } from "../../../../lib/calendarConnectReturn";
import { m } from "../../../../paraglide/messages";
import { GoogleIcon } from "../../../icons/GoogleIcon";
import { Button } from "../../button";

export type BusySlotDetail = components["schemas"]["BusySlotDetailDto"];

interface Props {
	shortId: string;
	/**
	 * Called once the user confirms their selection, with the busy slot strings and, per busy slot,
	 * which calendars are busy and when (empty from a backend that doesn't send details).
	 */
	onBusySlotsLoaded: (slots: string[], details: BusySlotDetail[]) => void;
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
				onSuccess: ({ busySlots, busyDetails }) => {
					onBusySlotsLoaded(busySlots ?? [], busyDetails ?? []);
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
			<div className="mb-8">
				<Button size="sm" variant="orange" className="gap-2" onClick={handleImportClick}>
					<GoogleIcon className="size-4" />
					{m.calendar_import_button()}
				</Button>
			</div>
		);
	}

	if (step === "picking" && calendarsLoading) {
		return (
			<div className="flex items-center gap-2 text-sm text-info mb-8">
				<Loader2Icon className="size-4 animate-spin" />
				{m.calendar_import_loading_calendars()}
			</div>
		);
	}

	if (step === "picking" && notConnected) {
		return (
			<div className="flex flex-col gap-3 p-4 bg-canvas rounded-xl mb-8">
				<p className="text-sm">{m.calendar_import_connect_text()}</p>
				<Button size="sm" className="flex items-center gap-2" onClick={handleConnectClick}>
					<PlugZapIcon className="size-4" />
					{m.calendar_import_connect_button()}
				</Button>
				<button
					type="button"
					className="text-xs text-info underline"
					onClick={() => setStep("idle")}
				>
					{m.calendar_import_cancel()}
				</button>
			</div>
		);
	}

	if (step === "picking" && isConnected) {
		const calendars = calendarList?.calendars ?? [];
		const allIds = calendars.map(cal => cal.id ?? "").filter(Boolean);
		const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
		return (
			<div className="bg-canvas rounded-2xl p-4 space-y-4 mx-4 mb-8 flex flex-col justify-center">
				<div className="flex items-center gap-2 mb-4">
					<GoogleIcon className="size-6 shrink-0" />
					<p className="font-semibold text-xl">{m.calendar_import_picker_title()}</p>
				</div>
				<p className="text-xs text-info">{m.calendar_import_busy_hint()}</p>

				{allIds.length > 1 && (
					<button
						type="button"
						className="self-start text-xs text-info underline cursor-pointer"
						onClick={() => setSelectedIds(allSelected ? new Set() : new Set(allIds))}
					>
						{allSelected ? m.calendar_import_deselect_all() : m.calendar_import_select_all()}
					</button>
				)}

				{calendars.length === 0 ? (
					<p className="text-sm text-info">{m.calendar_import_no_calendars()}</p>
				) : (
					<ul className="space-y-3">
						{calendars.map(cal => {
							const checked = selectedIds.has(cal.id ?? "");
							return (
								<li key={cal.id}>
									<label className="flex items-center gap-3 cursor-pointer select-none">
										{/* A real checkbox styled as the demo's square, so Tab and Space keep working. */}
										<span className="relative flex size-5 shrink-0">
											<input
												type="checkbox"
												className="peer size-5 appearance-none rounded border-2 border-info/40 transition-colors cursor-pointer checked:bg-primary checked:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-content"
												checked={checked}
												onChange={() => toggleCalendar(cal.id ?? "")}
											/>
											{checked && (
												<CalendarIcon className="pointer-events-none absolute inset-0 m-auto size-3 text-white" />
											)}
										</span>
										<span className="text-sm">{cal.summary ?? cal.id}</span>
									</label>
								</li>
							);
						})}
					</ul>
				)}

				<div className="flex gap-2 pt-1">
					<Button
						className="px-4"
						size="sm"
						disabled={selectedIds.size === 0}
						onClick={handleConfirm}
					>
						{m.calendar_import_import_busy()}
					</Button>
					<Button size="sm" variant="red" onClick={() => setStep("idle")}>
						{m.calendar_import_cancel()}
					</Button>
				</div>

				<button
					type="button"
					className="flex items-center gap-1 text-xs text-red-400 cursor-pointer"
					onClick={() => revokeAccess()}
					disabled={revoking}
				>
					<Trash2Icon className="size-3" />
					{m.calendar_import_disconnect()}
				</button>
			</div>
		);
	}

	if (step === "loading" || busyLoading) {
		return (
			<div className="flex items-center gap-2 text-sm text-info mb-8">
				<Loader2Icon className="size-4 animate-spin" />
				{m.calendar_import_fetching_busy()}
			</div>
		);
	}

	return null;
};

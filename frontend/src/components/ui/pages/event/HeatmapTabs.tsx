/** biome-ignore-all lint/style/noNonNullAssertion: <explanation> */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
import { addDays, format, startOfWeek } from "date-fns";
import { BanIcon, CheckIcon, PenBoxIcon, PencilIcon, XIcon } from "lucide-react";
import { motion, type Variants } from "motion/react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import type { components } from "../../../../api/types.gen";
import { useRespondToEvent } from "../../../../hooks/mutation/useRespondToEvent";
import { useGetEvent } from "../../../../hooks/query/useGetEvent";
import { useGetMe } from "../../../../hooks/query/useGetMe";
import {
	compareDays,
	convertSlot,
	isWeekday,
	joinSlot,
	parseSlot,
	WEEKDAYS,
} from "../../../../lib/timezone";
import { cn } from "../../../../lib/utils";
import { m } from "../../../../paraglide/messages";
import { getLocale } from "../../../../paraglide/runtime";
import { GradientIcon } from "../../../icons/GradientIcon";
import { Button } from "../../button";
import { Popover, PopoverContent, PopoverTrigger } from "../../popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../tabs";
import { useIsMobile } from "../../useIsMobile";
import { dateFnsLocale } from "../create/calendar/Calendar";
import { CalendarImport } from "./CalendarImport";

interface TwoElementMovingBoxProps {
	selectedIndex: number;
	duration?: number;
}

const TwoElementMovingBox = ({ selectedIndex, duration = 0.4 }: TwoElementMovingBoxProps) => {
	const whiteMovingBox: Variants = {
		active: {
			left: "0%",
			transition: { ease: "easeOut", duration },
		},
		inactive: {
			left: "50%",
			transition: { ease: "easeOut", duration },
		},
	};
	return (
		<motion.div
			variants={whiteMovingBox}
			animate={selectedIndex === 0 ? "active" : "inactive"}
			className="bg-primary absolute inset-0 w-[50%] rounded-2xl shadow-lg/60 shadow-amber-900 pointer-events-none"
		/>
	);
};

/** A Date to format a day header with: the date itself, or that weekday in the current week. */
const dayToDate = (day: string) =>
	isWeekday(day)
		? addDays(
				startOfWeek(new Date(), { weekStartsOn: 1 }),
				WEEKDAYS.indexOf(day as (typeof WEEKDAYS)[number]),
			)
		: new Date(
				Number.parseInt(day.slice(4, 8), 10),
				Number.parseInt(day.slice(2, 4), 10) - 1,
				Number.parseInt(day.slice(0, 2), 10),
			);

const capitalize = (text: string, length: number) =>
	text.charAt(0).toUpperCase() + text.slice(1, length).toLowerCase();

const DayLabel = ({ day, small }: { day: string; small?: boolean }) => {
	const date = dayToDate(day);
	return (
		<p className="text-nowrap text-center">
			<span className={cn("font-semibold", small && "text-md")}>
				{capitalize(format(date, "EEE", { locale: dateFnsLocale }), 3)}
			</span>
			{!isWeekday(day) && (
				<>
					<br />
					<span className={cn("text-[#BABABA]", small && "text-xs")}>
						{`${capitalize(
							format(date, "MMM", { locale: dateFnsLocale }),
							getLocale() === "et" ? 4 : 3,
						)} ${format(date, "d")}`}
					</span>
				</>
			)}
		</p>
	);
};

const formatTime = (time: string) => `${time.slice(0, 2)}:${time.slice(2, 4)}`;

/** What a calendar import did: removed selected slots, found busy slots none of which were selected, or nothing. */
const importResultMessage = (busy: number, removed: number) => {
	if (removed > 0) return m.calendar_import_result_removed({ count: removed });
	if (busy > 0) return m.calendar_import_result_none_selected({ count: busy });
	return m.calendar_import_result_no_conflicts();
};

interface Props {
	shortId: string;
	selectedSlots: string[];
	setSelectedSlots: React.Dispatch<React.SetStateAction<string[]>>;
	onSave: () => void;
	isSaving: boolean;
}

export const HeatmapTabs = ({
	shortId,
	selectedSlots,
	setSelectedSlots,
	onSave,
	isSaving,
}: Props) => {
	const { data: event } = useGetEvent(shortId);
	const { data: me } = useGetMe();

	const { isMobile } = useIsMobile();
	const [preferredIndex, setPreferredIndex] = useState(me ? 0 : 1);
	// "Yours" needs a signed-in user, so logged-out visitors always see the group heatmap.
	const selectedIndex = me ? preferredIndex : 1;
	const [isSelectMode, setIsSelectMode] = useState(false);
	const canDrag = !!me && (!isMobile || isSelectMode);
	const [openSlot, setOpenSlot] = useState<string | null>(null);
	const isDragging = useRef(false);
	const visitedSlots = useRef(new Set<string>());

	// Busy slots from the last calendar import, as event slots. Page session only: replaced by the
	// next import, never derived from the saved notAvailable (that holds every unselected slot).
	const [blockedState, setBlockedState] = useState({ shortId, slots: new Set<string>() });
	const blocked = blockedState.shortId === shortId ? blockedState.slots : new Set<string>();
	const { mutate: respond } = useRespondToEvent(shortId);

	const eventTz = event?.details.timezone ?? "UTC";
	const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

	// Grid: one row per time (a single row when the event has no times), one column per date or weekday.
	const uniqueTimes = new Set<string>();
	const uniqueDays = new Set<string>();
	const heatMapSlots = new Map<string, components["schemas"]["SlotSummaryDto"]>();
	// maps display-tz slot → original event-tz slot (for selectedSlots lookups)
	const displayToSlot = new Map<string, string>();

	for (const eventSlot of event?.details.times ?? []) {
		const displaySlot = convertSlot(eventSlot, eventTz, userTz);
		displayToSlot.set(displaySlot, eventSlot);
		const { time, day } = parseSlot(displaySlot);
		if (time) uniqueTimes.add(time);
		uniqueDays.add(day);
	}

	for (const slot of event?.summary.slots ?? []) {
		if (slot.slot) heatMapSlots.set(slot.slot, slot);
	}

	const hasTimes = uniqueTimes.size > 0;
	const heatMapTimes: (string | null)[] = hasTimes ? Array.from(uniqueTimes).sort() : [null];
	const heatMapDates = Array.from(uniqueDays).sort(compareDays);
	// Slots that exist in the event; grid positions without one (e.g. after a timezone shift) stay empty.
	const slotAt = (time: string | null, day: string) => displayToSlot.get(joinSlot(time, day));

	const toggleRow = (displayTime: string | null) => {
		const rowSlots = heatMapDates
			.map(date => slotAt(displayTime, date))
			.filter((slot): slot is string => !!slot && !blocked.has(slot));
		const allSelected = rowSlots.every(slot => selectedSlots.includes(slot));
		setSelectedSlots(prev =>
			allSelected
				? prev.filter(slot => !rowSlots.includes(slot))
				: [...new Set([...prev, ...rowSlots])],
		);
	};

	const toggleColumn = (displayDate: string) => {
		const colSlots = heatMapTimes
			.map(time => slotAt(time, displayDate))
			.filter((slot): slot is string => !!slot && !blocked.has(slot));
		const allSelected = colSlots.every(slot => selectedSlots.includes(slot));
		setSelectedSlots(prev =>
			allSelected
				? prev.filter(slot => !colSlots.includes(slot))
				: [...new Set([...prev, ...colSlots])],
		);
	};

	const handleSelectAll = () =>
		setSelectedSlots((event?.details.times ?? []).filter(slot => !blocked.has(slot)));
	const handleDeselectAll = () => setSelectedSlots([]);

	/** Tap or drag over a cell. Selecting a blocked cell is on purpose, so it unblocks it. */
	const toggleSlot = (slot: string) => {
		setSelectedSlots(prev =>
			prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot],
		);
		if (blocked.has(slot)) {
			setBlockedState(prev => {
				const slots = new Set(prev.slots);
				slots.delete(slot);
				return { ...prev, slots };
			});
		}
	};

	/** After a calendar import: deselect and block the busy slots, then save straight away. */
	const handleBusySlots = (busySlots: string[]) => {
		const allTimes = event?.details.times ?? [];
		const busy = new Set(busySlots.filter(slot => allTimes.includes(slot)));
		const available = selectedSlots.filter(slot => !busy.has(slot));
		const result = importResultMessage(busy.size, selectedSlots.length - available.length);

		setSelectedSlots(available);
		setBlockedState({ shortId, slots: busy });
		respond(
			{ shortId, available, notAvailable: allTimes.filter(slot => !available.includes(slot)) },
			{
				onSuccess: () => toast.success(m.calendar_import_saved({ result })),
				onError: () => toast.error(m.calendar_import_save_failed({ result })),
			},
		);
	};

	return (
		<>
			<Tabs
				value={selectedIndex === 0 ? "yours" : "group"}
				onValueChange={value => {
					setPreferredIndex(value === "yours" ? 0 : 1);
					setIsSelectMode(false);
					setOpenSlot(null);
				}}
			>
				<div className="bg-canvas p-2 rounded-xl max-w-xl m-auto mb-6">
					<TabsList>
						<TabsTrigger value="yours" disabled={!me}>
							{m.event_tab_yours()}
						</TabsTrigger>
						<TabsTrigger value="group">{m.event_tab_group()}</TabsTrigger>
						<TwoElementMovingBox selectedIndex={selectedIndex} />
					</TabsList>
				</div>

				{/* your availability tab */}
				<TabsContent value="yours">
					<div className="mb-6">
						<div className="flex flex-row items-start">
							<GradientIcon icon={PenBoxIcon} className="size-6  min-w-6 mr-2.5" />
							<div>
								<p className="text-lg">{m.event_mark_availability_title()}</p>
								<p className="text-info text-sm">{m.event_mark_availability_text()}</p>
							</div>
						</div>
					</div>

					{me && (
						<div className="flex justify-center">
							<CalendarImport shortId={shortId} onBusySlotsLoaded={handleBusySlots} />
						</div>
					)}

					{me && (
						<div className="flex flex-row gap-2 mb-3 justify-center">
							<Button size="xs" onClick={handleSelectAll}>
								{m.event_select_all()}
							</Button>
							<Button size="xs" variant="red" onClick={handleDeselectAll}>
								{m.event_deselect_all()}
							</Button>
							<Button
								size="xs"
								onClick={() => {
									onSave();
									setPreferredIndex(1);
								}}
								disabled={isSaving}
							>
								{m.event_save()}
							</Button>
						</div>
					)}

					<div className="overflow-x-auto w-full mb-28">
						<div
							className="p-4 bg-canvas rounded-2xl w-max mx-auto"
							style={{ touchAction: isSelectMode && isMobile ? "none" : "auto" }}
							onPointerDown={e => {
								if (!canDrag) return;
								const el = document.elementFromPoint(e.clientX, e.clientY);
								const slot = el?.closest("[data-slot]")?.getAttribute("data-slot");
								if (!slot) return;
								isDragging.current = true;
								visitedSlots.current.clear();
								visitedSlots.current.add(slot);
								toggleSlot(slot);
								(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
							}}
							onPointerMove={e => {
								if (!isDragging.current || !canDrag) return;
								const el = document.elementFromPoint(e.clientX, e.clientY);
								const slot = el?.closest("[data-slot]")?.getAttribute("data-slot");
								if (!slot || visitedSlots.current.has(slot)) return;
								visitedSlots.current.add(slot);
								toggleSlot(slot);
							}}
							onPointerUp={() => {
								isDragging.current = false;
								visitedSlots.current.clear();
							}}
							onPointerCancel={() => {
								isDragging.current = false;
								visitedSlots.current.clear();
							}}
						>
							{/* date headers */}
							<div className="flex flex-row mb-6">
								{hasTimes && <div className="w-16 shrink-0 mb-6" />}
								{heatMapDates.map(heatMapDate => {
									return (
										<Button
											variant="dark"
											type="button"
											size="xs"
											className={cn(
												"w-12 mx-0.5 shrink-0",
												me ? "cursor-pointer" : "cursor-default pointer-events-none opacity-50",
											)}
											key={heatMapDate}
											onClick={() => toggleColumn(heatMapDate)}
										>
											<DayLabel day={heatMapDate} small />
										</Button>
									);
								})}
							</div>

							{/* time rows */}
							<div>
								{heatMapTimes.map((heatMapTime, index) => (
									<div key={`${heatMapTime}${index}`} className="flex flex-row">
										{/* time on the left */}
										{heatMapTime && (
											<Button
												variant="dark"
												type="button"
												size="xs"
												className={cn(
													"absolute -mt-3! px-2 py-1 rounded-2xl z-50",
													me ? "cursor-pointer" : "cursor-default pointer-events-none opacity-50",
												)}
												onClick={() => toggleRow(heatMapTime)}
											>
												{formatTime(heatMapTime)}
											</Button>
										)}
										{hasTimes && <div className="w-16 shrink-0" />}
										{heatMapDates.map(heatMapDate => {
											const displaySlot = joinSlot(heatMapTime, heatMapDate);
											const realSlot = slotAt(heatMapTime, heatMapDate);
											if (!realSlot) {
												return <div key={displaySlot} className="w-12 h-12 shrink-0 m-0.5" />;
											}
											const isInLocal = selectedSlots.includes(realSlot);
											const isBlocked = !isInLocal && blocked.has(realSlot);

											return (
												<button
													type="button"
													key={displaySlot}
													data-slot={realSlot}
													data-blocked={isBlocked || undefined}
													className="relative w-12 h-12 shrink-0 m-0.5 overflow-hidden rounded-xl"
													disabled={!me}
												>
													<div
														className={cn(
															"absolute inset-0 rounded-xl",
															isBlocked ? "bg-secondary/25" : "bg-paint",
														)}
													/>
													<motion.span
														initial={false}
														animate={{
															scale: isInLocal ? 1.5 : 0,
															opacity: isInLocal ? 1 : 0,
														}}
														transition={{
															type: "spring",
															stiffness: 300,
															damping: 30,
														}}
														className="absolute inset-0 pointer-events-none rounded-xl bg-primary"
														style={{ originX: 0.5, originY: 0.5 }}
													/>
													{me?.id && isInLocal && (
														<CheckIcon className="absolute inset-0 size-6 m-auto z-10" />
													)}
													{isBlocked && (
														<BanIcon className="absolute inset-0 size-5 m-auto z-10 text-secondary" />
													)}
												</button>
											);
										})}
									</div>
								))}
							</div>
						</div>
					</div>
				</TabsContent>

				{/* group availability tab */}
				<TabsContent value="group">
					<div className="mb-6">
						<div className="flex flex-row items-start">
							<GradientIcon icon={PenBoxIcon} className="size-6 mr-2.5" />
							<div>
								<p className="text-lg">{m.event_group_availability_title()}</p>
								<p className="text-info text-sm">{m.event_group_availability_text()}</p>
							</div>
						</div>
					</div>

					<div className="overflow-x-auto w-full mb-6">
						<div className="p-4 bg-canvas rounded-2xl w-max mx-auto">
							{/* date headers */}
							<div className="flex flex-row">
								{hasTimes && <div className="w-16 shrink-0" />}
								{heatMapDates.map(heatMapDate => (
									<div className="w-12 mx-0.5 shrink-0" key={heatMapDate}>
										<DayLabel day={heatMapDate} />
									</div>
								))}
							</div>

							{/* time rows */}
							<div>
								{heatMapTimes.map((heatMapTime, index) => (
									<div key={`${heatMapTime}${index}`} className="flex flex-row">
										{heatMapTime && (
											<p className="text-lg font-semibold absolute -mt-1 z-10 bg-canvas px-2 rounded-2xl">
												{formatTime(heatMapTime)}
											</p>
										)}
										{hasTimes && <div className="w-16 shrink-0" />}
										{heatMapDates.map(heatMapDate => {
											const displaySlot = joinSlot(heatMapTime, heatMapDate);
											const realSlot = slotAt(heatMapTime, heatMapDate);
											if (!realSlot) {
												return <div key={displaySlot} className="w-12 h-12 shrink-0 m-0.5" />;
											}
											const slot = heatMapSlots.get(realSlot);
											const count = slot?.count ?? 0;
											const hasMaxVotes = count === event?.summary.users?.length;

											return (
												<Popover
													key={displaySlot}
													open={openSlot === displaySlot}
													onOpenChange={open => setOpenSlot(open ? displaySlot : null)}
												>
													<PopoverTrigger asChild>
														<button
															type="button"
															className="relative w-12 h-12 shrink-0 m-0.5"
															onClick={() =>
																setOpenSlot(prev => (prev === displaySlot ? null : displaySlot))
															}
														>
															<div
																className={cn(
																	"absolute inset-0 rounded-xl",
																	count === 0 ? "bg-paint" : "bg-primary",
																	hasMaxVotes &&
																		"border border-amber-300 shadow-sm shadow-amber-300",
																)}
																style={{
																	opacity:
																		count > 0 ? count / (event?.summary.users?.length || 1) : 1,
																}}
															/>
														</button>
													</PopoverTrigger>
													<PopoverContent className="w-auto min-w-28 p-4">
														<p className="text-lg font-semibold mb-1 text-center">
															{heatMapTime && `${formatTime(heatMapTime)}, `}
															{format(dayToDate(heatMapDate), "EEEE", { locale: dateFnsLocale })}
														</p>
														<p className="flex-nowrap shrink-0 ml-2 font-number font-semibold text-center mb-4">
															{slot?.users?.length || 0} / {event?.summary.users?.length}{" "}
															{m.event_heatmap_info()}
														</p>
														{slot && (slot.users?.length ?? 0) > 0 && (
															<div className="flex flex-col gap-1 text-center">
																{slot.users?.map(user => (
																	<p key={user.id} className="text-sm">
																		{user.name}
																	</p>
																))}
															</div>
														)}
													</PopoverContent>
												</Popover>
											);
										})}
									</div>
								))}
							</div>
						</div>
					</div>
				</TabsContent>
			</Tabs>

			{/* fixed mode toggle — only visible on yours tab on mobile */}
			{me && selectedIndex === 0 && isMobile && (
				<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
					<Button
						onClick={() => setIsSelectMode(prev => !prev)}
						className="flex flex-row items-center gap-2 shadow-md px-5 py-3 rounded-full"
					>
						{isSelectMode ? (
							<>
								<XIcon className="size-5" />
								<span className="text-sm font-semibold">{m.event_enable_scrolling()}</span>
							</>
						) : (
							<>
								<PencilIcon className="size-5" />
								<span className="text-sm font-semibold">{m.event_enable_dragging()}</span>
							</>
						)}
					</Button>
				</div>
			)}
		</>
	);
};

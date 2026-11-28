/** biome-ignore-all lint/style/noNonNullAssertion: <explanation> */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
import { addDays, format, startOfWeek } from "date-fns";
import { BanIcon, CheckIcon, PenBoxIcon, PencilIcon, UsersIcon, XIcon } from "lucide-react";
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
import { BlockedSlotDialog, BlockedSlotTooltip } from "./BlockedSlot";
import { type BusySlotDetail, CalendarImport } from "./CalendarImport";
import { ConfirmSlotButton } from "./ConfirmSlotButton";
import { HeatmapScroll } from "./HeatmapScroll";
import { StartTimeRoundForm } from "./StartTimeRoundForm";

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

	// Busy slots from the last calendar import, as event slots, with why each is busy. Page session
	// only: replaced by the next import, never derived from the saved notAvailable (that holds every
	// unselected slot).
	const [blockedState, setBlockedState] = useState({
		shortId,
		slots: new Set<string>(),
		details: new Map<string, BusySlotDetail>(),
	});
	const isCurrentImport = blockedState.shortId === shortId;
	const blocked = isCurrentImport ? blockedState.slots : new Set<string>();
	const blockedDetail = (slot: string) =>
		isCurrentImport ? blockedState.details.get(slot) : undefined;
	// A blocked cell asks before it is selected: tapping it opens the confirm dialog, dragging skips it.
	const [hoveredBlocked, setHoveredBlocked] = useState<string | null>(null);
	const [confirmSlot, setConfirmSlot] = useState<string | null>(null);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const pressedBlocked = useRef<string | null>(null);
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

	const isSlot = (slot: string | undefined): slot is string => !!slot;
	const rowSlots = (displayTime: string | null) =>
		heatMapDates.map(date => slotAt(displayTime, date)).filter(isSlot);
	const columnSlots = (displayDate: string) =>
		heatMapTimes.map(time => slotAt(time, displayDate)).filter(isSlot);
	/** Every slot in the line is marked. A blocked slot is never marked, so its line is never full. */
	const isFull = (slots: string[]) =>
		slots.length > 0 && slots.every(slot => selectedSlots.includes(slot));

	/** Marks every unblocked slot in the line, or unmarks them when they are all marked already. */
	const toggleLine = (slots: string[]) => {
		const open = slots.filter(slot => !blocked.has(slot));
		const allSelected = open.every(slot => selectedSlots.includes(slot));
		setSelectedSlots(prev =>
			allSelected ? prev.filter(slot => !open.includes(slot)) : [...new Set([...prev, ...open])],
		);
	};

	const selectableSlots = (event?.details.times ?? []).filter(slot => !blocked.has(slot));
	const allSelected = isFull(selectableSlots);
	const toggleAll = () => setSelectedSlots(allSelected ? [] : selectableSlots);

	/** Tap or drag over a cell, or a confirmed blocked cell. Selecting a blocked cell unblocks it. */
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

	const askToUnblock = (slot: string) => {
		setHoveredBlocked(null);
		setConfirmSlot(slot);
		setConfirmOpen(true);
	};

	const confirmUnblock = () => {
		if (confirmSlot && blocked.has(confirmSlot)) toggleSlot(confirmSlot);
		setConfirmOpen(false);
	};

	const endDrag = () => {
		isDragging.current = false;
		visitedSlots.current.clear();
		pressedBlocked.current = null;
	};

	/** After a calendar import: deselect and block the busy slots, then save straight away. */
	const handleBusySlots = (busySlots: string[], busyDetails: BusySlotDetail[]) => {
		const allTimes = event?.details.times ?? [];
		const busy = new Set(busySlots.filter(slot => allTimes.includes(slot)));
		const available = selectedSlots.filter(slot => !busy.has(slot));
		const result = importResultMessage(busy.size, selectedSlots.length - available.length);

		setSelectedSlots(available);
		setBlockedState({
			shortId,
			slots: busy,
			details: new Map(
				busyDetails
					.filter(detail => detail.slot && busy.has(detail.slot))
					.map(detail => [detail.slot!, detail]),
			),
		});
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
						<div className="flex justify-center mb-3">
							<button
								type="button"
								className="text-sm text-info underline cursor-pointer"
								onClick={toggleAll}
							>
								{allSelected ? m.event_deselect_all() : m.event_select_all()}
							</button>
						</div>
					)}

					<HeatmapScroll className={me ? "mb-6" : "mb-28"}>
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
								setHoveredBlocked(null);
								// A blocked cell waits for the pointer to lift: a tap asks, a drag skips it.
								pressedBlocked.current = blocked.has(slot) ? slot : null;
								if (!blocked.has(slot)) toggleSlot(slot);
								(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
							}}
							onPointerMove={e => {
								if (!isDragging.current || !canDrag) return;
								const el = document.elementFromPoint(e.clientX, e.clientY);
								const slot = el?.closest("[data-slot]")?.getAttribute("data-slot");
								if (!slot || visitedSlots.current.has(slot)) return;
								visitedSlots.current.add(slot);
								if (!blocked.has(slot)) toggleSlot(slot);
							}}
							onPointerUp={() => {
								const tapped = pressedBlocked.current;
								if (tapped && visitedSlots.current.size === 1) askToUnblock(tapped);
								endDrag();
							}}
							onPointerCancel={endDrag}
						>
							{/* date headers */}
							<div className="flex flex-row mb-6">
								{hasTimes && <div className="w-16 shrink-0 mb-6" />}
								{heatMapDates.map(heatMapDate => {
									const full = isFull(columnSlots(heatMapDate));
									return (
										<Button
											variant={full ? "orange" : "dark"}
											type="button"
											size="xs"
											className={cn(
												"w-12 mx-0.5 shrink-0",
												me ? "cursor-pointer" : "cursor-default pointer-events-none opacity-50",
											)}
											key={heatMapDate}
											data-column={heatMapDate}
											data-full={full}
											onClick={() => toggleLine(columnSlots(heatMapDate))}
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
												variant={isFull(rowSlots(heatMapTime)) ? "orange" : "dark"}
												data-full={isFull(rowSlots(heatMapTime))}
												type="button"
												size="xs"
												className={cn(
													"absolute -mt-3! px-2 py-1 rounded-2xl z-50",
													me ? "cursor-pointer" : "cursor-default pointer-events-none opacity-50",
												)}
												onClick={() => toggleLine(rowSlots(heatMapTime))}
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

											const cell = (
												<button
													type="button"
													key={displaySlot}
													data-slot={realSlot}
													data-blocked={isBlocked || undefined}
													className="relative w-12 h-12 shrink-0 m-0.5 overflow-hidden rounded-xl"
													disabled={!me}
													// Scroll mode on mobile has no pointer selection; a tap still explains the block.
													onClick={isBlocked && !canDrag ? () => askToUnblock(realSlot) : undefined}
													onPointerEnter={
														isBlocked
															? e => {
																	if (e.pointerType === "mouse" && !isDragging.current)
																		setHoveredBlocked(realSlot);
																}
															: undefined
													}
													onPointerLeave={
														isBlocked
															? () => setHoveredBlocked(prev => (prev === realSlot ? null : prev))
															: undefined
													}
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
											if (!isBlocked) return cell;
											return (
												<BlockedSlotTooltip
													key={displaySlot}
													open={hoveredBlocked === realSlot}
													detail={blockedDetail(realSlot)}
													timeZone={userTz}
												>
													{cell}
												</BlockedSlotTooltip>
											);
										})}
									</div>
								))}
							</div>
						</div>
					</HeatmapScroll>

					{me && (
						<div className="flex justify-center mb-28">
							<Button
								size="sm"
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
				</TabsContent>

				{/* group availability tab */}
				<TabsContent value="group">
					<div className="mb-6">
						<div className="flex flex-row items-start">
							<GradientIcon icon={UsersIcon} className="size-6 mr-2.5" />
							<div>
								<p className="text-lg">{m.event_group_availability_title()}</p>
								<p className="text-info text-sm">{m.event_group_availability_text()}</p>
							</div>
						</div>
					</div>

					<HeatmapScroll className="mb-6">
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
														{me && event?.details.creatorId === me.id && (
															<ConfirmSlotButton
																shortId={shortId}
																slot={realSlot}
																eventTimezone={eventTz}
																onConfirmed={() => setOpenSlot(null)}
															/>
														)}
														{me &&
															event?.details.creatorId === me.id &&
															event?.details.round === "DATE" && (
																<StartTimeRoundForm
																	shortId={shortId}
																	date={realSlot}
																	onStarted={() => setOpenSlot(null)}
																/>
															)}
													</PopoverContent>
												</Popover>
											);
										})}
									</div>
								))}
							</div>
						</div>
					</HeatmapScroll>
				</TabsContent>
			</Tabs>

			<BlockedSlotDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				detail={confirmSlot ? blockedDetail(confirmSlot) : undefined}
				timeZone={userTz}
				onConfirm={confirmUnblock}
			/>

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

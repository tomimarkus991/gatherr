import { motion } from "motion/react";
import { cn } from "../../../../lib/utils";
import type { EventType } from "../../../../mocks/types";
import * as m from "../../../../paraglide/messages";
import { ComponentExplainer } from "../../ComponentExplainer";
import { Tabs, TabsList, TabsTrigger } from "../../tabs";
import { Calendar } from "./calendar/Calendar";
import { DaysOfTheWeek } from "./DaysOfTheWeek";
import { type TripRange, TripRangePicker } from "./TripRangePicker";

/**
 * The tabs in reading order of the grid: dates on top, weekdays below, times on the right;
 * the trip tab spans the last row.
 */
const TABS: { type: EventType; label: () => string }[] = [
	{ type: "SPECIFIC_DATES", label: m.choose_event_type_dates },
	{ type: "SPECIFIC_DATES_AND_TIMES", label: m.choose_event_type_dates_with_times },
	{ type: "WEEKDAYS", label: m.choose_event_type_weekdays },
	{ type: "WEEKDAYS_AND_TIMES", label: m.choose_event_type_weekdays_with_times },
	{ type: "DATE_RANGES", label: m.choose_event_type_trip },
];
const ROWS = Math.ceil(TABS.length / 2);
const isFullRow = (index: number) => index === TABS.length - 1 && TABS.length % 2 === 1;

interface GridMovingBoxProps {
	selectedIndex: number;
	duration?: number;
}

/** One highlight that slides straight to the selected cell: sideways, up/down or diagonally. */
const GridMovingBox = ({ selectedIndex, duration = 0.4 }: GridMovingBoxProps) => (
	<motion.div
		aria-hidden
		initial={false}
		animate={{
			left: isFullRow(selectedIndex) ? "0%" : `${(selectedIndex % 2) * 50}%`,
			top: `${(Math.floor(selectedIndex / 2) * 100) / ROWS}%`,
			width: isFullRow(selectedIndex) ? "100%" : "50%",
		}}
		transition={{ ease: "easeOut", duration }}
		style={{ height: `${100 / ROWS}%` }}
		className="bg-primary absolute rounded-2xl shadow-lg/60 shadow-amber-900 pointer-events-none"
	/>
);

interface Props {
	selected: Date[];
	setSelected: React.Dispatch<React.SetStateAction<Date[]>>;
	selectedDays: string[];
	setSelectedDays: React.Dispatch<React.SetStateAction<string[]>>;
	eventType: EventType;
	setEventType: React.Dispatch<React.SetStateAction<EventType>>;
	tripRanges: TripRange[];
	setTripRanges: React.Dispatch<React.SetStateAction<TripRange[]>>;
}

export const ChooseEventTypeSlider = ({
	selected,
	setSelected,
	selectedDays,
	setSelectedDays,
	eventType,
	setEventType,
	tripRanges,
	setTripRanges,
}: Props) => {
	const selectedIndex = Math.max(
		0,
		TABS.findIndex(tab => tab.type === eventType),
	);
	const isWeekdays = eventType === "WEEKDAYS" || eventType === "WEEKDAYS_AND_TIMES";
	return (
		<Tabs value={eventType} onValueChange={value => setEventType(value as EventType)}>
			<div className="bg-canvas p-2 rounded-xl max-w-xl m-auto">
				<TabsList className="grid grid-cols-2 px-0">
					{TABS.map((tab, index) => (
						<TabsTrigger
							key={tab.type}
							value={tab.type}
							className={cn(
								"mx-0 text-base sm:text-lg whitespace-normal",
								isFullRow(index) && "col-span-2",
							)}
						>
							{tab.label()}
						</TabsTrigger>
					))}
					<GridMovingBox selectedIndex={selectedIndex} />
				</TabsList>
			</div>
			{eventType === "DATE_RANGES" ? (
				<TripRangePicker ranges={tripRanges} setRanges={setTripRanges} />
			) : isWeekdays ? (
				<div className="mt-10">
					<ComponentExplainer
						title={m.choose_event_type_days_title()}
						text={m.choose_event_type_days_text()}
					/>
					<div className="mb-8 bg-canvas rounded-xl py-4 px-4">
						<DaysOfTheWeek selected={selectedDays} setSelected={setSelectedDays} />
					</div>
				</div>
			) : (
				<div className="mt-10">
					<ComponentExplainer
						title={m.choose_event_type_dates_title()}
						text={m.choose_event_type_dates_text()}
					/>
					<div className="mb-8 bg-canvas rounded-xl py-6 max-w-xs m-auto px-4">
						<Calendar selected={selected} setSelected={setSelected} />
					</div>
				</div>
			)}
		</Tabs>
	);
};

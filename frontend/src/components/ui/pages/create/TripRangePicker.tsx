import { eachDayOfInterval } from "date-fns";
import { XIcon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { formatRange, parseRangeKey, rangeKey, rangeLength } from "../../../../lib/dateRange";
import * as m from "../../../../paraglide/messages";
import { ComponentExplainer } from "../../ComponentExplainer";
import { Input } from "../../input";
import { Calendar, dateFnsLocale } from "./calendar/Calendar";

/** One date option of a trip event: its range key plus an optional label and link. */
export interface TripRange {
	key: string;
	label: string;
	link: string;
}

/** True for an empty link or an http(s) URL with a host, like the backend's check. */
export const isValidTripLink = (link: string) => {
	const value = link.trim();
	if (!value) return true;
	try {
		const url = new URL(value);
		return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
	} catch {
		return false;
	}
};

interface Props {
	ranges: TripRange[];
	setRanges: React.Dispatch<React.SetStateAction<TripRange[]>>;
}

/** Trip events (#148): pick a start day, then an end day, to add a date option; repeat for more. */
export const TripRangePicker = ({ ranges, setRanges }: Props) => {
	const [pendingStart, setPendingStart] = useState<Date | null>(null);

	// Every day of every option stays marked, plus the start day while picking an end.
	const selected = [
		...ranges.flatMap(range => {
			const parsed = parseRangeKey(range.key);
			return parsed ? eachDayOfInterval(parsed) : [];
		}),
		...(pendingStart ? [pendingStart] : []),
	];

	const handleDateClick = (date: Date) => {
		if (!pendingStart) {
			setPendingStart(date);
			return;
		}
		const key = rangeKey(pendingStart, date);
		setPendingStart(null);
		if (ranges.some(range => range.key === key)) {
			toast.error(m.create_trip_range_exists(), { id: "create_trip_range_exists" });
			return;
		}
		setRanges(prev => [...prev, { key, label: "", link: "" }]);
	};

	const update = (key: string, field: "label" | "link", value: string) =>
		setRanges(prev =>
			prev.map(range => (range.key === key ? { ...range, [field]: value } : range)),
		);

	return (
		<div className="mt-10" data-testid="trip-range-picker">
			<ComponentExplainer
				title={m.create_trip_title()}
				text={pendingStart ? m.create_trip_pick_end() : m.create_trip_text()}
			/>
			<div className="mb-8 bg-canvas rounded-xl py-6 max-w-xs m-auto px-4">
				<Calendar selected={selected} onDateClick={handleDateClick} />
			</div>

			{ranges.length > 0 && (
				<div className="mb-8">
					<p className="text-xl mb-3">{m.create_trip_ranges_title()}</p>
					<ul className="space-y-3">
						{ranges.map(range => {
							const text = formatRange(range.key, dateFnsLocale);
							const linkInvalid = !isValidTripLink(range.link);
							return (
								<li
									key={range.key}
									data-range={range.key}
									className="bg-canvas rounded-xl p-4 space-y-2"
								>
									<div className="flex flex-row items-center justify-between gap-3">
										<div>
											<p className="text-lg font-semibold">{text}</p>
											<p className="text-sm text-info">
												{m.create_trip_days({ count: rangeLength(range.key) })}
											</p>
										</div>
										<button
											type="button"
											aria-label={m.create_trip_remove_range({ range: text })}
											className="p-2 rounded-lg cursor-pointer text-info hover:text-content"
											onClick={() => setRanges(prev => prev.filter(r => r.key !== range.key))}
										>
											<XIcon className="size-5" />
										</button>
									</div>
									<Input
										value={range.label}
										maxLength={200}
										placeholder={m.create_trip_label_placeholder()}
										aria-label={m.create_trip_label_placeholder()}
										className="text-base px-4 py-2"
										onChange={e => update(range.key, "label", e.target.value)}
									/>
									<Input
										type="url"
										inputMode="url"
										value={range.link}
										maxLength={2000}
										placeholder={m.create_trip_link_placeholder()}
										aria-label={m.create_trip_link_placeholder()}
										aria-invalid={linkInvalid || undefined}
										className="text-base px-4 py-2"
										onChange={e => update(range.key, "link", e.target.value)}
									/>
									{linkInvalid && (
										<p className="text-sm text-secondary">{m.create_trip_link_invalid()}</p>
									)}
								</li>
							);
						})}
					</ul>
				</div>
			)}
		</div>
	);
};

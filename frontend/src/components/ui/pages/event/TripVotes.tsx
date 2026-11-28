import { CheckIcon, ExternalLinkIcon, PenBoxIcon, UsersIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { components } from "../../../../api/types.gen";
import { useGetEvent } from "../../../../hooks/query/useGetEvent";
import { useGetMe } from "../../../../hooks/query/useGetMe";
import { bestRanges, formatRange, rangeLength } from "../../../../lib/dateRange";
import { cn } from "../../../../lib/utils";
import { m } from "../../../../paraglide/messages";
import { GradientIcon } from "../../../icons/GradientIcon";
import { Button } from "../../button";
import { dateFnsLocale } from "../create/calendar/Calendar";
import { ConfirmSlotButton } from "./ConfirmSlotButton";

type RangeDetail = components["schemas"]["RangeDetail"];

interface Props {
	shortId: string;
	/** Ranges answered Yes, as range keys. */
	selectedSlots: string[];
	setSelectedSlots: React.Dispatch<React.SetStateAction<string[]>>;
	onSave: () => void;
	isSaving: boolean;
}

/** Only http(s) links are shown as links; the backend accepts nothing else, this guards old or mock data. */
const safeLink = (link?: string) => (link && /^https?:\/\//i.test(link) ? link : undefined);

/** A range's dates and length, with its label and link when set. */
const RangeHeading = ({ range, detail }: { range: string; detail?: RangeDetail }) => {
	const link = safeLink(detail?.link);
	return (
		<div className="min-w-0">
			<p className="text-lg font-semibold">
				{formatRange(range, dateFnsLocale)}{" "}
				<span className="text-sm font-normal text-info">
					· {m.create_trip_days({ count: rangeLength(range) })}
				</span>
			</p>
			{detail?.label && <p className="text-sm break-words">{detail.label}</p>}
			{link && (
				<a
					href={link}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 text-sm text-primary underline break-all"
				>
					<ExternalLinkIcon className="size-4 shrink-0" />
					{m.event_trip_open_link()}
				</a>
			)}
		</div>
	);
};

/**
 * Trip events (#148): one row per date range answered Yes or No as a whole, then one bar per
 * range with who said Yes. The organiser confirms a range from its bar.
 */
export const TripVotes = ({
	shortId,
	selectedSlots,
	setSelectedSlots,
	onSave,
	isSaving,
}: Props) => {
	const { data: event } = useGetEvent(shortId);
	const { data: me } = useGetMe();

	const ranges = event?.details.times ?? [];
	const details = event?.details.rangeDetails ?? {};
	const participants = event?.summary.users?.length ?? 0;
	const isOrganiser = !!me && event?.details.creatorId === me.id;
	const eventTz = event?.details.timezone ?? "UTC";

	// "No" is shown only for ranges answered No; an unanswered range is neither until saved.
	const savedNo = me
		? event?.summary.users?.find(user => user.user?.id === me.id)?.notAvailable
		: undefined;
	const [answeredNo, setAnsweredNo] = useState<string[]>([]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset on a new user or fresh event data, like the page's Yes answers
	useEffect(() => setAnsweredNo(savedNo ?? []), [me?.id, event]);

	const answer = (range: string, yes: boolean) => {
		setSelectedSlots(prev =>
			yes ? [...new Set([...prev, range])] : prev.filter(r => r !== range),
		);
		setAnsweredNo(prev => (yes ? prev.filter(r => r !== range) : [...new Set([...prev, range])]));
	};

	const slots = new Map((event?.summary.slots ?? []).map(slot => [slot.slot, slot]));
	const best = bestRanges(
		ranges.map(range => ({ slot: range, count: slots.get(range)?.count ?? 0 })),
	);

	return (
		<div className="mb-28">
			{me && (
				<section className="mb-12" data-testid="trip-answers">
					<div className="flex flex-row items-start mb-6">
						<GradientIcon icon={PenBoxIcon} className="size-6 min-w-6 mr-2.5" />
						<div>
							<p className="text-lg">{m.event_trip_title()}</p>
							<p className="text-info text-sm">{m.event_trip_text()}</p>
						</div>
					</div>
					<ul className="space-y-3 mb-6">
						{ranges.map(range => {
							const yes = selectedSlots.includes(range);
							const no = !yes && answeredNo.includes(range);
							return (
								<li
									key={range}
									data-range={range}
									className="bg-canvas rounded-xl p-4 flex flex-col gap-3"
								>
									<RangeHeading range={range} detail={details[range]} />
									<div className="grid grid-cols-2 gap-2">
										<Button
											size="xs"
											variant={yes ? "orange" : "dark"}
											aria-pressed={yes}
											onClick={() => answer(range, true)}
										>
											<CheckIcon className="size-4 mr-2" />
											{m.event_trip_yes()}
										</Button>
										<Button
											size="xs"
											variant={no ? "red" : "dark"}
											aria-pressed={no}
											onClick={() => answer(range, false)}
										>
											<XIcon className="size-4 mr-2" />
											{m.event_trip_no()}
										</Button>
									</div>
								</li>
							);
						})}
					</ul>
					<div className="flex justify-center">
						<Button size="sm" onClick={onSave} disabled={isSaving}>
							{m.event_save()}
						</Button>
					</div>
				</section>
			)}

			<section data-testid="trip-results">
				<div className="flex flex-row items-start mb-6">
					<GradientIcon icon={UsersIcon} className="size-6 min-w-6 mr-2.5" />
					<div>
						<p className="text-lg">{m.event_trip_results_title()}</p>
						<p className="text-info text-sm">{m.event_trip_results_text()}</p>
					</div>
				</div>
				<ul className="space-y-3">
					{ranges.map(range => {
						const slot = slots.get(range);
						const count = slot?.count ?? 0;
						const isBest = best.has(range);
						return (
							<li
								key={range}
								data-range={range}
								data-best={isBest || undefined}
								className={cn(
									"bg-canvas rounded-xl p-4 border-2",
									isBest ? "border-amber-300 shadow-sm shadow-amber-300" : "border-transparent",
								)}
							>
								<div className="flex flex-row items-start justify-between gap-3 mb-3">
									<RangeHeading range={range} detail={details[range]} />
									{isBest && (
										<span className="shrink-0 rounded-lg bg-primary px-2 py-0.5 text-xs font-semibold">
											{m.event_trip_best()}
										</span>
									)}
								</div>
								<div className="h-4 rounded-lg bg-paint overflow-hidden mb-2">
									<div
										className="h-full rounded-lg bg-primary transition-[width] duration-500"
										style={{ width: `${participants ? (count / participants) * 100 : 0}%` }}
									/>
								</div>
								<p className="font-number font-semibold text-sm">
									{m.event_trip_yes_count({ count, total: participants })}
								</p>
								<p className="text-sm text-info break-words">
									{count > 0
										? slot?.users?.map(user => user.name).join(", ")
										: m.event_trip_nobody_yet()}
								</p>
								{isOrganiser && (
									<ConfirmSlotButton
										shortId={shortId}
										slot={range}
										eventTimezone={eventTz}
										onConfirmed={() => {}}
									/>
								)}
							</li>
						);
					})}
				</ul>
			</section>
		</div>
	);
};

import type { components } from "../../../../api/types.gen";
import { m } from "../../../../paraglide/messages";
import { Accordion } from "../../accordion";
import { readableSlot } from "./ConfirmSlotButton";

type DateRoundSummary = components["schemas"]["DateRoundSummaryDto"];

/** The date round's heatmap, read-only and collapsed, once the event is in its time round (#94). */
export const DayVotes = ({ dateRound }: { dateRound: DateRoundSummary }) => {
	const total = dateRound.respondentCount ?? 0;
	return (
		<div className="mb-12" data-testid="day-votes">
			<Accordion
				title={m.event_day_votes_title()}
				body={
					<div className="flex flex-row flex-wrap gap-2 pb-2">
						{dateRound.slots?.map(({ slot, count = 0, users }) => (
							<div key={slot} data-day={slot} className="flex flex-col items-center w-16">
								<div className="relative w-12 h-12">
									<div
										className={
											count === 0
												? "absolute inset-0 rounded-xl bg-paint"
												: "absolute inset-0 rounded-xl bg-primary"
										}
										style={{ opacity: count > 0 ? count / (total || 1) : 1 }}
									/>
									<p className="relative font-number font-semibold leading-12 text-center">
										{count}
									</p>
								</div>
								<p className="text-xs text-center mt-1">{slot && readableSlot(slot)}</p>
								<p className="sr-only">{users?.map(user => user.name).join(", ")}</p>
							</div>
						))}
					</div>
				}
			/>
		</div>
	);
};

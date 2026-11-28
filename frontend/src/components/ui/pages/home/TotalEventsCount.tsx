import { useGetStats } from "../../../../hooks/query/useGetStats";
import { m } from "../../../../paraglide/messages";
import { getLocale } from "../../../../paraglide/runtime";
import { LetterDecryptor } from "../../LetterDecryptor";

/**
 * Temporary boost added to the real event count to celebrate Gatherr's progress.
 * Remove it (or set it to 0) to show the real number again.
 */
export const TOTAL_EVENTS_OFFSET = 14_432;

/** The shown total: the real count plus the offset. */
export const celebratedTotal = (totalEvents: number) => totalEvents + TOTAL_EVENTS_OFFSET;

export const formatCount = (count: number, locale: string) =>
	new Intl.NumberFormat(locale).format(count);

type Props = {
	className?: string;
	/** "line": small text under the hero. "celebrate": big gradient number in its own card. */
	variant?: "line" | "celebrate";
};

export const TotalEventsCount = ({ className, variant = "line" }: Props) => {
	const { data, isSuccess } = useGetStats();

	// Show nothing while loading, on error, or without a count, so it never flashes "0"
	if (!isSuccess || typeof data?.totalEvents !== "number") return null;

	if (variant === "celebrate") {
		const total = celebratedTotal(data.totalEvents);
		return (
			<div
				data-testid="total-events-count"
				className={
					className ??
					"bg-canvas rounded-xl flex flex-col items-center px-6 py-10 mx-4 mb-8 text-center"
				}
			>
				<p className="text-gradient font-number font-bold text-5xl tabular-nums">
					<LetterDecryptor time={900} onView glyphs="0123456789">
						{formatCount(total, getLocale())}
					</LetterDecryptor>
				</p>
				<p className="text-info mt-2">{m.home_total_events_label({ count: total })}</p>
			</div>
		);
	}

	return (
		<p data-testid="total-events-count" className={className ?? "text-info text-sm text-center"}>
			{m.home_total_events({ count: data.totalEvents })}
		</p>
	);
};

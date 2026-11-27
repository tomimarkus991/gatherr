import { useGetStats } from "../../../../hooks/query/useGetStats";
import { m } from "../../../../paraglide/messages";

export const TotalEventsCount = ({ className }: { className?: string }) => {
	const { data, isSuccess } = useGetStats();

	// Show nothing while loading, on error, or without a count, so it never flashes "0"
	if (!isSuccess || typeof data?.totalEvents !== "number") return null;

	return (
		<p data-testid="total-events-count" className={className ?? "text-info text-sm text-center"}>
			{m.home_total_events({ count: data.totalEvents.toLocaleString() })}
		</p>
	);
};

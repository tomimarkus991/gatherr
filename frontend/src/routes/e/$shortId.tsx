/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <useEffect> */
/** biome-ignore-all lint/style/noNonNullAssertion: <explanation> */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ClockIcon, Pencil, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { ScrollFadeIn } from "../../components/animations/ScrollFadeIn";
import { GoogleIcon } from "../../components/icons/GoogleIcon";
import { GradientIcon } from "../../components/icons/GradientIcon";
import { Button } from "../../components/ui/button";
import { dateFnsLocale } from "../../components/ui/pages/create/calendar/Calendar";
import { ConfirmedTime } from "../../components/ui/pages/event/ConfirmedTime";
import { DayVotes } from "../../components/ui/pages/event/DayVotes";
import { EditEventDialog } from "../../components/ui/pages/event/EditEventDialog";
import { HeatmapTabs } from "../../components/ui/pages/event/HeatmapTabs";
import { ShareEventDialog } from "../../components/ui/pages/event/ShareEventDialog";
import { TripVotes } from "../../components/ui/pages/event/TripVotes";
import { ShareLinkPanel } from "../../components/ui/ShareLinkPanel";
import { Skeleton } from "../../components/ui/skeleton";
import { UserButton } from "../../components/ui/UserButton";
import { useGoogleAuth } from "../../hooks/mutation/useGoogleAuth";
import { useRespondToEvent } from "../../hooks/mutation/useRespondToEvent";
import { useGetEvent } from "../../hooks/query/useGetEvent";
import { useGetMe } from "../../hooks/query/useGetMe";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { cn } from "../../lib/utils";
import { m } from "../../paraglide/messages";

export const Route = createFileRoute("/e/$shortId")({
	// `fromCreate` is set only by the create flow, to open the share prompt once.
	validateSearch: (search: Record<string, unknown>): { fromCreate?: true } =>
		search.fromCreate === true || search.fromCreate === "true" ? { fromCreate: true } : {},
	component: RouteComponent,
});

function RouteComponent() {
	const { shortId } = Route.useParams();
	const { fromCreate } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data: event, isLoading } = useGetEvent(shortId);
	useDocumentTitle(event?.details.name);
	const { data: me } = useGetMe();
	const handleLogin = useGoogleAuth();
	const { mutate: respond, isPending: isSaving } = useRespondToEvent(shortId);

	const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
	const [isEditOpen, setIsEditOpen] = useState(false);

	// Replace, not push, so a reload or the back button never reopens the share prompt.
	const closeSharePrompt = () => navigate({ search: {}, replace: true });

	const handleSave = () => {
		const allTimes = event?.details.times ?? [];
		respond({
			shortId,
			available: selectedSlots,
			notAvailable: allTimes.filter((time: string) => !selectedSlots.includes(time)),
		});
	};

	// Show only the signed-in user's saved slots; switching accounts or logging out must not keep the previous user's selection.
	useEffect(() => {
		const currentUserSlots = me
			? event?.summary.users?.find(user => user.user?.id === me.id)
			: undefined;
		setSelectedSlots(currentUserSlots?.available ?? []);
	}, [me?.id, event]);

	if (isLoading) return null;
	if (!event) return <p>Not found</p>;
	const isTrip = event.details.type === "DATE_RANGES";

	return (
		<main className="max-w-md m-auto pt-5 px-4 sm:px-0">
			{/* navbar */}
			<div className="flex flex-row justify-between items-center mb-8 mx-4">
				<Link to="/" className="flex flex-row items-center gap-3 w-fit">
					<img src="/fireplace.svg" alt="" className="h-10" />
					<span className="font-viking text-3xl">Gatherr</span>
				</Link>
				<UserButton />
			</div>
			{/* event title */}
			<ScrollFadeIn from="left" className="mb-12 mx-4">
				<div className="flex flex-row items-start justify-between gap-3 mb-2">
					<p className="text-3xl font-viking break-words min-w-0">{event.details.name}</p>
					{me && event.details.creatorId === me.id && (
						<Button
							size="xs"
							variant="gray"
							className="shrink-0"
							onClick={() => setIsEditOpen(true)}
						>
							<Pencil className="size-4 mr-2" />
							{m.event_edit()}
						</Button>
					)}
				</div>
				{event.details.description && (
					<p className="text-info mb-3 whitespace-pre-line break-words">
						{event.details.description}
					</p>
				)}
				{event.details.confirmedStart && event.details.confirmedEnd && (
					<ConfirmedTime
						confirmedStart={event.details.confirmedStart}
						confirmedEnd={event.details.confirmedEnd}
						eventTimezone={event.details.timezone ?? "UTC"}
					/>
				)}
				{event.details.timeRoundDate && (
					<div
						data-testid="time-round-date"
						className="flex flex-row items-center gap-3 p-4 mb-3 rounded-xl bg-canvas"
					>
						<ClockIcon className="size-6 shrink-0 text-primary" />
						<div>
							<p className="text-sm text-info">{m.event_time_round_title()}</p>
							<p className="text-lg font-semibold">
								{format(new Date(`${event.details.timeRoundDate}T00:00:00`), "EEEE d MMMM", {
									locale: dateFnsLocale,
								})}
							</p>
						</div>
					</div>
				)}
				<ShareLinkPanel
					shortId={shortId}
					eventName={event.details.name ?? ""}
					className="max-w-md"
				/>
			</ScrollFadeIn>
			<EditEventDialog
				shortId={shortId}
				name={event.details.name ?? ""}
				description={event.details.description ?? ""}
				open={isEditOpen}
				onOpenChange={setIsEditOpen}
			/>
			<ShareEventDialog
				shortId={shortId}
				eventName={event.details.name ?? ""}
				open={!!fromCreate}
				onOpenChange={open => !open && closeSharePrompt()}
			/>
			{/* welcome */}
			{me ? (
				// <div className="p-4 mb-12 rounded-2xl bg-linear-to-tr from-primary from-5% to-secondary">
				// 	<p className="text-sm">Welcome, {me?.name}! or sync with google.</p>
				// </div>
				<div></div>
			) : (
				<ScrollFadeIn
					from="right"
					className="bg-canvas rounded-2xl p-8 flex flex-col items-center mb-8"
				>
					<p className="text-2xl mb-8">{m.event_sign_in_title()}</p>
					<div className="mb-8">
						<Button onClick={handleLogin} className="px-8">
							<GoogleIcon className="size-8 mr-3" />
							{m.create_continue_with_google()}
						</Button>
					</div>
					<p className="text-info text-center">{m.create_google_calendar_hint_1()}</p>
					<p className="text-info text-center -mt-1">{m.create_google_calendar_hint_2()}</p>
					<div className="flex flex-row gap-6 mt-4">
						<Link to="/privacy" className="text-info text-sm underline">
							{m.footer_privacy()}
						</Link>
						<Link to="/terms" className="text-info text-sm underline">
							{m.footer_terms()}
						</Link>
					</div>
				</ScrollFadeIn>
			)}

			{/* participants */}
			<ScrollFadeIn from="left" className="mb-12">
				<div className="flex flex-row items-start mb-4">
					<GradientIcon icon={UsersRound} className="size-6 mr-2.5" />
					<div className="flex flex-row justify-between">
						<div>
							<p className="text-xl">{m.event_participants_title()}</p>
							<p className="text-info text-sm">{m.event_participants_text()}</p>
						</div>
						{isLoading ? (
							<Skeleton className="h-7 w-6 ml-6" />
						) : (
							<p className="text-xl ml-6">{event?.summary.users?.length}</p>
						)}
					</div>
				</div>
				<div className="bg-canvas p-5 rounded-2xl space-y-4">
					{isLoading ? (
						// biome-ignore lint/complexity/noUselessFragments: <this is needed>
						<>
							{[...Array(3)].map((_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: <this is just skeleton>
								<div key={i} className="flex flex-row">
									<Skeleton className="size-8 rounded-full mr-3 shrink-0" />
									<div className="flex flex-col gap-1">
										<Skeleton className="h-7 w-32" />
										<Skeleton className="h-4 w-20" />
									</div>
								</div>
							))}
						</>
					) : (
						event?.summary.users?.map(({ user, available }) => (
							<div key={user?.id} className="flex flex-row">
								<div className="mr-3">
									{user?.profilePicture ? (
										<img src={user.profilePicture} alt="PP" className="rounded-full size-8" />
									) : (
										<div className="bg-linear-to-tr from-primary from-5% to-secondary rounded-full size-8 flex items-center justify-center">
											<p>{user?.name?.slice(0, 1)}</p>
										</div>
									)}
								</div>
								<div>
									<p className="text-xl">{user?.name}</p>
									<p className="text-sm text-info">
										{isTrip
											? m.event_trip_answers({ count: available?.length ?? 0 })
											: m.event_time_slots({ count: available?.length ?? 0 })}
									</p>
								</div>
							</div>
						))
					)}
				</div>
			</ScrollFadeIn>

			{/* heatmap info */}
			{isTrip ? null : isLoading ? (
				<Skeleton className="h-12 w-full" />
			) : (
				<ScrollFadeIn from="right" className="mb-12 flex flex-row font-semibold">
					<p className="flex-nowrap shrink-0 mr-2 font-number">
						0 / {event?.summary.users?.length} {m.event_heatmap_info()}
					</p>
					{[...Array(event?.summary.users?.length! + 1)].map((_, count) => (
						<div
							key={count}
							className={cn(
								"rounded-lg w-full text-center",
								count === 0 ? "bg-paint" : "bg-primary",
								count === event?.summary.users?.length &&
									"border border-amber-300 shadow-sm shadow-amber-300",
							)}
							style={{
								opacity: count > 0 ? count / (event?.summary.users?.length || 1) : 1,
							}}
						>
							<p className="font-number">{count}</p>
						</div>
					))}
					<p className="flex-nowrap shrink-0 ml-2 font-number">
						{event?.summary.users?.length} / {event?.summary.users?.length} {m.event_heatmap_info()}
					</p>
				</ScrollFadeIn>
			)}

			{event.summary.dateRound && <DayVotes dateRound={event.summary.dateRound} />}

			{isTrip ? (
				<TripVotes
					shortId={shortId}
					selectedSlots={selectedSlots}
					setSelectedSlots={setSelectedSlots}
					onSave={handleSave}
					isSaving={isSaving}
				/>
			) : (
				<HeatmapTabs
					shortId={shortId}
					selectedSlots={selectedSlots}
					setSelectedSlots={setSelectedSlots}
					onSave={handleSave}
					isSaving={isSaving}
				/>
			)}
		</main>
	);
}

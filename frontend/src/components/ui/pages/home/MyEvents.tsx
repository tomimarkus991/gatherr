/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
import { Link } from "@tanstack/react-router";
import { EllipsisIcon, LogOutIcon, PencilIcon, Trash2Icon } from "lucide-react";
import toast from "react-hot-toast";
import { useDeleteEvent } from "../../../../hooks/mutation/useDeleteEvent";
import { useLeaveEvent } from "../../../../hooks/mutation/useLeaveEvent";
import { useGetMe } from "../../../../hooks/query/useGetMe";
import { useGetMyEvents } from "../../../../hooks/query/useGetMyEvents";
import { cn } from "../../../../lib/utils";
import { m } from "../../../../paraglide/messages";
import { ScrollFadeIn } from "../../../animations/ScrollFadeIn";
import { CopyLinkButton } from "../../CopyLinkButton";
import { Popover, PopoverContent, PopoverTrigger } from "../../popover";

/** The signed-in user's events; nothing without events (the home page shows the hero instead). */
export const MyEvents = () => {
	const { data: myEvents, isLoading } = useGetMyEvents();
	const { data: me } = useGetMe();
	const { mutate: deleteEvent } = useDeleteEvent();
	const { mutate: leaveEvent } = useLeaveEvent();
	const hasEvents = !!myEvents?.length && !isLoading;

	return (
		<>
			{hasEvents ? (
				<ScrollFadeIn
					from="right"
					className="flex flex-col space-y-4 bg-canvas rounded-xl px-6 py-6 mt-8 mx-4"
				>
					{myEvents.map(event => {
						const isCreator = me?.id === event.creatorId;

						return (
							<Link
								key={event.id}
								to="/e/$shortId"
								params={{ shortId: event.shortId ?? "" }}
								className="bg-paint p-3 rounded-xl"
							>
								<div className="flex flex-row justify-between items-center">
									<div className="flex flex-col">
										<p className="text-xl">{event.name}</p>
										<p className="text-info text-sm">
											{!event.respondedCount
												? m.home_event_waiting()
												: m.home_event_responded({ count: event.respondedCount })}
										</p>
									</div>

									<div
										className={cn(
											"rounded-3xl px-3 py-1 mt-1 text-xs font-semibold uppercase tracking-wide",
											isCreator ? "bg-secondary" : "bg-primary",
										)}
									>
										<span>{isCreator ? m.home_event_creator() : m.home_event_joined()}</span>
									</div>

									<div className="flex flex-col items-center" onClick={e => e.preventDefault()}>
										<Popover>
											<PopoverTrigger>
												<EllipsisIcon className="size-6 text-white mb-4 cursor-pointer" />
											</PopoverTrigger>
											<PopoverContent className="w-36 p-2 flex flex-col gap-1">
												<button
													type="button"
													className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-paint w-full text-sm cursor-pointer"
													onClick={() => toast(m.home_event_coming_soon())}
												>
													<PencilIcon className="size-4" />
													{m.home_event_update()}
												</button>
												{isCreator ? (
													<button
														type="button"
														className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-paint w-full text-sm text-red-400 cursor-pointer"
														onClick={() => deleteEvent(event.shortId ?? "")}
													>
														<Trash2Icon className="size-4" />
														{m.home_event_delete()}
													</button>
												) : (
													<button
														type="button"
														className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-paint w-full text-sm text-red-400 cursor-pointer"
														onClick={() => leaveEvent(event.shortId ?? "")}
													>
														<LogOutIcon className="size-4" />
														{m.home_event_leave()}
													</button>
												)}
											</PopoverContent>
										</Popover>
										<CopyLinkButton shortId={event.shortId ?? ""} className="px-2 py-1" />
									</div>
								</div>
							</Link>
						);
					})}
				</ScrollFadeIn>
			) : null}
		</>
	);
};

/** Where an event stands, for the home page event list. */
export type EventStatus = "decided" | "pickingTime" | "open";

type StatusFields = { confirmedStart?: string; round?: "DATE" | "TIME" };

/** Decided once the organiser confirmed a time; picking a time in a two-step event's time round; else open. */
export const eventStatus = (event: StatusFields): EventStatus => {
	if (event.confirmedStart) return "decided";
	if (event.round === "TIME") return "pickingTime";
	return "open";
};

/** "12 Nov" style creation date in the given locale, or null without a date. */
export const formatCreatedDate = (createdAt: string | undefined, locale: string) => {
	if (!createdAt) return null;
	const date = new Date(createdAt);
	if (Number.isNaN(date.getTime())) return null;
	return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(date);
};

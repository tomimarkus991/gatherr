export type EventType =
	| "SPECIFIC_DATES_AND_TIMES"
	| "SPECIFIC_DATES"
	| "WEEKDAYS"
	| "WEEKDAYS_AND_TIMES"
	/** Trip: slots are date ranges "DDMMYYYY-DDMMYYYY" (issue #148). */
	| "DATE_RANGES";

export interface User {
	id: number;
	name: string;
	email: string;
	profilePicture: string | null;
	timezone: string;
	startOnMonday: boolean;
	timeFormat24: boolean;
	language: string;
	createdAt: string; // ISO 8601
	updatedAt: string; // ISO 8601
}

export interface Event {
	id: number;
	name: string;
	description: string | null;
	shortId: string;
	creator: User;
	type: EventType;
	/** Format: "HHMM-DDMMYYYY", e.g. "0700-10032026" */
	times: string[];
	timeIncrement: number;
	timezone: string;
	isDeleted: boolean;
	respondedCount: number;
	/** Set by POST /events/:shortId/confirm, ISO 8601 */
	confirmedAt?: string;
	confirmedStart?: string;
	confirmedEnd?: string;
	/** Two-step events (#94): the date picked for the time round, "yyyy-MM-dd". Unset in the date round. */
	timeRoundDate?: string;
	/** The date round's dates ("DDMMYYYY"), kept once the time round starts. */
	dateTimes?: string[];
	/** Trip events: optional label and link per range key. */
	rangeDetails?: Record<string, { label?: string; link?: string }>;
	createdAt: string; // ISO 8601
	updatedAt: string; // ISO 8601
}

export interface SummarySlotUser {
	id: number;
	name: string;
}

export interface SummarySlot {
	/** Format: "HHMM-DDMMYYYY", e.g. "0700-10032026" */
	slot: string;
	count: number;
	users: SummarySlotUser[];
}

export interface SummaryUserResponse {
	user: Pick<User, "id" | "name" | "profilePicture">;
	available: string[];
	notAvailable: string[];
}

export interface SummaryResponse {
	users: SummaryUserResponse[];
	slots: SummarySlot[];
	/** Set once the time round has started: the date round's votes, read-only. */
	dateRound: { respondentCount: number; slots: SummarySlot[] } | null;
}

export interface EventUser {
	id: number;
	event: Pick<Event, "id" | "shortId" | "name">;
	user: Pick<User, "id" | "name" | "email" | "profilePicture">;
	available: string[];
	notAvailable: string[];
	/** Date-round answers, kept when the time round starts. */
	dateAvailable?: string[];
	dateNotAvailable?: string[];
	createdAt: string; // ISO 8601
	updatedAt: string; // ISO 8601
}

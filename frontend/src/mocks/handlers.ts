import { addDays, format } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { HttpResponse, http } from "msw";
import type { components } from "../api/types.gen";
import { parseSlot, WEEKDAYS } from "../lib/timezone";
import {
	busyCalendarsFor,
	CALENDARS,
	EVENT_USERS,
	EVENTS,
	isCalendarConnected,
	ME,
	makeEventUser,
	setCalendarConnected,
	shortId,
	USERS,
} from "./data";
import type {
	Event,
	EventUser,
	SummaryResponse,
	SummarySlot,
	SummaryUserResponse,
	User,
} from "./types";

type CalendarListDto = components["schemas"]["CalendarListDto"];
type BusySlotsDto = components["schemas"]["BusySlotsDto"];
type ConfirmEventDto = components["schemas"]["ConfirmEventDto"];
type StartTimeRoundDto = components["schemas"]["StartTimeRoundDto"];

const BASE = "/api/v1";

/**
 * Start and end of a confirmed slot, like the backend's SlotTimes: a timed slot lasts one time
 * increment, a slot without a time is the whole day. Weekday slots use the next such weekday,
 * today included unless a timed slot has already started. Null if the slot is malformed.
 */
function confirmedRange(event: Event, slot: string): { start: string; end: string } | null {
	const { time, day } = parseSlot(slot);
	const now = new Date();
	let date: string;
	if (/^\d{8}$/.test(day)) {
		date = `${day.slice(4, 8)}-${day.slice(2, 4)}-${day.slice(0, 2)}`;
	} else {
		const target = WEEKDAYS.indexOf(day as (typeof WEEKDAYS)[number]);
		if (target === -1) return null;
		const today = (Number(formatInTimeZone(now, event.timezone, "i")) + 6) % 7;
		const todayDate = new Date(`${formatInTimeZone(now, event.timezone, "yyyy-MM-dd")}T00:00:00`);
		date = format(addDays(todayDate, (target - today + 7) % 7), "yyyy-MM-dd");
		if (
			time &&
			fromZonedTime(`${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:00`, event.timezone) < now
		) {
			date = format(addDays(new Date(`${date}T00:00:00`), 7), "yyyy-MM-dd");
		}
	}
	if (time) {
		const start = fromZonedTime(
			`${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:00`,
			event.timezone,
		);
		const end = new Date(start.getTime() + event.timeIncrement * 60_000);
		return { start: start.toISOString(), end: end.toISOString() };
	}
	const start = fromZonedTime(`${date}T00:00:00`, event.timezone);
	const nextDay = format(addDays(new Date(`${date}T00:00:00`), 1), "yyyy-MM-dd");
	return {
		start: start.toISOString(),
		end: fromZonedTime(`${nextDay}T00:00:00`, event.timezone).toISOString(),
	};
}

/**
 * FETCH EXAMPLES
  // GET /users/me
  fetch('/api/v1/users/me').then(r => r.json()).then(console.log)

  // PATCH /users/me
  fetch('/api/v1/users/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language:
  'ET', timezone: 'UTC' }) }).then(r => r.json()).then(console.log)

  // GET /events/mine
  fetch('/api/v1/events/mine').then(r => r.json()).then(console.log)

  // POST /events
  fetch('/api/v1/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Test
  Event', type: 'SPECIFIC_DATES', times: ['0900-25032026', '0930-25032026'], timeIncrement: 30, timezone: 'Europe/Tallinn' })
  }).then(r => r.json()).then(console.log)

  // GET /events/:shortId  — first grab a shortId from /events/mine, then:
  fetch('/api/v1/events/mine').then(r => r.json()).then(events => fetch(`/api/v1/events/${events[0].shortId}`).then(r =>
  r.json()).then(console.log))

  fetch(`/api/v1/events/cozy-hot-toast-HmYXfuih`).then(r => r.json()).then(console.log)

  // PATCH /events/:shortId
  fetch('/api/v1/events/mine').then(r => r.json()).then(events => fetch(`/api/v1/events/${events[0].shortId}`, { method: 'PATCH',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Renamed Event' }) }).then(r =>
  r.json()).then(console.log))

  // PUT /events/:shortId/respond
  fetch('/api/v1/events/mine').then(r => r.json()).then(events => fetch(`/api/v1/events/${events[0].shortId}/respond`, { method:
  'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ available: ['0900-25032026', '0930-25032026'],
  notAvailable: ['1000-25032026'] }) }).then(r => r.json()).then(console.log))

  // GET /events/:shortId/summary
  fetch('/api/v1/events/mine').then(r => r.json()).then(events => fetch(`/api/v1/events/${events[0].shortId}/summary`).then(r =>
  r.json()).then(console.log))

  // DELETE /events/:shortId
  fetch('/api/v1/events/mine').then(r => r.json()).then(events => fetch(`/api/v1/events/${events[0].shortId}`, { method: 'DELETE'
  }).then(r => console.log('deleted, status:', r.status)))
 */

/** Like Event.getRound(): TIME once a date is picked, DATE for a dates-only event, else none. */
const roundOf = (event: Event) =>
	event.timeRoundDate ? "TIME" : event.type === "SPECIFIC_DATES" ? "DATE" : undefined;

/** The API returns the creator as `creatorId` (EventResponseDto), not the nested user. */
const toEventDto = (event: Event) => ({
	...event,
	creatorId: event.creator.id,
	round: roundOf(event),
});

/** Heatmap slots for `times`: who marked each one available. */
function slotSummaries(
	times: string[],
	answers: { user: { id: number; name: string }; available: string[] }[],
) {
	return times.map(slot => {
		const users = answers
			.filter(answer => answer.available.includes(slot))
			.map(answer => ({ id: answer.user.id, name: answer.user.name }));
		return { slot, count: users.length, users } satisfies SummarySlot;
	});
}

/** "HH:mm" to minutes after midnight, or null if malformed. */
function minutesOf(time: string): number | null {
	const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
	return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

// ── Auth state ───────────────────────────────────────────────────────────────
let activeUser: User = ME;

// IMPORTANT: MSW matches handlers in registration order.
// Specific paths (mine, summary, respond) MUST be registered before the
// generic /:shortId handler, or they'll be shadowed by the param matcher.
export const handlers = [
	// ── POST /auth/google ─────────────────────────────────────────────────────
	// The Google access token "mock-google-<id>" signs in as that mock user (e2e/fixtures.ts); any
	// other token signs in as ME.
	http.post(`${BASE}/auth/google`, async ({ request }) => {
		const { accessToken } = (await request.json()) as { accessToken?: string };
		const id = Number(accessToken?.match(/^mock-google-(\d+)$/)?.[1]);
		activeUser = USERS.find(user => user.id === id) ?? ME;
		return HttpResponse.json({
			token: "mock-token",
			id: activeUser.id,
			name: activeUser.name,
			email: activeUser.email,
			profilePicture: activeUser.profilePicture,
		});
	}),

	// ── GET /stats ────────────────────────────────────────────────────────────
	// Public: counts every event ever created, soft-deleted ones included.
	http.get(`${BASE}/stats`, () => {
		return HttpResponse.json({ totalEvents: EVENTS.length });
	}),

	// ── GET /users/me ─────────────────────────────────────────────────────────
	http.get(`${BASE}/users/me`, ({ request }) => {
		const auth = request.headers.get("Authorization");
		// Like the API: no token, no user. Signing out only drops the token, so this must not be sticky.
		if (auth !== "Bearer mock-token") return new HttpResponse(null, { status: 401 });
		return HttpResponse.json(activeUser);
	}),

	// ── Google Calendar ───────────────────────────────────────────────────────
	// Not connected until the user goes through the connect step (403, like the backend).
	http.get(`${BASE}/auth/google/calendar/url`, ({ request }) => {
		// The real flow goes Google → backend → /calendar-connect, which returns to the event page.
		setCalendarConnected(true);
		return HttpResponse.json({ url: new URL("/calendar-connect?success=true", request.url).href });
	}),

	http.get(`${BASE}/users/me/calendars`, () => {
		if (!isCalendarConnected()) return new HttpResponse(null, { status: 403 });
		return HttpResponse.json({
			calendars: CALENDARS.map(({ id, summary }) => ({ id, summary })),
		} satisfies CalendarListDto);
	}),

	http.delete(`${BASE}/users/me/calendars`, () => {
		setCalendarConnected(false);
		return new HttpResponse(null, { status: 204 });
	}),

	http.get(`${BASE}/events/:shortId/calendar-busy`, ({ params, request }) => {
		if (!isCalendarConnected()) return new HttpResponse(null, { status: 403 });
		const event = EVENTS.find(e => e.shortId === params.shortId && !e.isDeleted);
		if (!event) return new HttpResponse(null, { status: 404 });
		// axios sends an array as calendarIds[]=a&calendarIds[]=b; Spring also takes calendarIds=a,b.
		const { searchParams } = new URL(request.url);
		const calendarIds = [
			...searchParams.getAll("calendarIds"),
			...searchParams.getAll("calendarIds[]"),
		]
			.flatMap(value => value.split(","))
			.filter(Boolean);
		// Each mock calendar is busy for whole hours, so a busy slot's period is the hour it starts in.
		const busy = busyCalendarsFor(event, calendarIds);
		const busyDetails = [...busy].flatMap(([slot, calendars]) => {
			const range = confirmedRange(event, slot);
			if (!range) return [];
			const minutes = Number.parseInt(slot.slice(2, 4), 10);
			const start = new Date(new Date(range.start).getTime() - minutes * 60_000);
			const end = new Date(start.getTime() + 60 * 60_000);
			return [{ slot, calendars, start: start.toISOString(), end: end.toISOString() }];
		});
		return HttpResponse.json({
			busySlots: [...busy.keys()],
			busyDetails,
		} satisfies BusySlotsDto);
	}),

	// ── PATCH /users/me ───────────────────────────────────────────────────────
	http.patch(`${BASE}/users/me`, async ({ request }) => {
		const body = (await request.json()) as Partial<User>;
		Object.assign(activeUser, body, { updatedAt: new Date().toISOString() });
		return HttpResponse.json(activeUser);
	}),

	// ── GET /events/mine /:shortId ───────────────────────────────────
	http.get(`${BASE}/events/mine`, ({ request }) => {
		const auth = request.headers.get("Authorization");
		if (auth !== "Bearer mock-token") return new HttpResponse(null, { status: 401 });
		const myEventIds = new Set(
			EVENT_USERS.filter(eu => eu.user.id === activeUser.id).map(eu => eu.event.id),
		);
		const mine = EVENTS.filter(e => myEventIds.has(e.id) && !e.isDeleted);
		return HttpResponse.json(mine);
	}),
	// ── GET /events/:shortId/summary ──────────────────────
	http.get(`${BASE}/events/:shortId/summary`, ({ params }) => {
		const event = EVENTS.find(e => e.shortId === params.shortId && !e.isDeleted);
		if (!event) return new HttpResponse(null, { status: 404 });

		const userResponses = EVENT_USERS.filter(eu => eu.event.shortId === params.shortId);

		const heatMap: Record<string, { count: number; users: { id: number; name: string }[] }> = {};
		const users = userResponses.map(user => {
			return {
				available: user.available,
				notAvailable: user.notAvailable,
				user: {
					id: user.user.id,
					name: user.user.name,
					profilePicture: user.user.profilePicture,
				},
			} satisfies SummaryUserResponse;
		});

		for (const user of userResponses) {
			for (const availability of user.available) {
				heatMap[availability] = {
					count: (heatMap[availability]?.count ?? 0) + 1,
					users: [
						...(heatMap[availability]?.users ?? []),
						{ id: user.user.id, name: user.user.name },
					],
				};
			}
		}

		const slots: SummarySlot[] = Object.keys(heatMap).map(slot => {
			const count = heatMap[slot].count;
			const users = heatMap[slot].users;
			return {
				slot,
				count,
				users,
			};
		});

		const dateRound =
			event.timeRoundDate && event.dateTimes
				? {
						respondentCount: userResponses.filter(eu => eu.dateAvailable || eu.dateNotAvailable)
							.length,
						slots: slotSummaries(
							event.dateTimes,
							userResponses.map(eu => ({ user: eu.user, available: eu.dateAvailable ?? [] })),
						),
					}
				: null;

		const responseWithHeatmap: SummaryResponse = {
			users,
			slots,
			dateRound,
		};

		return HttpResponse.json(responseWithHeatmap);
	}),

	// ── PUT /events/:shortId/respond ──────────────────────
	http.put(`${BASE}/events/:shortId/respond`, async ({ params, request }) => {
		const event = EVENTS.find(e => e.shortId === params.shortId && !e.isDeleted);
		if (!event) return new HttpResponse(null, { status: 404 });

		const body = (await request.json()) as {
			available: string[];
			notAvailable: string[];
		};
		const existing = EVENT_USERS.find(
			eu => eu.event.shortId === params.shortId && eu.user.id === activeUser.id,
		);

		if (existing) {
			existing.available = body.available;
			existing.notAvailable = body.notAvailable;
			existing.updatedAt = new Date().toISOString();
			return HttpResponse.json(existing);
		}

		const newEu: EventUser = {
			id: EVENT_USERS.length + 1,
			event: { id: event.id, shortId: event.shortId, name: event.name },
			user: {
				id: activeUser.id,
				name: activeUser.name,
				email: activeUser.email,
				profilePicture: activeUser.profilePicture,
			},
			available: body.available,
			notAvailable: body.notAvailable,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		EVENT_USERS.push(newEu);
		return HttpResponse.json(newEu, { status: 201 });
	}),

	// ── POST /events/:shortId/confirm ─────────────────────
	http.post(`${BASE}/events/:shortId/confirm`, async ({ params, request }) => {
		const event = EVENTS.find(e => e.shortId === params.shortId && !e.isDeleted);
		if (!event) return new HttpResponse(null, { status: 404 });
		if (event.creator.id !== activeUser.id) return new HttpResponse(null, { status: 403 });
		const { slot } = (await request.json()) as ConfirmEventDto;
		const range = event.times.includes(slot) ? confirmedRange(event, slot) : null;
		if (!range) return new HttpResponse(null, { status: 400 });
		const now = new Date().toISOString();
		Object.assign(event, {
			confirmedAt: now,
			confirmedStart: range.start,
			confirmedEnd: range.end,
			updatedAt: now,
		});
		return HttpResponse.json(event);
	}),

	// ── POST /events/:shortId/time-round ──────────────────
	// Like EventService.startTimeRound: one way, date answers kept, time answers start empty.
	http.post(`${BASE}/events/:shortId/time-round`, async ({ params, request }) => {
		const event = EVENTS.find(e => e.shortId === params.shortId && !e.isDeleted);
		if (!event) return new HttpResponse(null, { status: 404 });
		if (event.creator.id !== activeUser.id) return new HttpResponse(null, { status: 403 });
		const { date, startTime, endTime, timeIncrement } = (await request.json()) as StartTimeRoundDto;
		const start = minutesOf(startTime);
		const end = minutesOf(endTime);
		if (
			roundOf(event) !== "DATE" ||
			!event.times.includes(date) ||
			![15, 30, 60].includes(timeIncrement) ||
			start === null ||
			end === null ||
			start >= end
		) {
			return new HttpResponse(null, { status: 400 });
		}
		const times: string[] = [];
		for (let minute = start; minute <= end; minute += timeIncrement) {
			const hh = String(Math.floor(minute / 60)).padStart(2, "0");
			const mm = String(minute % 60).padStart(2, "0");
			times.push(`${hh}${mm}-${date}`);
		}
		Object.assign(event, {
			dateTimes: event.times,
			times,
			type: "SPECIFIC_DATES_AND_TIMES",
			timeIncrement,
			timeRoundDate: `${date.slice(4, 8)}-${date.slice(2, 4)}-${date.slice(0, 2)}`,
			updatedAt: new Date().toISOString(),
		});
		for (const answer of EVENT_USERS.filter(eu => eu.event.shortId === event.shortId)) {
			answer.dateAvailable = answer.available;
			answer.dateNotAvailable = answer.notAvailable;
			answer.available = [];
			answer.notAvailable = [];
		}
		return HttpResponse.json(toEventDto(event));
	}),

	// ── POST /events ──────────────────────────────────────────────────────────
	http.post(`${BASE}/events`, async ({ request }) => {
		const body = (await request.json()) as Partial<Event>;
		const newEvent: Event = {
			id: EVENTS.length + 1,
			name: body.name ?? "New Event",
			description: body.description ?? null,
			shortId: shortId(),
			creator: activeUser,
			type: body.type ?? "SPECIFIC_DATES",
			times: body.times ?? [],
			timeIncrement: body.timeIncrement ?? 30,
			timezone: body.timezone ?? ME.timezone,
			isDeleted: false,
			respondedCount: 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		EVENTS.push(newEvent);
		EVENT_USERS.push(
			makeEventUser(EVENT_USERS.length + 1, newEvent, activeUser, {
				available: [],
				notAvailable: [],
			}),
		);
		return HttpResponse.json(newEvent, { status: 201 });
	}),

	// ── GET /events/:shortId ──────────────────────────────────────────────────
	http.get(`${BASE}/events/:shortId`, ({ params }) => {
		const event = EVENTS.find(e => e.shortId === params.shortId && !e.isDeleted);
		if (!event) return new HttpResponse(null, { status: 404 });
		return HttpResponse.json(toEventDto(event));
	}),

	// ── PATCH /events/:shortId ────────────────────────────────────────────────
	http.patch(`${BASE}/events/:shortId`, async ({ params, request }) => {
		const event = EVENTS.find(e => e.shortId === params.shortId && !e.isDeleted);
		if (!event) return new HttpResponse(null, { status: 404 });
		const body = (await request.json()) as Partial<Event>;
		Object.assign(event, body, { updatedAt: new Date().toISOString() });
		return HttpResponse.json(toEventDto(event));
	}),

	// ── DELETE /events/:shortId/respond (leave) ───────────────────────────────
	http.delete(`${BASE}/events/:shortId/respond`, ({ params }) => {
		const event = EVENTS.find(e => e.shortId === params.shortId && !e.isDeleted);
		if (!event) return new HttpResponse(null, { status: 404 });
		if (event.creator.id === activeUser.id) return new HttpResponse(null, { status: 403 });
		const index = EVENT_USERS.findIndex(
			eu => eu.event.shortId === params.shortId && eu.user.id === activeUser.id,
		);
		if (index !== -1) EVENT_USERS.splice(index, 1);
		return new HttpResponse(null, { status: 204 });
	}),

	// ── DELETE /events/:shortId ───────────────────────────────────────────────
	http.delete(`${BASE}/events/:shortId`, ({ params }) => {
		const event = EVENTS.find(e => e.shortId === params.shortId);
		if (!event) return new HttpResponse(null, { status: 404 });
		event.isDeleted = true;
		event.updatedAt = new Date().toISOString();
		return new HttpResponse(null, { status: 204 });
	}),
];

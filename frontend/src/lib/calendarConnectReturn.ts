// Connecting Google Calendar is a full-page round trip (event page → Google → backend →
// /calendar-connect), so the event page path is kept in sessionStorage to return to it.
const KEY = "calendarConnectReturnTo";

export function rememberCalendarConnectReturn(path: string) {
	try {
		sessionStorage.setItem(KEY, path);
	} catch {
		// Storage blocked: the connect page falls back to the home page.
	}
}

/**
 * The remembered event page path, or "/" if none or if it isn't an event page. Not cleared on
 * read (React StrictMode runs effects twice); the next connect overwrites it.
 */
export function readCalendarConnectReturn(): string {
	try {
		const path = sessionStorage.getItem(KEY);
		return path?.startsWith("/e/") ? path : "/";
	} catch {
		return "/";
	}
}

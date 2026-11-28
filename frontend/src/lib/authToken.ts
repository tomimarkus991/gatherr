import { useSyncExternalStore } from "react";

const KEY = "token";
const listeners = new Set<() => void>();

/** The API JWT kept in localStorage, or null when signed out (and during SSR). */
export const getToken = () => (typeof window === "undefined" ? null : localStorage.getItem(KEY));

/** Stores or clears the token and re-renders every component that reads it through `useToken`. */
export const setToken = (token: string | null) => {
	if (token) localStorage.setItem(KEY, token);
	else localStorage.removeItem(KEY);
	for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};

/**
 * The token as React state. Queries gate `enabled` on this rather than on a localStorage read at
 * render time: the React Compiler memoizes the query options, so such a read is never repeated.
 */
export const useToken = () => useSyncExternalStore(subscribe, getToken, () => null);

import toast from "react-hot-toast";
import * as m from "../paraglide/messages";

/** The public link to an event, without query string. */
export const eventUrl = (shortId: string) => `${window.location.origin}/e/${shortId}`;

/** Copies the event link and shows the "Link copied!" toast. */
export const copyEventLink = (shortId: string) => {
	navigator.clipboard?.writeText(eventUrl(shortId)).catch(() => {});
	toast.success(m.copy_link_copied(), { id: "copy-link" });
};

/** Opens the share sheet for an event link, or copies the link and shows a toast where sharing is unavailable. */
export const shareEventLink = (shortId: string, title?: string) => {
	const url = eventUrl(shortId);
	const fallback = () => copyEventLink(shortId);
	if (navigator.share) {
		navigator.share(title ? { url, title } : { url }).catch(fallback);
	} else {
		fallback();
	}
};

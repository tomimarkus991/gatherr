import toast from "react-hot-toast";
import * as m from "../paraglide/messages";

/** Opens the share sheet for an event link, or copies the link and shows a toast where sharing is unavailable. */
export const shareEventLink = (shortId: string, title?: string) => {
	const url = `${window.location.origin}/e/${shortId}`;
	const fallback = () => {
		navigator.clipboard?.writeText(url).catch(() => {});
		toast.success(m.copy_link_copied(), { id: "copy-link" });
	};
	if (navigator.share) {
		navigator.share(title ? { url, title } : { url }).catch(fallback);
	} else {
		fallback();
	}
};

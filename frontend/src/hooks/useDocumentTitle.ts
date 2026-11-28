import { useEffect } from "react";
import { SITE_TITLE } from "../lib/site";

/** "Name · Gatherr" in the browser tab while `name` is set; back to "Gatherr" on unmount. */
export const useDocumentTitle = (name: string | undefined) => {
	useEffect(() => {
		if (!name) return;
		document.title = `${name} · ${SITE_TITLE}`;
		return () => {
			document.title = SITE_TITLE;
		};
	}, [name]);
};

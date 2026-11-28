import { LinkIcon } from "lucide-react";
import { shareEventLink } from "../../lib/shareEventLink";
import { cn } from "../../lib/utils";
import * as m from "../../paraglide/messages";
import { Button } from "./button";

interface Props {
	shortId: string;
	className?: string;
	text?: boolean;
}

export const CopyLinkButton = ({ shortId, className, text }: Props) => {
	return (
		<Button size="xs" className={className} onClick={() => shareEventLink(shortId)}>
			<LinkIcon className={cn("size-4", text && "mr-2")} />
			{text ? m.share_link() : ""}
		</Button>
	);
};

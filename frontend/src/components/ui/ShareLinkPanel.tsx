import { Copy, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { copyEventLink, eventUrl, shareEventLink } from "../../lib/shareEventLink";
import { cn } from "../../lib/utils";
import { m } from "../../paraglide/messages";
import { MessengerIcon, TelegramIcon, WhatsAppIcon } from "../icons/ShareAppIcons";
import { Button, buttonVariants } from "./button";

interface Props {
	shortId: string;
	eventName: string;
	className?: string;
}

/** A phone: the Web Share API exists and the main pointer is a finger. Desktop browsers with share stay copy-only. */
const isPhone = () =>
	typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches;

/** The event link as text with a copy button; on phones also the share sheet and WhatsApp, Telegram and Messenger. */
export const ShareLinkPanel = ({ shortId, eventName, className }: Props) => {
	const [phone, setPhone] = useState(false);
	useEffect(() => setPhone(isPhone()), []);

	const url = eventUrl(shortId);
	const enc = encodeURIComponent;
	const apps = [
		{
			label: m.share_whatsapp(),
			href: `https://wa.me/?text=${enc(`${eventName} ${url}`)}`,
			Icon: WhatsAppIcon,
		},
		{
			label: m.share_telegram(),
			href: `https://t.me/share/url?url=${enc(url)}&text=${enc(eventName)}`,
			Icon: TelegramIcon,
		},
		{
			label: m.share_messenger(),
			href: `fb-messenger://share?link=${enc(url)}`,
			Icon: MessengerIcon,
		},
	];

	return (
		<div className={cn("flex flex-col gap-3 w-full min-w-0", className)}>
			<div className="flex items-center gap-2 rounded-xl bg-canvas py-1 pl-4 pr-1 min-w-0">
				<span className="flex-1 min-w-0 truncate text-sm">{url.replace(/^https?:\/\//, "")}</span>
				<Button
					size="small"
					aria-label={m.share_copy_link()}
					onClick={() => copyEventLink(shortId)}
				>
					<Copy className="size-4" />
				</Button>
			</div>
			{phone && (
				<div className="flex flex-wrap items-center gap-2">
					<Button size="xs" onClick={() => shareEventLink(shortId, eventName)}>
						<Share2 className="size-4 mr-2" />
						{m.share_dialog_button()}
					</Button>
					{apps.map(({ label, href, Icon }) => (
						<a
							key={label}
							href={href}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={label}
							className={buttonVariants({ variant: "gray", size: "small" })}
						>
							<Icon className="size-6" />
						</a>
					))}
				</div>
			)}
		</div>
	);
};

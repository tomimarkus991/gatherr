import { m } from "../../../../paraglide/messages";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../dialog";
import { ShareLinkPanel } from "../../ShareLinkPanel";

interface Props {
	shortId: string;
	eventName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export const ShareEventDialog = ({ shortId, eventName, open, onOpenChange }: Props) => (
	<Dialog open={open} onOpenChange={onOpenChange}>
		<DialogContent
			className="w-[calc(100%-2rem)] max-w-sm"
			showCloseButton
			aria-describedby={undefined}
		>
			<DialogHeader className="min-w-0">
				<img src="/fireplace.svg" alt="" className="h-32 mb-6" />
				<DialogTitle className="font-medium text-2xl text-center mb-6">
					{m.share_dialog_title()}
				</DialogTitle>
				<ShareLinkPanel shortId={shortId} eventName={eventName} />
			</DialogHeader>
		</DialogContent>
	</Dialog>
);

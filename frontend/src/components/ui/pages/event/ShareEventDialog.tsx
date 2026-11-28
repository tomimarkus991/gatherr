import { shareEventLink } from "../../../../lib/shareEventLink";
import { m } from "../../../../paraglide/messages";
import { Button } from "../../button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../dialog";

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
			<DialogHeader>
				<img src="/fireplace.svg" alt="" className="h-32 mb-6" />
				<DialogTitle className="font-medium text-2xl text-center mb-6">
					{m.share_dialog_title()}
				</DialogTitle>
				<Button onClick={() => shareEventLink(shortId, eventName)} className="px-8">
					{m.share_dialog_button()}
				</Button>
			</DialogHeader>
		</DialogContent>
	</Dialog>
);

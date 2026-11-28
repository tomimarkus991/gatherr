import { type FormEvent, useEffect, useId, useState } from "react";
import { useUpdateEvent } from "../../../../hooks/mutation/useUpdateEvent";
import { m } from "../../../../paraglide/messages";
import { Button } from "../../button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../dialog";
import { Input } from "../../input";
import { Label } from "../../label";
import { Textarea } from "../../textarea";

interface Props {
	shortId: string;
	name: string;
	description: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export const EditEventDialog = ({ shortId, name, description, open, onOpenChange }: Props) => {
	const { mutate: updateEvent, isPending } = useUpdateEvent();
	const nameId = useId();
	const descriptionId = useId();
	const [draftName, setDraftName] = useState(name);
	const [draftDescription, setDraftDescription] = useState(description);

	// Prefill with the current values every time the dialog opens.
	useEffect(() => {
		if (open) {
			setDraftName(name);
			setDraftDescription(description);
		}
	}, [open, name, description]);

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		updateEvent(
			{ shortId, data: { name: draftName.trim(), description: draftDescription.trim() } },
			{ onSuccess: () => onOpenChange(false) },
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="w-[calc(100%-2rem)] max-w-md"
				showCloseButton
				aria-describedby={undefined}
			>
				<DialogHeader>
					<DialogTitle className="font-medium text-2xl">{m.event_edit_title()}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor={nameId}>{m.event_edit_name()}</Label>
						<Input
							id={nameId}
							value={draftName}
							onChange={e => setDraftName(e.target.value)}
							required
						/>
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor={descriptionId}>{m.event_edit_description()}</Label>
						<Textarea
							id={descriptionId}
							value={draftDescription}
							onChange={e => setDraftDescription(e.target.value)}
							className="border-2 border-primary rounded-xl px-5 py-3 text-lg md:text-lg"
						/>
					</div>
					<Button type="submit" size="sm" disabled={isPending || !draftName.trim()}>
						{m.event_save()}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
};

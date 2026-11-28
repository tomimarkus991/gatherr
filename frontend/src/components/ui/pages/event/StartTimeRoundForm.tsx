import { isAxiosError } from "axios";
import { ClockIcon } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import toast from "react-hot-toast";
import { useStartTimeRound } from "../../../../hooks/mutation/useStartTimeRound";
import { m } from "../../../../paraglide/messages";
import { Button } from "../../button";
import { readableSlot } from "./ConfirmSlotButton";

interface Props {
	shortId: string;
	/** A date slot key of the event, e.g. "07122026". */
	date: string;
	onStarted: () => void;
}

const fieldClass = "w-full rounded-lg border-2 border-primary bg-canvas px-2 py-1 text-base";

/**
 * The organiser's "Pick a time for this date" action in a date-round heatmap slot (#94): a small
 * form for the time range that moves the event to its time round on that date. One way.
 */
export const StartTimeRoundForm = ({ shortId, date, onStarted }: Props) => {
	const { mutate: startTimeRound, isPending } = useStartTimeRound();
	const [isOpen, setIsOpen] = useState(false);
	const [startTime, setStartTime] = useState("18:00");
	const [endTime, setEndTime] = useState("21:00");
	const [timeIncrement, setTimeIncrement] = useState(30);
	const startId = useId();
	const endId = useId();
	const incrementId = useId();

	if (!isOpen) {
		return (
			<Button size="xs" variant="dark" className="mt-2 w-full" onClick={() => setIsOpen(true)}>
				<ClockIcon className="size-4 mr-2 shrink-0" />
				{m.event_time_round_pick()}
			</Button>
		);
	}

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		startTimeRound(
			{ shortId, date, startTime, endTime, timeIncrement },
			{
				onSuccess: () => {
					toast.success(m.event_time_round_success());
					onStarted();
				},
				onError: error => {
					const status = isAxiosError(error) ? error.response?.status : undefined;
					toast.error(status === 403 ? m.event_confirm_forbidden() : m.event_time_round_failed());
				},
			},
		);
	};

	return (
		<form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 text-left max-w-60">
			<div className="grid grid-cols-2 gap-2">
				<div>
					<label htmlFor={startId} className="text-sm text-info">
						{m.event_time_round_start_time()}
					</label>
					<input
						id={startId}
						type="time"
						required
						value={startTime}
						onChange={e => setStartTime(e.target.value)}
						className={fieldClass}
					/>
				</div>
				<div>
					<label htmlFor={endId} className="text-sm text-info">
						{m.event_time_round_end_time()}
					</label>
					<input
						id={endId}
						type="time"
						required
						value={endTime}
						onChange={e => setEndTime(e.target.value)}
						className={fieldClass}
					/>
				</div>
			</div>
			<div>
				<label htmlFor={incrementId} className="text-sm text-info">
					{m.event_time_round_increment()}
				</label>
				<select
					id={incrementId}
					value={timeIncrement}
					onChange={e => setTimeIncrement(Number(e.target.value))}
					className={fieldClass}
				>
					<option value={15}>15 min</option>
					<option value={30}>30 min</option>
					<option value={60}>60 min</option>
				</select>
			</div>
			<p className="text-xs text-info">{m.event_time_round_hint({ day: readableSlot(date) })}</p>
			<Button
				type="submit"
				size="xs"
				className="w-full"
				disabled={isPending || !startTime || !endTime || startTime >= endTime}
			>
				{m.event_time_round_start()}
			</Button>
		</form>
	);
};

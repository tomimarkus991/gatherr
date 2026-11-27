import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { GatherrApiClient } from "../../lib/axios";
import { m } from "../../paraglide/messages";

const mutationFn = async (shortId: string): Promise<void> => {
	await GatherrApiClient.delete(`/events/${shortId}/respond`);
};

export const useLeaveEvent = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn,
		onSuccess: (_data, shortId) => {
			toast.success(m.home_event_left());
			queryClient.invalidateQueries({ queryKey: ["/events/mine"] });
			queryClient.invalidateQueries({ queryKey: ["events", shortId] });
		},
	});
};

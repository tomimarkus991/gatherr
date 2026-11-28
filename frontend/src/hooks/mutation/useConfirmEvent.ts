import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { components } from "../../api/types.gen";
import { GatherrApiClient } from "../../lib/axios";

type EventResponseDto = components["schemas"]["EventResponseDto"];

interface ConfirmInput {
	shortId: string;
	/** An event slot key, e.g. "1900-13052026". */
	slot: string;
}

const mutationFn = async ({ shortId, slot }: ConfirmInput): Promise<EventResponseDto> => {
	const { data } = await GatherrApiClient.post<EventResponseDto>(`/events/${shortId}/confirm`, {
		slot,
	});
	return data;
};

export const useConfirmEvent = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn,
		onSuccess: (_, { shortId }) => {
			queryClient.invalidateQueries({ queryKey: ["events", shortId] });
			queryClient.invalidateQueries({ queryKey: ["/events/mine"] });
		},
	});
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { components } from "../../api/types.gen";
import { GatherrApiClient } from "../../lib/axios";

type EventResponseDto = components["schemas"]["EventResponseDto"];
type StartTimeRoundDto = components["schemas"]["StartTimeRoundDto"];

interface StartTimeRoundInput extends StartTimeRoundDto {
	shortId: string;
}

const mutationFn = async ({ shortId, ...body }: StartTimeRoundInput): Promise<EventResponseDto> => {
	const { data } = await GatherrApiClient.post<EventResponseDto>(
		`/events/${shortId}/time-round`,
		body,
	);
	return data;
};

/** Moves a dates-only event to its time round on one date (#94). One way. */
export const useStartTimeRound = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn,
		onSuccess: (_, { shortId }) => {
			queryClient.invalidateQueries({ queryKey: ["events", shortId] });
			queryClient.invalidateQueries({ queryKey: ["/events/mine"] });
		},
	});
};

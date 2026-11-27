import { useMutation } from "@tanstack/react-query";
import type { components } from "../../api/types.gen";
import { GatherrApiClient } from "../../lib/axios";

type BusySlotsDto = components["schemas"]["BusySlotsDto"];

interface Input {
	shortId: string;
	calendarIds: string[];
}

const mutationFn = async ({ shortId, calendarIds }: Input): Promise<BusySlotsDto> => {
	const { data } = await GatherrApiClient.get<BusySlotsDto>(`/events/${shortId}/calendar-busy`, {
		params: { calendarIds },
	});
	return data;
};

export const useGetBusySlots = () => useMutation({ mutationFn });

import { useQuery } from "@tanstack/react-query";
import type { components } from "../../api/types.gen";
import { GatherrApiClient } from "../../lib/axios";

type CalendarListDto = components["schemas"]["CalendarListDto"];

const queryFn = async (): Promise<CalendarListDto> => {
	const { data } = await GatherrApiClient.get<CalendarListDto>("/users/me/calendars");
	return data;
};

export const useListCalendars = (enabled: boolean) =>
	useQuery({
		queryKey: ["calendars"],
		queryFn,
		enabled,
		retry: false, // 403 means not connected yet — don't retry
	});

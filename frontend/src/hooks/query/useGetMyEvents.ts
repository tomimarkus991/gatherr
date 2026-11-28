import { useQuery } from "@tanstack/react-query";

import type { components } from "../../api/types.gen";
import { useToken } from "../../lib/authToken";
import { GatherrApiClient } from "../../lib/axios";

type ResponseType = components["schemas"]["EventResponseDto"];

const queryFn = async (): Promise<ResponseType[]> => {
	try {
		const { data } = await GatherrApiClient.get<ResponseType[]>("/events/mine");
		return data;
	} catch (error: any) {
		if (error?.response?.status === 401) return [];
		throw error;
	}
};

export const useGetMyEvents = () => {
	const token = useToken();
	return useQuery({
		queryKey: ["/events/mine"],
		queryFn,
		enabled: !!token,
	});
};

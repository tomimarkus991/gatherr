import { useQuery } from "@tanstack/react-query";

import type { components } from "../../api/types.gen";
import { GatherrApiClient } from "../../lib/axios";

type ResponseType = components["schemas"]["StatsDto"];

const queryFn = async (): Promise<ResponseType> => {
	const { data } = await GatherrApiClient.get<ResponseType>("/stats");
	return data;
};

export const useGetStats = () => {
	return useQuery({
		queryKey: ["/stats"],
		queryFn,
	});
};

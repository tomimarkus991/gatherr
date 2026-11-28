import { useQuery } from "@tanstack/react-query";

import type { components } from "../../api/types.gen";
import { useToken } from "../../lib/authToken";
import { GatherrApiClient } from "../../lib/axios";

type ResponseType = components["schemas"]["UserResponseDto"];

const queryFn = async (): Promise<ResponseType | null> => {
	try {
		const { data } = await GatherrApiClient.get<ResponseType>("/users/me");
		return data;
	} catch (error: any) {
		if (error?.response?.status === 401) return null;
		throw error;
	}
};

export const useGetMe = () => {
	const token = useToken();
	return useQuery({
		queryKey: ["/users/me"],
		queryFn,
		enabled: !!token,
	});
};

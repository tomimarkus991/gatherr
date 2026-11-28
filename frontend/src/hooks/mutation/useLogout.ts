import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { setToken } from "../../lib/authToken";

export const useLogout = () => {
	const queryClient = useQueryClient();
	return useCallback(() => {
		setToken(null);
		queryClient.resetQueries();
	}, [queryClient]);
};

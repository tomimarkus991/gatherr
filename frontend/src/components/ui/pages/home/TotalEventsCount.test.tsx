// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGetStats } from "../../../../hooks/query/useGetStats";
import { TotalEventsCount } from "./TotalEventsCount";

vi.mock("../../../../hooks/query/useGetStats", () => ({ useGetStats: vi.fn() }));

const mockStats = (value: Partial<ReturnType<typeof useGetStats>>) =>
	vi.mocked(useGetStats).mockReturnValue(value as ReturnType<typeof useGetStats>);

afterEach(cleanup);

describe("TotalEventsCount", () => {
	it("shows the total number of events once loaded", () => {
		mockStats({ data: { totalEvents: 1234 }, isSuccess: true });
		render(<TotalEventsCount />);
		expect(screen.getByTestId("total-events-count").textContent).toMatch(/1[,\s. ]?234/);
	});

	it("renders nothing while loading", () => {
		mockStats({ data: undefined, isSuccess: false, isLoading: true });
		const { container } = render(<TotalEventsCount />);
		expect(container.textContent).toBe("");
	});

	it("renders nothing on error, never 0", () => {
		mockStats({ data: undefined, isSuccess: false, isError: true });
		const { container } = render(<TotalEventsCount />);
		expect(container.textContent).toBe("");
		expect(container.textContent).not.toContain("0");
	});

	it("renders nothing when the response has no count", () => {
		mockStats({ data: {}, isSuccess: true });
		const { container } = render(<TotalEventsCount />);
		expect(container.textContent).toBe("");
	});
});

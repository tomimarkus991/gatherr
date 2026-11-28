// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGetStats } from "../../../../hooks/query/useGetStats";
import {
	celebratedTotal,
	formatCount,
	TOTAL_EVENTS_OFFSET,
	TotalEventsCount,
} from "./TotalEventsCount";

vi.mock("../../../../hooks/query/useGetStats", () => ({ useGetStats: vi.fn() }));
// The tanstackStart Vite plugin breaks React hooks under vitest, so render the decrypt effect's final text only.
// Playwright covers the real LetterDecryptor.
vi.mock("../../LetterDecryptor", () => ({
	LetterDecryptor: ({ children }: { children: string }) => children,
}));

const mockStats = (value: Partial<ReturnType<typeof useGetStats>>) =>
	vi.mocked(useGetStats).mockReturnValue(value as ReturnType<typeof useGetStats>);

afterEach(cleanup);

describe("TotalEventsCount", () => {
	it("shows the total number of events once loaded", () => {
		mockStats({ data: { totalEvents: 1234 }, isSuccess: true });
		render(<TotalEventsCount />);
		expect(screen.getByTestId("total-events-count").textContent).toMatch(/15[,\s. ]?666/); // 1234 + the offset 14432
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

	it("celebrates the real count plus the offset, formatted for the locale", () => {
		mockStats({ data: { totalEvents: 3 }, isSuccess: true });
		render(<TotalEventsCount variant="celebrate" />);
		const card = screen.getByTestId("total-events-count");
		expect(card.textContent).toContain("14,435");
		expect(card.textContent).toContain("events created so far");
	});

	it("renders nothing in the celebrate variant while loading", () => {
		mockStats({ data: undefined, isSuccess: false, isLoading: true });
		const { container } = render(<TotalEventsCount variant="celebrate" />);
		expect(container.textContent).toBe("");
	});
});

describe("celebratedTotal", () => {
	it("adds the named offset to the real count", () => {
		expect(TOTAL_EVENTS_OFFSET).toBe(14_432);
		expect(celebratedTotal(0)).toBe(14_432);
		expect(celebratedTotal(3)).toBe(14_435);
	});
});

describe("formatCount", () => {
	it("groups digits for the locale", () => {
		expect(formatCount(14_435, "en")).toBe("14,435");
		// Estonian groups with a (narrow) no-break space
		expect(formatCount(14_435, "et")).toMatch(/^14\s435$/u);
	});
});

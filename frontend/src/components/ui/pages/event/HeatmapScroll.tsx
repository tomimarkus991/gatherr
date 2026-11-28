import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../../../lib/utils";
import { m } from "../../../../paraglide/messages";

/**
 * Horizontal scroller for a heatmap grid. When the grid is wider than the screen, each side with
 * more content gets a fade and an arrow button that scrolls about one screen width. Touch screens
 * keep native swipe and get only the fade. The buttons sit in the date-header band so they never
 * cover a cell.
 */
export const HeatmapScroll = ({
	className,
	children,
}: {
	className?: string;
	children: ReactNode;
}) => {
	const ref = useRef<HTMLDivElement>(null);
	const [more, setMore] = useState({ left: false, right: false });

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const update = () =>
			setMore({
				left: el.scrollLeft > 1,
				right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
			});
		update();
		el.addEventListener("scroll", update, { passive: true });
		const observer = new ResizeObserver(update);
		observer.observe(el);
		if (el.firstElementChild) observer.observe(el.firstElementChild);
		return () => {
			el.removeEventListener("scroll", update);
			observer.disconnect();
		};
	}, []);

	const scroll = (direction: -1 | 1) => {
		const el = ref.current;
		if (!el) return;
		const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		el.scrollBy({
			left: direction * el.clientWidth * 0.9,
			behavior: reduceMotion ? "auto" : "smooth",
		});
	};

	const arrow =
		"absolute top-5 z-40 size-8 rounded-full bg-paint/90 border border-info/30 shadow-md flex items-center justify-center cursor-pointer pointer-coarse:hidden";
	const fade = "pointer-events-none absolute inset-y-0 w-10 z-40 from-canvas to-transparent";

	return (
		<div className={cn("relative w-full", className)}>
			<div ref={ref} className="overflow-x-auto w-full">
				{children}
			</div>
			{more.left && (
				<>
					<div className={cn(fade, "left-0 bg-linear-to-r")} />
					<button
						type="button"
						aria-label={m.event_scroll_left()}
						className={cn(arrow, "left-1")}
						onClick={() => scroll(-1)}
					>
						<ChevronLeftIcon className="size-5" />
					</button>
				</>
			)}
			{more.right && (
				<>
					<div className={cn(fade, "right-0 bg-linear-to-l")} />
					<button
						type="button"
						aria-label={m.event_scroll_right()}
						className={cn(arrow, "right-1")}
						onClick={() => scroll(1)}
					>
						<ChevronRightIcon className="size-5" />
					</button>
				</>
			)}
		</div>
	);
};

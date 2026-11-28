/**
 * Starts the "animate" variant when the element enters the viewport (design-library).
 * With isOneTimeAnimation=false it resets to "initial" when the element leaves,
 * so the entrance replays every time it scrolls back in.
 */
import { useAnimation, useInView } from "motion/react";
import { useEffect, useRef } from "react";

export const useAnimateScroll = (isOneTimeAnimation = false) => {
	const control = useAnimation();
	const ref = useRef<HTMLDivElement>(null);
	const inView = useInView(ref);

	useEffect(() => {
		if (inView) {
			control.start("animate");
		} else if (!isOneTimeAnimation) {
			control.start("initial");
		}
	}, [control, inView, isOneTimeAnimation]);

	return { control, ref };
};

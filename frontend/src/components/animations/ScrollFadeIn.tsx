import { AnimationWrapper } from "./AnimationWrapper";
import { animations } from "./anim-constants";
import { useAnimateScroll } from "./useAnimateScroll";

const VARIANTS = {
	left: animations.pageItems.fadeInFromLeft,
	right: animations.pageItems.fadeInFromRight,
	bottom: animations.pageItems.fadeInFromBottom,
};

interface Props {
	/** The side the content glides in from. Alternate left and right down a page so it zig-zags. */
	from: keyof typeof VARIANTS;
	className?: string;
	children: React.ReactNode;
}

/**
 * Fades its content in from 100px off to one side the first time it scrolls into view
 * (design-library scroll choreography). Under prefers-reduced-motion only the fade plays
 * (MotionConfig reducedMotion="user" in __root.tsx).
 *
 * Don't wrap anything with a position: fixed child: a transformed parent moves it while animating.
 */
export const ScrollFadeIn = ({ from, className, children }: Props) => {
	const { control, ref } = useAnimateScroll(true);
	return (
		<AnimationWrapper ref={ref} animate={control} variants={VARIANTS[from]} className={className}>
			{children}
		</AnimationWrapper>
	);
};

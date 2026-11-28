/**
 * Decrypt text (ported from the design-library skill).
 * The text starts as scattered glyphs (one on every `letterAmount`-th letter, the rest blank)
 * and resolves left to right over `time` ms, re-rolled every 50 ms.
 *
 * - An invisible copy of the final text reserves the layout, so nothing shifts while it runs.
 * - Screen readers get the real text only.
 * - Under prefers-reduced-motion the final text shows immediately.
 * - `onView` starts it the first time the element scrolls into view.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

export const GLYPHS = {
	kanji:
		"中外大小今明年土分秒週後午前夕夜昨左右北西人口手足目耳鼻心体力校先会社徒生しム消鉛筆ゴ山川火水木日月犬魚花雨学車金空百千万円上下",
	katakana:
		"アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン",
	binary: "01",
	symbols: "!<>-_\\/[]{}=+*^?#$%&",
};

interface Props {
	children: string;
	/** Show a glyph on every n-th letter. @default 2 */
	letterAmount?: number;
	/** Duration in ms. @default 400 */
	time?: number;
	/** Delay before starting, in ms. @default 0 */
	delay?: number;
	/** Start when the element first scrolls into view instead of on mount. @default false */
	onView?: boolean;
	/** Characters to scramble through. @default GLYPHS.kanji */
	glyphs?: string;
	/**
	 * Classes for the visible text layer. A gradient clipped to the text (`text-gradient`) must go
	 * here: `background-clip: text` on a parent skips this absolutely positioned layer.
	 */
	className?: string;
}

const scramble = (
	text: string,
	elapsed: number,
	time: number,
	letterAmount: number,
	glyphs: string[],
) => {
	const perLetter = time / text.length;
	return text
		.split("")
		.map((letter, index) => {
			if (elapsed > perLetter * index + 1) return letter;
			if (letter === " " || index % letterAmount !== 0) return "";
			return glyphs[Math.floor(Math.random() * glyphs.length)];
		})
		.join("");
};

export const LetterDecryptor = ({
	children,
	letterAmount = 2,
	time = 400,
	delay = 0,
	onView = false,
	glyphs = GLYPHS.kanji,
	className,
}: Props) => {
	const ref = useRef<HTMLSpanElement>(null);
	const [shown, setShown] = useState(children);

	useEffect(() => {
		const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		if (reduced || !children) {
			setShown(children);
			return;
		}

		let startTimer: ReturnType<typeof setTimeout> | undefined;
		let endTimer: ReturnType<typeof setTimeout> | undefined;
		let interval: ReturnType<typeof setInterval> | undefined;

		const run = () => {
			startTimer = setTimeout(() => {
				const start = Date.now();
				const chars = Array.from(glyphs);
				const tick = () =>
					setShown(scramble(children, Date.now() - start, time, letterAmount, chars));
				tick();
				interval = setInterval(tick, 50);
				endTimer = setTimeout(() => {
					clearInterval(interval);
					setShown(children);
				}, time);
			}, delay);
		};

		let observer: IntersectionObserver | undefined;
		if (onView && "IntersectionObserver" in window && ref.current) {
			observer = new IntersectionObserver(
				entries => {
					if (!entries[0].isIntersecting) return;
					observer?.disconnect();
					run();
				},
				{ rootMargin: "0px 0px -10% 0px" },
			);
			observer.observe(ref.current);
		} else {
			run();
		}

		return () => {
			observer?.disconnect();
			clearTimeout(startTimer);
			clearTimeout(endTimer);
			clearInterval(interval);
			setShown(children);
		};
	}, [children, letterAmount, time, delay, onView, glyphs]);

	return (
		<span ref={ref} className="relative inline-block">
			<span className="invisible">{children}</span>
			<span aria-hidden className={cn("absolute inset-0", className)}>
				{shown}
			</span>
		</span>
	);
};

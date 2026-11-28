/**
 * Decrypt text (ported from the design-library skill).
 * The text starts as scattered glyphs (one on every `letterAmount`-th letter, the rest blank)
 * and resolves left to right over `time` ms, re-rolled every 50 ms.
 *
 * - Each scrambling glyph sits in the slot of the letter it replaces and takes no width of its own,
 *   so the line breaks exactly like the final text. (A wide glyph such as a kanji can't push a
 *   one-line headline onto two lines mid-animation.)
 * - Screen readers get the real text only.
 * - Under prefers-reduced-motion the final text shows immediately.
 * - `onView` starts it the first time the element scrolls into view.
 */
import { Fragment, useEffect, useRef, useState } from "react";

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

/**
 * One frame: for each letter, `null` when it is resolved, `""` when its slot is blank, or the glyph
 * shown in its slot.
 */
type Frame = (string | null)[];

const scramble = (
	text: string,
	elapsed: number,
	time: number,
	letterAmount: number,
	glyphs: string[],
): Frame => {
	const perLetter = time / text.length;
	return Array.from(text).map((letter, index) => {
		if (elapsed > perLetter * index + 1) return null;
		if (letter === " " || index % letterAmount !== 0) return "";
		return glyphs[Math.floor(Math.random() * glyphs.length)];
	});
};

/** A letter slot: the real letter (invisible until resolved) holds the width; a glyph overlays it. */
const Slot = ({ letter, frame }: { letter: string; frame: string | null }) => {
	if (frame === null) return letter;
	return (
		<span className="inline-grid">
			<span className="invisible col-start-1 row-start-1">{letter}</span>
			{frame && (
				// Zero width, centred: the glyph overflows its slot instead of widening the line
				<span className="col-start-1 row-start-1 flex w-0 justify-center justify-self-center">
					{frame}
				</span>
			)}
		</span>
	);
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
	const [frame, setFrame] = useState<Frame | null>(null);

	useEffect(() => {
		const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		if (reduced || !children) {
			setFrame(null);
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
					setFrame(scramble(children, Date.now() - start, time, letterAmount, chars));
				tick();
				interval = setInterval(tick, 50);
				endTimer = setTimeout(() => {
					clearInterval(interval);
					setFrame(null);
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
			setFrame(null);
		};
	}, [children, letterAmount, time, delay, onView, glyphs]);

	const letters = Array.from(children);
	// Words stay unbreakable groups, so slots never open line breaks inside a word
	const words: { start: number; text: string[] }[] = [];
	letters.forEach((letter, index) => {
		if (letter === " ") return;
		const last = words[words.length - 1];
		if (last && last.start + last.text.length === index) last.text.push(letter);
		else words.push({ start: index, text: [letter] });
	});

	return (
		<span ref={ref}>
			<span className="sr-only">{children}</span>
			<span aria-hidden className={className}>
				{frame === null
					? children
					: words.map((word, w) => (
							<Fragment key={word.start}>
								{w > 0 && " ".repeat(word.start - (words[w - 1].start + words[w - 1].text.length))}
								<span className="whitespace-nowrap">
									{word.text.map((letter, i) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: letter positions are fixed for a given text
										<Slot key={word.start + i} letter={letter} frame={frame[word.start + i]} />
									))}
								</span>
							</Fragment>
						))}
			</span>
		</span>
	);
};

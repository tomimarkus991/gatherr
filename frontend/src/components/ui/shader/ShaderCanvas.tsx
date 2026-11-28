"use client";

/**
 * Full-bleed WebGL fragment shader runner (a React port of ai-course-final/js/hero.js).
 *
 * - Draws one full-screen triangle with the given GLSL ES 1.0 fragment shader.
 * - Uniforms: u_resolution, u_time, and the palette roles u_bg, u_primary, u_secondary, u_primarySoft,
 *   u_secondarySoft, u_highlight, read from the CSS tokens in references/tokens.md (or the `colors` prop),
 *   so the project's palette recolours any shader.
 * - Pauses when off-screen or the tab is hidden; time resumes where it stopped.
 * - Redraws on every resize, paused or not: a resize clears the canvas to black, and phones resize the viewport
 *   while scrolling and swiping. Keep this, or mobile pages flash dark (birthday f2d28ce, substitution-finder).
 * - Caps DPR at 1.5 and the drawing buffer at 1.3 MP, and lowers the resolution on slow devices.
 * - Under prefers-reduced-motion it draws a single still frame.
 * - Without WebGL, or on a compile error or lost context, the canvas hides and whatever is
 *   behind it shows. Always give the parent the hero fallback gradient from references/tokens.md.
 *
 * Usage (Vite: `?raw` imports the file as a string; Next: use a raw-loader or paste the source into a .ts string):
 *   import marble from "./molten-marble.frag?raw";
 *   <section className="relative min-h-svh overflow-hidden" style={{ background: HERO_FALLBACK }}>
 *     <ShaderCanvas fragment={marble} className="absolute inset-0 w-full h-full" />
 *     <div className="relative z-10">…</div>
 *   </section>
 */
import { useEffect, useRef } from "react";

type RGB = [number, number, number];

interface Props {
	/** GLSL ES 1.0 fragment shader source. */
	fragment: string;
	className?: string;
	/** Override theme colours as hex strings; anything left out is read from CSS variables. */
	colors?: Partial<
		Record<"bg" | "primary" | "secondary" | "primarySoft" | "secondarySoft" | "highlight", string>
	>;
	/** Shader time shown under reduced motion. @default 23 */
	stillTime?: number;
}

const MAX_DPR = 1.5;
const MAX_PIXELS = 1_300_000;
const SLOW_FRAME_MS = 28;
const MIN_QUALITY = 0.4;

// Fallbacks (used only when a token is missing) are the Ember example palette.
const UNIFORM_COLORS: [
	uniform: string,
	key: keyof NonNullable<Props["colors"]>,
	cssVar: string,
	fallback: RGB,
][] = [
	["u_bg", "bg", "--color-base", [17, 10, 9]],
	["u_primary", "primary", "--color-primary", [229, 8, 21]],
	["u_secondary", "secondary", "--color-secondary", [229, 141, 8]],
	["u_primarySoft", "primarySoft", "--color-primary-soft", [255, 105, 90]],
	["u_secondarySoft", "secondarySoft", "--color-secondary-soft", [255, 160, 51]],
	["u_highlight", "highlight", "--color-highlight", [246, 222, 92]],
];

const parseHex = (value: string | undefined): RGB | null => {
	let hex = String(value ?? "")
		.trim()
		.replace(/^#/, "");
	if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.replace(/./g, "$&$&");
	if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
	return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)) as RGB;
};

const compile = (gl: WebGLRenderingContext, type: number, source: string) => {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
	console.warn("[ShaderCanvas]", gl.getShaderInfoLog(shader));
	return null;
};

export const ShaderCanvas = ({ fragment, className, colors, stillTime = 23 }: Props) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const colorKey = JSON.stringify(colors ?? {});

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const gl = ((): WebGLRenderingContext | null => {
			const options: WebGLContextAttributes = {
				alpha: false,
				antialias: false,
				depth: false,
				stencil: false,
				powerPreference: "low-power",
			};
			try {
				return canvas.getContext("webgl", options);
			} catch {
				return null;
			}
		})();

		const init = () => {
			if (!gl) return null;
			gl.getExtension("OES_standard_derivatives"); // needed by contours.frag
			const program = gl.createProgram();
			const vertex = compile(
				gl,
				gl.VERTEX_SHADER,
				"attribute vec2 a_position;\nvoid main(){ gl_Position = vec4(a_position, 0.0, 1.0); }",
			);
			const frag = compile(gl, gl.FRAGMENT_SHADER, fragment);
			if (!program || !vertex || !frag) return null;
			gl.attachShader(program, vertex);
			gl.attachShader(program, frag);
			gl.linkProgram(program);
			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
			// biome-ignore lint/correctness/useHookAtTopLevel: WebGL call, not a React hook
			gl.useProgram(program);

			// One triangle that covers the whole viewport.
			gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
			const position = gl.getAttribLocation(program, "a_position");
			gl.enableVertexAttribArray(position);
			gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

			const styles = getComputedStyle(document.documentElement);
			const overrides = JSON.parse(colorKey) as NonNullable<Props["colors"]>;
			for (const [uniform, key, cssVar, fallback] of UNIFORM_COLORS) {
				const rgb =
					parseHex(overrides[key]) ?? parseHex(styles.getPropertyValue(cssVar)) ?? fallback;
				gl.uniform3f(
					gl.getUniformLocation(program, uniform),
					rgb[0] / 255,
					rgb[1] / 255,
					rgb[2] / 255,
				);
			}
			return {
				uResolution: gl.getUniformLocation(program, "u_resolution"),
				uTime: gl.getUniformLocation(program, "u_time"),
			};
		};

		let state = init();
		if (!gl || !state) {
			canvas.hidden = true;
			return;
		}

		const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		let visible = true;
		let lost = false;
		let rafId = 0;
		let lastNow = 0;
		let time = motionQuery.matches ? stillTime : 0;
		let quality = 1;
		let sampleFrames = 0;
		let sampleMs = 0;

		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR) * quality;
			const area = rect.width * rect.height * dpr * dpr;
			if (area > MAX_PIXELS) dpr *= Math.sqrt(MAX_PIXELS / area);
			const width = Math.max(1, Math.round(rect.width * dpr));
			const height = Math.max(1, Math.round(rect.height * dpr));
			if (canvas.width !== width || canvas.height !== height) {
				canvas.width = width;
				canvas.height = height;
			}
			gl.viewport(0, 0, width, height);
		};

		const draw = () => {
			if (!state) return;
			gl.uniform2f(state.uResolution, canvas.width, canvas.height);
			gl.uniform1f(state.uTime, time % 3600);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		};

		// Every 30 frames, if the average frame took too long, render fewer pixels.
		const adaptQuality = (delta: number) => {
			if (quality <= MIN_QUALITY) return;
			sampleFrames++;
			sampleMs += delta;
			if (sampleFrames < 30) return;
			if (sampleMs / sampleFrames > SLOW_FRAME_MS) {
				quality = Math.max(MIN_QUALITY, quality * 0.75);
				resize();
			}
			sampleFrames = 0;
			sampleMs = 0;
		};

		const frame = (now: number) => {
			// Time only advances while running, capped per frame, so motion resumes instead of jumping.
			if (lastNow) {
				const delta = now - lastNow;
				time += Math.min(delta, 100) / 1000;
				adaptQuality(delta);
			}
			lastNow = now;
			draw();
			rafId = requestAnimationFrame(frame);
		};

		const start = () => {
			if (rafId) return;
			lastNow = 0;
			sampleFrames = 0;
			sampleMs = 0;
			rafId = requestAnimationFrame(frame);
		};
		const stop = () => {
			if (rafId) cancelAnimationFrame(rafId);
			rafId = 0;
		};

		const update = () => {
			if (visible && !lost && !document.hidden && !motionQuery.matches) {
				start();
				return;
			}
			stop();
			if (!lost && motionQuery.matches && time !== stillTime) {
				time = stillTime;
				draw();
			}
		};

		const onLost = (event: Event) => {
			event.preventDefault();
			lost = true;
			stop();
			canvas.hidden = true;
		};
		const onRestored = () => {
			state = init();
			if (!state) return;
			lost = false;
			canvas.hidden = false;
			resize();
			update();
		};
		const onResize = () => {
			if (lost) return;
			resize();
			// Resizing clears the canvas to black, and the next animation frame comes after this paint: redraw now,
			// or the page flashes dark. Phones resize the viewport while scrolling (the address bar shows and hides)
			// and while swiping things across the screen.
			draw();
		};

		canvas.addEventListener("webglcontextlost", onLost);
		canvas.addEventListener("webglcontextrestored", onRestored);
		document.addEventListener("visibilitychange", update);
		motionQuery.addEventListener("change", update);
		const intersection = new IntersectionObserver(entries => {
			visible = entries[entries.length - 1].isIntersecting;
			update();
		});
		intersection.observe(canvas);
		const resizeObserver = new ResizeObserver(onResize);
		resizeObserver.observe(canvas);

		resize();
		draw();
		update();

		return () => {
			stop();
			intersection.disconnect();
			resizeObserver.disconnect();
			canvas.removeEventListener("webglcontextlost", onLost);
			canvas.removeEventListener("webglcontextrestored", onRestored);
			document.removeEventListener("visibilitychange", update);
			motionQuery.removeEventListener("change", update);
		};
	}, [fragment, colorKey, stillTime]);

	return <canvas ref={canvasRef} aria-hidden className={className} />;
};

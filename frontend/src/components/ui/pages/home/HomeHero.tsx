import { m } from "../../../../paraglide/messages";
import { AnimationWrapper } from "../../../animations/AnimationWrapper";
import { animations } from "../../../animations/anim-constants";
import { LetterDecryptor } from "../../LetterDecryptor";
import marble from "../../shader/molten-marble.frag?raw";
import { ShaderCanvas } from "../../shader/ShaderCanvas";
import { TotalEventsCount } from "./TotalEventsCount";

/** Shown under the shader, and instead of it when WebGL is unavailable (design-library hero fallback). */
const HERO_FALLBACK = [
	"radial-gradient(120% 90% at 20% 10%, color-mix(in srgb, var(--color-primary) 45%, transparent), transparent 60%)",
	"radial-gradient(90% 80% at 85% 30%, color-mix(in srgb, var(--color-secondary) 45%, transparent), transparent 60%)",
	"var(--color-surface)",
].join(", ");

interface Props {
	/** The navbar, drawn on top of the shader too. */
	children?: React.ReactNode;
}

/**
 * The home hero for visitors without events: the title decrypts in over a molten-marble shader
 * coloured from the palette tokens. Under prefers-reduced-motion the title shows at once and the
 * shader draws one still frame.
 */
export const HomeHero = ({ children }: Props) => (
	<section className="relative isolate overflow-hidden pb-16" style={{ background: HERO_FALLBACK }}>
		<ShaderCanvas fragment={marble} className="absolute inset-0 -z-10 size-full" />
		{/* Darkens the shader behind the copy and fades it into the page below. */}
		<div
			aria-hidden
			className="absolute inset-0 -z-10 bg-linear-to-b from-surface/40 via-surface/60 to-surface"
		/>
		<div className="m-auto max-w-md">
			{children}
			<p className="text-4xl font-bold text-center mt-16 mb-10">
				<LetterDecryptor time={1000}>{m.home_hero_title()}</LetterDecryptor> <br />
				<LetterDecryptor time={1000} className="text-gradient">
					{m.home_hero_title_gradient()}
				</LetterDecryptor>
			</p>
			<AnimationWrapper variants={animations.pageItems.fadeInFromBottom}>
				<p className="text-info max-w-xs text-center m-auto">{m.home_hero_text()}</p>
				<TotalEventsCount className="text-info text-sm text-center mt-4" />
			</AnimationWrapper>
		</div>
	</section>
);

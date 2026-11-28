import { createFileRoute, Link } from "@tanstack/react-router";
import { ContactMail, LegalPage, LegalSection } from "../components/ui/pages/legal/LegalPage";

export const Route = createFileRoute("/terms")({
	component: TermsOfService,
	head: () => ({ meta: [{ title: "Terms of service · Gatherr" }] }),
});

const LAST_UPDATED = "28 November 2026";

function TermsOfService() {
	return (
		<LegalPage title="Terms of service" lastUpdated={LAST_UPDATED}>
			<LegalSection title="About these terms">
				<p>
					These terms apply when you use Gatherr at gatherr.alber.ee. By signing in or using Gatherr
					you agree to them. If you don't agree, please don't use Gatherr. Questions:{" "}
					<ContactMail />.
				</p>
			</LegalSection>

			<LegalSection title="What Gatherr is">
				<p>
					Gatherr lets you create an event with candidate times, share a link, and see everyone's
					availability as a heatmap. It is free to use. We may change, add or remove features at any
					time.
				</p>
			</LegalSection>

			<LegalSection title="Your account">
				<ul className="list-disc pl-5 space-y-2">
					<li>You sign in with your Google account. Keep that account secure.</li>
					<li>You are responsible for what happens under your account.</li>
					<li>
						If you connect Google Calendar, Gatherr only reads it when you ask it to, as described
						in the{" "}
						<Link to="/privacy" className="underline">
							privacy policy
						</Link>
						.
					</li>
				</ul>
			</LegalSection>

			<LegalSection title="Your content">
				<p>
					You own what you put into Gatherr: event names, descriptions and your availability. You
					give us permission to store it and show it to the people you share the event link with.
					Anyone with an event link can open that event, so don't put anything in an event you
					wouldn't want its participants to see.
				</p>
			</LegalSection>

			<LegalSection title="Acceptable use">
				<p>Don't use Gatherr to:</p>
				<ul className="list-disc pl-5 space-y-2">
					<li>break the law or harm, harass or spam other people;</li>
					<li>post content that is illegal, hateful or infringes someone else's rights;</li>
					<li>
						try to break, overload or get unauthorised access to Gatherr or other people's data;
					</li>
					<li>scrape Gatherr or use it in an automated way.</li>
				</ul>
				<p>We may remove content or suspend accounts that break these rules.</p>
			</LegalSection>

			<LegalSection title="No warranty">
				<p>
					Gatherr is provided "as is", without warranties of any kind. We do our best to keep it
					running and your data safe, but we can't promise it will always be available, error-free,
					or that every email or calendar import will work.
				</p>
			</LegalSection>

			<LegalSection title="Limitation of liability">
				<p>
					To the extent the law allows, Gatherr is not liable for indirect or consequential losses,
					such as a missed meeting, or for loss of data. Nothing in these terms limits liability
					that cannot be limited by law.
				</p>
			</LegalSection>

			<LegalSection title="Ending">
				<p>
					You can stop using Gatherr at any time and ask us to delete your account and data (see the{" "}
					<Link to="/privacy" className="underline">
						privacy policy
					</Link>
					). We may suspend or close Gatherr, or an account, with reasonable notice where we can.
				</p>
			</LegalSection>

			<LegalSection title="Changes and law">
				<p>
					If we change these terms we will update the date at the top, and tell you in the app for
					significant changes. These terms are governed by the laws of Estonia.
				</p>
			</LegalSection>
		</LegalPage>
	);
}

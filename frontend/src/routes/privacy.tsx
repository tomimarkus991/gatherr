import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/privacy")({
	component: PrivacyPolicy,
	head: () => ({ meta: [{ title: "Privacy policy · Gatherr" }] }),
});

const CONTACT_EMAIL = "tomimarkus@alber.ee";
const LAST_UPDATED = "28 November 2026";

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="bg-canvas rounded-2xl p-6 space-y-3">
			<h2 className="text-xl font-semibold">{title}</h2>
			{children}
		</section>
	);
}

function PrivacyPolicy() {
	const mail = (
		<a href={`mailto:${CONTACT_EMAIL}`} className="underline">
			{CONTACT_EMAIL}
		</a>
	);

	return (
		<main className="m-auto max-w-2xl px-4 py-8 text-white leading-relaxed">
			<Link to="/" className="flex flex-row items-center gap-3 mb-8 w-fit">
				<img src="/fireplace.svg" alt="" className="h-10" />
				<span className="font-viking text-3xl">Gatherr</span>
			</Link>

			<h1 className="text-3xl font-semibold mb-1">Privacy policy</h1>
			<p className="text-info mb-8">Last updated {LAST_UPDATED}</p>

			<div className="space-y-6">
				<Section title="Who we are">
					<p>
						Gatherr (gatherr.alber.ee) lets you create an event, share a link and see when everyone
						is free. Gatherr is the data controller for the personal data described here. Contact:{" "}
						{mail}.
					</p>
				</Section>

				<Section title="What we collect">
					<ul className="list-disc pl-5 space-y-2">
						<li>
							<strong>Your Google account basics.</strong> When you sign in with Google we receive
							and store your name, email address and profile picture.
						</li>
						<li>
							<strong>Your settings.</strong> Timezone, language, time format and first day of the
							week.
						</li>
						<li>
							<strong>Events and answers.</strong> Events you create (name, description, candidate
							times) and the times you mark as available or not available.
						</li>
						<li>
							<strong>Google Calendar connection.</strong> If you connect Google Calendar, we store
							the access and refresh tokens Google gives us, so we can read your calendar when you
							ask us to.
						</li>
					</ul>
					<p>
						Other people who open an event can see your name, profile picture and availability for
						that event.
					</p>
				</Section>

				<Section title="Google Calendar">
					<ul className="list-disc pl-5 space-y-2">
						<li>
							We ask for read-only access (<code>calendar.readonly</code>). We never create, change
							or delete anything in your calendar.
						</li>
						<li>
							We read your calendar only when you press "Import from Google Calendar", and only for
							the calendars you pick and the event's date range.
						</li>
						<li>
							We use only the start and end times of your calendar entries to work out which slots
							you are busy. We do not store your calendar entries, their titles or their details.
						</li>
						<li>
							You can disconnect Google Calendar in Gatherr at any time, which deletes the stored
							tokens. You can also remove Gatherr's access at{" "}
							<a href="https://myaccount.google.com/permissions" className="underline">
								myaccount.google.com/permissions
							</a>
							.
						</li>
					</ul>
					<p>
						Gatherr's use and transfer of information received from Google APIs adheres to the{" "}
						<a
							href="https://developers.google.com/terms/api-services-user-data-policy"
							className="underline"
						>
							Google API Services User Data Policy
						</a>
						, including the Limited Use requirements.
					</p>
				</Section>

				<Section title="Why we use it">
					<p>
						Only to run Gatherr: to sign you in, show your events, combine everyone's availability
						into a heatmap, and email participants when the organiser confirms a time. The legal
						basis is providing the service you asked for (GDPR Art. 6(1)(b)).
					</p>
				</Section>

				<Section title="What we don't do">
					<p>
						No ads, no analytics or tracking scripts, and we never sell or share your data for
						marketing. Data from Google APIs is never used for advertising or to train AI models.
					</p>
				</Section>

				<Section title="Who processes your data">
					<ul className="list-disc pl-5 space-y-2">
						<li>
							<strong>Hetzner</strong>: runs our server and database in Helsinki, Finland (EU).
						</li>
						<li>
							<strong>Cloudflare</strong>: hosts and delivers the website.
						</li>
						<li>
							<strong>Google</strong>: sign-in, and Google Calendar if you connect it.
						</li>
						<li>
							<strong>Resend</strong>: sends the email when an event time is confirmed.
						</li>
					</ul>
				</Section>

				<Section title="How long we keep it">
					<p>
						We keep your account data while you use Gatherr. When you delete an event it is hidden
						from everyone but stays in our database; ask us and we will remove it permanently.
						Google Calendar tokens are deleted as soon as you disconnect.
					</p>
				</Section>

				<Section title="Your rights">
					<p>
						You can ask to see, correct, export or delete your data, or object to how we use it.
						Email {mail} and we will reply within 30 days. To delete your account and everything
						linked to it, email us from the address you sign in with. You can also complain to your
						data protection authority; in Estonia that is the Andmekaitse Inspektsioon (aki.ee).
					</p>
				</Section>

				<Section title="Changes">
					<p>
						If we change this policy we will update the date at the top. For significant changes we
						will tell you in the app.
					</p>
				</Section>
			</div>
		</main>
	);
}

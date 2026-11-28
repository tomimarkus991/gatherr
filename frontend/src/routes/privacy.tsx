import { createFileRoute } from "@tanstack/react-router";
import { ContactMail, LegalPage, LegalSection } from "../components/ui/pages/legal/LegalPage";

export const Route = createFileRoute("/privacy")({
	component: PrivacyPolicy,
	head: () => ({ meta: [{ title: "Privacy policy · Gatherr" }] }),
});

const LAST_UPDATED = "28 November 2026";

function PrivacyPolicy() {
	const mail = <ContactMail />;

	return (
		<LegalPage title="Privacy policy" lastUpdated={LAST_UPDATED}>
			<LegalSection title="Who we are">
				<p>
					Gatherr (gatherr.alber.ee) lets you create an event, share a link and see when everyone is
					free. Gatherr is the data controller for the personal data described here. Contact: {mail}
					.
				</p>
			</LegalSection>

			<LegalSection title="What we collect">
				<ul className="list-disc pl-5 space-y-2">
					<li>
						<strong>Your Google account basics.</strong> When you sign in with Google we receive and
						store your name, email address and profile picture.
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
						the access and refresh tokens Google gives us, so we can check your busy times when you
						ask us to.
					</li>
				</ul>
				<p>
					Other people who open an event can see your name, profile picture and availability for
					that event.
				</p>
			</LegalSection>

			<LegalSection title="Google Calendar">
				<ul className="list-disc pl-5 space-y-2">
					<li>
						We ask for two narrow, read-only permissions: the list of your calendars (
						<code>calendar.calendarlist.readonly</code>), so you can pick which ones to use, and
						your free/busy times (<code>calendar.freebusy</code>). We cannot see your calendar
						entries, their titles or their details, and we never create, change or delete anything
						in your calendar.
					</li>
					<li>
						We ask Google for your busy times only when you press "Import from Google Calendar", and
						only for the calendars you pick and the event's date range.
					</li>
					<li>
						We use those busy times to mark which slots you are busy, and we do not store them.
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
			</LegalSection>

			<LegalSection title="Why we use it">
				<p>
					Only to run Gatherr: to sign you in, show your events, combine everyone's availability
					into a heatmap, and email participants when the organiser confirms a time. The legal basis
					is providing the service you asked for (GDPR Art. 6(1)(b)).
				</p>
			</LegalSection>

			<LegalSection title="What we don't do">
				<p>
					No ads, no analytics or tracking scripts, and we never sell or share your data for
					marketing. Data from Google APIs is never used for advertising or to train AI models.
				</p>
			</LegalSection>

			<LegalSection title="Who processes your data">
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
			</LegalSection>

			<LegalSection title="How long we keep it">
				<p>
					We keep your account data while you use Gatherr. When you delete an event it is hidden
					from everyone but stays in our database; ask us and we will remove it permanently. Google
					Calendar tokens are deleted as soon as you disconnect.
				</p>
			</LegalSection>

			<LegalSection title="Your rights">
				<p>
					You can ask to see, correct, export or delete your data, or object to how we use it. Email{" "}
					{mail} and we will reply within 30 days. To delete your account and everything linked to
					it, email us from the address you sign in with. You can also complain to your data
					protection authority; in Estonia that is the Andmekaitse Inspektsioon (aki.ee).
				</p>
			</LegalSection>

			<LegalSection title="Changes">
				<p>
					If we change this policy we will update the date at the top. For significant changes we
					will tell you in the app.
				</p>
			</LegalSection>
		</LegalPage>
	);
}

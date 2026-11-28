import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ScrollFadeIn } from "../components/animations/ScrollFadeIn";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Navbar } from "../components/ui/navbar";
import { HomeHero } from "../components/ui/pages/home/HomeHero";
import { MyEvents } from "../components/ui/pages/home/MyEvents";
import { TotalEventsCount } from "../components/ui/pages/home/TotalEventsCount";
import { useGetMyEvents } from "../hooks/query/useGetMyEvents";
import { m } from "../paraglide/messages";

export const Route = createFileRoute("/")({ component: App });

function App() {
	const [name, setName] = useState("");
	const navigate = useNavigate();
	// Signed in with events: the counter moves from under the hero to its own card at the bottom
	const { data: myEvents, isLoading } = useGetMyEvents();
	const hasEvents = !!myEvents?.length;
	// Without events (or while they load) the hero shows instead of the event list
	const showHero = !hasEvents || isLoading;

	return (
		<main>
			<div className="mb-4">
				{showHero ? (
					<HomeHero>
						<Navbar />
					</HomeHero>
				) : (
					<div className="m-auto max-w-md">
						<Navbar />
						<MyEvents />
					</div>
				)}
				<div className="m-auto max-w-md">
					<ScrollFadeIn
						from="left"
						className="bg-canvas rounded-xl flex flex-col justify-center space-y-9 px-6 my-12 py-12 mx-4"
					>
						<img src="/fireplace.svg" alt="Fireplace" className="h-16" />
						<p className="text-3xl font-semibold text-center">{m.home_create_title()}</p>
						<Input
							value={name}
							onChange={e => setName(e.target.value)}
							placeholder={m.home_create_input_placeholder()}
							onKeyDown={e => {
								if (e.key === "Enter" && name.trim()) {
									navigate({ to: "/create", search: { name } });
								}
							}}
						/>
						<Button
							disabled={!name.trim()}
							onClick={() => navigate({ to: "/create", search: { name } })}
						>
							{m.home_create_button()}
						</Button>
					</ScrollFadeIn>
					{hasEvents && (
						<ScrollFadeIn from="right">
							<TotalEventsCount variant="celebrate" />
						</ScrollFadeIn>
					)}
				</div>
			</div>
			<footer className="flex flex-row justify-center gap-6 pb-8">
				<Link to="/privacy" className="text-info text-sm underline">
					{m.footer_privacy()}
				</Link>
				<Link to="/terms" className="text-info text-sm underline">
					{m.footer_terms()}
				</Link>
			</footer>
		</main>
	);
}

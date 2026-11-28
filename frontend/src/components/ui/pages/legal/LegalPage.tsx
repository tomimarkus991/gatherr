import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const CONTACT_EMAIL = "tomimarkus@alber.ee";

export function ContactMail() {
	return (
		<a href={`mailto:${CONTACT_EMAIL}`} className="underline">
			{CONTACT_EMAIL}
		</a>
	);
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="bg-canvas rounded-2xl p-6 space-y-3">
			<h2 className="text-xl font-semibold">{title}</h2>
			{children}
		</section>
	);
}

export function LegalPage({
	title,
	lastUpdated,
	children,
}: {
	title: string;
	lastUpdated: string;
	children: ReactNode;
}) {
	return (
		<main className="m-auto max-w-2xl px-4 py-8 text-white leading-relaxed">
			<Link to="/" className="flex flex-row items-center gap-3 mb-8 w-fit">
				<img src="/fireplace.svg" alt="" className="h-10" />
				<span className="font-viking text-3xl">Gatherr</span>
			</Link>

			<h1 className="text-3xl font-semibold mb-1">{title}</h1>
			<p className="text-info mb-8">Last updated {lastUpdated}</p>

			<div className="space-y-6">{children}</div>
		</main>
	);
}

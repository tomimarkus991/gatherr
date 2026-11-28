import { Link } from "@tanstack/react-router";
import * as m from "../../paraglide/messages";
import { UserButton } from "./UserButton";

export const Navbar = () => {
	return (
		<nav className="text-white max-w-lg m-auto">
			<div className="flex flex-row items-center justify-between mt-8 mx-6.5">
				<Link
					to="/"
					aria-label={m.navbar_home_link()}
					className="flex flex-row items-center justify-between flex-1 mr-6"
				>
					<img src="/fireplace.svg" alt="" className="h-14 sm:h-16" />
					<span className="font-viking text-4xl sm:text-5xl">Gatherr</span>
				</Link>
				<UserButton />
			</div>
		</nav>
	);
};

import { Link } from "@tanstack/react-router";
import * as m from "../../paraglide/messages";
import { UserButton } from "./UserButton";

export const Navbar = () => {
	return (
		<nav className="text-white max-w-lg m-auto">
			{/* Three equal-sided columns keep the wordmark centred whatever the side items' widths */}
			<div className="grid grid-cols-[1fr_auto_1fr] items-center mt-8 mx-6.5">
				{/* Same target as the wordmark; hidden from assistive tech so home is announced once */}
				<Link to="/" aria-hidden tabIndex={-1} className="justify-self-start">
					<img src="/fireplace.svg" alt="" className="h-14 sm:h-16" />
				</Link>
				<Link to="/" aria-label={m.navbar_home_link()}>
					<span className="font-viking text-4xl sm:text-5xl">Gatherr</span>
				</Link>
				<div className="justify-self-end">
					<UserButton />
				</div>
			</div>
		</nav>
	);
};

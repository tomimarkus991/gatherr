/// <reference types="vitest/config" />
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { configDefaults } from "vitest/config";

const devLinks: Plugin = {
	name: "dev-links",
	configureServer(server) {
		const { printUrls } = server;
		server.printUrls = () => {
			printUrls();
			const links = [
				"http://localhost:3000/e/cozy-hot-toast-nBoe5j5a",
				"http://localhost:3000/e/cozy-hot-toast-1234",
				"http://localhost:3000/create?name=Team%20planning%20sesh",
			];
			for (const link of links) {
				console.log(`  ➜  Dev:     \x1b[36m${link}\x1b[0m`);
			}
		};
	},
};

const config = defineConfig({
	plugins: [
		devLinks,
		// The devtools event bus listens on its own port; DEVTOOLS_PORT lets two dev servers run at once.
		devtools({ eventBusConfig: { port: Number(process.env.DEVTOOLS_PORT) || 42069 } }),
		paraglideVitePlugin({
			project: "./project.inlang",
			outdir: "./src/paraglide",
			strategy: ["cookie", "baseLocale"],
		}),
		tailwindcss(),
		tanstackStart({
			spa: {
				enabled: true,
				prerender: {
					outputPath: "/index.html",
				},
			},
		}),
		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
	],
	test: {
		// e2e/ holds Playwright specs, run with `npm run test:e2e`.
		exclude: [...configDefaults.exclude, "e2e/**"],
	},
});

export default config;

import { ssr } from '@sveltejs/kit/ssr';
import root from './generated/root.svelte';
import { set_paths } from './runtime/paths.js';
import { set_prerendering } from './runtime/env.js';
import * as user_hooks from "./hooks.js";

const template = ({ head, body }) => "<!DOCTYPE html>\n<html lang=\"en\">\n\t<head>\n\t\t<meta charset=\"utf-8\" />\n\t\t<link rel=\"icon\" href=\"/favicon.ico\" />\n\t\t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n\t\t<script\n\t\t\ttype=\"module\"\n\t\t\tsrc=\"https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.esm.js\"\n\t\t></script>\n\t\t<script nomodule src=\"https://cdn.jsdelivr.net/npm/@ionic/core/dist/ionic/ionic.js\"></script>\n\t\t<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/@ionic/core/css/ionic.bundle.css\" />\n\t\t" + head + "\n\t</head>\n\t<body>\n\t\t<div id=\"svelte\">" + body + "</div>\n\t</body>\n</html>\n";

let options = null;

// allow paths to be overridden in svelte-kit start
// and in prerendering
export function init(settings) {
	set_paths(settings.paths);
	set_prerendering(settings.prerendering || false);

	options = {
		amp: false,
		dev: false,
		entry: {
			file: "/./_app/start-1d07e4d8.js",
			css: ["/./_app/assets/start-0826e215.css"],
			js: ["/./_app/start-1d07e4d8.js","/./_app/chunks/vendor-0bc65d02.js"]
		},
		fetched: undefined,
		get_component_path: id => "/./_app/" + entry_lookup[id],
		get_stack: error => String(error), // for security
		handle_error: error => {
			console.error(error.stack);
			error.stack = options.get_stack(error);
		},
		hooks: get_hooks(user_hooks),
		hydrate: true,
		initiator: undefined,
		load_component,
		manifest,
		paths: settings.paths,
		read: settings.read,
		root,
		router: true,
		ssr: true,
		target: "#svelte",
		template
	};
}

const d = decodeURIComponent;
const empty = () => ({});

const manifest = {
	assets: [{"file":"favicon.ico","size":1150,"type":"image/vnd.microsoft.icon"},{"file":"robots.txt","size":67,"type":"text/plain"},{"file":"svelte-welcome.png","size":360807,"type":"image/png"},{"file":"svelte-welcome.webp","size":115470,"type":"image/webp"}],
	layout: "src/routes/$layout.svelte",
	error: ".svelte/build/components/error.svelte",
	routes: [
		{
						type: 'page',
						pattern: /^\/$/,
						params: empty,
						a: ["src/routes/$layout.svelte", "src/routes/index.svelte"],
						b: [".svelte/build/components/error.svelte"]
					},
		{
						type: 'page',
						pattern: /^\/ranking\/?$/,
						params: empty,
						a: ["src/routes/$layout.svelte", "src/routes/ranking/index.svelte"],
						b: [".svelte/build/components/error.svelte"]
					},
		{
						type: 'page',
						pattern: /^\/ranking\/ranking\/?$/,
						params: empty,
						a: ["src/routes/$layout.svelte", "src/routes/ranking/ranking.svelte"],
						b: [".svelte/build/components/error.svelte"]
					},
		{
						type: 'page',
						pattern: /^\/search\/?$/,
						params: empty,
						a: ["src/routes/$layout.svelte", "src/routes/search/index.svelte"],
						b: [".svelte/build/components/error.svelte"]
					},
		{
						type: 'page',
						pattern: /^\/about\/?$/,
						params: empty,
						a: ["src/routes/$layout.svelte", "src/routes/about.svelte"],
						b: [".svelte/build/components/error.svelte"]
					},
		{
						type: 'page',
						pattern: /^\/cards\/cardprofile\/?$/,
						params: empty,
						a: ["src/routes/$layout.svelte", "src/routes/cards/cardprofile.svelte"],
						b: [".svelte/build/components/error.svelte"]
					},
		{
						type: 'page',
						pattern: /^\/cards\/Login\/?$/,
						params: empty,
						a: ["src/routes/$layout.svelte", "src/routes/cards/Login.svelte"],
						b: [".svelte/build/components/error.svelte"]
					},
		{
						type: 'endpoint',
						pattern: /^\/todos\.json$/,
						params: empty,
						load: () => import("..\\..\\src\\routes\\todos\\index.json.ts")
					},
		{
						type: 'page',
						pattern: /^\/todos\/?$/,
						params: empty,
						a: ["src/routes/$layout.svelte", "src/routes/todos/index.svelte"],
						b: [".svelte/build/components/error.svelte"]
					},
		{
						type: 'endpoint',
						pattern: /^\/todos\/([^/]+?)\.json$/,
						params: (m) => ({ uid: d(m[1])}),
						load: () => import("..\\..\\src\\routes\\todos\\[uid].json.ts")
					},
		{
						type: 'page',
						pattern: /^\/User\/?$/,
						params: empty,
						a: ["src/routes/$layout.svelte", "src/routes/User.svelte"],
						b: [".svelte/build/components/error.svelte"]
					},
		{
						type: 'page',
						pattern: /^\/news\/?$/,
						params: empty,
						a: ["src/routes/$layout.svelte", "src/routes/news/index.svelte"],
						b: [".svelte/build/components/error.svelte"]
					},
		{
						type: 'page',
						pattern: /^\/news\/summary\/?$/,
						params: empty,
						a: ["src/routes/$layout.svelte", "src/routes/news/summary.svelte"],
						b: [".svelte/build/components/error.svelte"]
					},
		{
						type: 'page',
						pattern: /^\/box\/?$/,
						params: empty,
						a: ["src/routes/$layout.svelte", "src/routes/box/index.svelte"],
						b: [".svelte/build/components/error.svelte"]
					}
	]
};

// this looks redundant, but the indirection allows us to access
// named imports without triggering Rollup's missing import detection
const get_hooks = hooks => ({
	getContext: hooks.getContext || (() => ({})),
	getSession: hooks.getSession || (() => ({})),
	handle: hooks.handle || (({ request, render }) => render(request))
});

const module_lookup = {
	"src/routes/$layout.svelte": () => import("..\\..\\src\\routes\\$layout.svelte"),".svelte/build/components/error.svelte": () => import("./components\\error.svelte"),"src/routes/index.svelte": () => import("..\\..\\src\\routes\\index.svelte"),"src/routes/ranking/index.svelte": () => import("..\\..\\src\\routes\\ranking\\index.svelte"),"src/routes/ranking/ranking.svelte": () => import("..\\..\\src\\routes\\ranking\\ranking.svelte"),"src/routes/search/index.svelte": () => import("..\\..\\src\\routes\\search\\index.svelte"),"src/routes/about.svelte": () => import("..\\..\\src\\routes\\about.svelte"),"src/routes/cards/cardprofile.svelte": () => import("..\\..\\src\\routes\\cards\\cardprofile.svelte"),"src/routes/cards/Login.svelte": () => import("..\\..\\src\\routes\\cards\\Login.svelte"),"src/routes/todos/index.svelte": () => import("..\\..\\src\\routes\\todos\\index.svelte"),"src/routes/User.svelte": () => import("..\\..\\src\\routes\\User.svelte"),"src/routes/news/index.svelte": () => import("..\\..\\src\\routes\\news\\index.svelte"),"src/routes/news/summary.svelte": () => import("..\\..\\src\\routes\\news\\summary.svelte"),"src/routes/box/index.svelte": () => import("..\\..\\src\\routes\\box\\index.svelte")
};

const metadata_lookup = {"src/routes/$layout.svelte":{"entry":"/./_app/pages/$layout.svelte-3aae97db.js","css":["/./_app/assets/pages/$layout.svelte-a03e0467.css"],"js":["/./_app/pages/$layout.svelte-3aae97db.js","/./_app/chunks/vendor-0bc65d02.js"],"styles":null},".svelte/build/components/error.svelte":{"entry":"/./_app/error.svelte-341a0eb8.js","css":[],"js":["/./_app/error.svelte-341a0eb8.js","/./_app/chunks/vendor-0bc65d02.js"],"styles":null},"src/routes/index.svelte":{"entry":"/./_app/pages/index.svelte-85f7d57b.js","css":[],"js":["/./_app/pages/index.svelte-85f7d57b.js","/./_app/chunks/vendor-0bc65d02.js"],"styles":null},"src/routes/ranking/index.svelte":{"entry":"/./_app/pages/ranking/index.svelte-c9af7bcb.js","css":[],"js":["/./_app/pages/ranking/index.svelte-c9af7bcb.js","/./_app/chunks/vendor-0bc65d02.js"],"styles":null},"src/routes/ranking/ranking.svelte":{"entry":"/./_app/pages/ranking/ranking.svelte-4200608b.js","css":[],"js":["/./_app/pages/ranking/ranking.svelte-4200608b.js","/./_app/chunks/vendor-0bc65d02.js"],"styles":null},"src/routes/search/index.svelte":{"entry":"/./_app/pages/search/index.svelte-5340fd99.js","css":["/./_app/assets/Box.svelte_svelte&type=style&lang-c1911e66.css"],"js":["/./_app/pages/search/index.svelte-5340fd99.js","/./_app/chunks/vendor-0bc65d02.js"],"styles":null},"src/routes/about.svelte":{"entry":"/./_app/pages/about.svelte-37436fe0.js","css":[],"js":["/./_app/pages/about.svelte-37436fe0.js","/./_app/chunks/vendor-0bc65d02.js"],"styles":null},"src/routes/cards/cardprofile.svelte":{"entry":"/./_app/pages/cards/cardprofile.svelte-168a0f7b.js","css":[],"js":["/./_app/pages/cards/cardprofile.svelte-168a0f7b.js","/./_app/chunks/vendor-0bc65d02.js"],"styles":null},"src/routes/cards/Login.svelte":{"entry":"/./_app/pages/cards/Login.svelte-7badac9a.js","css":[],"js":["/./_app/pages/cards/Login.svelte-7badac9a.js","/./_app/chunks/vendor-0bc65d02.js"],"styles":null},"src/routes/todos/index.svelte":{"entry":"/./_app/pages/todos/index.svelte-00066898.js","css":["/./_app/assets/pages/todos/index.svelte-0cc21db3.css"],"js":["/./_app/pages/todos/index.svelte-00066898.js","/./_app/chunks/vendor-0bc65d02.js","/./_app/chunks/index-0ee0897d.js"],"styles":null},"src/routes/User.svelte":{"entry":"/./_app/pages/User.svelte-0cddcb04.js","css":[],"js":["/./_app/pages/User.svelte-0cddcb04.js","/./_app/chunks/vendor-0bc65d02.js"],"styles":null},"src/routes/news/index.svelte":{"entry":"/./_app/pages/news/index.svelte-757d1888.js","css":[],"js":["/./_app/pages/news/index.svelte-757d1888.js","/./_app/chunks/vendor-0bc65d02.js"],"styles":null},"src/routes/news/summary.svelte":{"entry":"/./_app/pages/news/summary.svelte-8a42bcb5.js","css":["/./_app/assets/pages/news/summary.svelte-4c171519.css"],"js":["/./_app/pages/news/summary.svelte-8a42bcb5.js","/./_app/chunks/vendor-0bc65d02.js"],"styles":null},"src/routes/box/index.svelte":{"entry":"/./_app/pages/box/index.svelte-78d7995d.js","css":["/./_app/assets/pages/box/index.svelte-6e16fefb.css","/./_app/assets/Box.svelte_svelte&type=style&lang-c1911e66.css"],"js":["/./_app/pages/box/index.svelte-78d7995d.js","/./_app/chunks/vendor-0bc65d02.js","/./_app/chunks/index-0ee0897d.js"],"styles":null}};

async function load_component(file) {
	return {
		module: await module_lookup[file](),
		...metadata_lookup[file]
	};
}

init({ paths: {"base":"","assets":"/."} });

export function render(request, {
	prerender
} = {}) {
	const host = request.headers["host"];
	return ssr({ ...request, host }, options, { prerender });
}
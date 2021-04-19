const c = [
	() => import("..\\..\\..\\src\\routes\\$layout.svelte"),
	() => import("..\\components\\error.svelte"),
	() => import("..\\..\\..\\src\\routes\\index.svelte"),
	() => import("..\\..\\..\\src\\routes\\ranking\\index.svelte"),
	() => import("..\\..\\..\\src\\routes\\ranking\\ranking.svelte"),
	() => import("..\\..\\..\\src\\routes\\search\\index.svelte"),
	() => import("..\\..\\..\\src\\routes\\about.svelte"),
	() => import("..\\..\\..\\src\\routes\\cards\\cardprofile.svelte"),
	() => import("..\\..\\..\\src\\routes\\cards\\Login.svelte"),
	() => import("..\\..\\..\\src\\routes\\todos\\index.svelte"),
	() => import("..\\..\\..\\src\\routes\\User.svelte"),
	() => import("..\\..\\..\\src\\routes\\news\\index.svelte"),
	() => import("..\\..\\..\\src\\routes\\news\\summary.svelte"),
	() => import("..\\..\\..\\src\\routes\\box\\index.svelte")
];

const d = decodeURIComponent;

export const routes = [
	// src/routes/index.svelte
	[/^\/$/, [c[0], c[2]], [c[1]]],

	// src/routes/ranking/index.svelte
	[/^\/ranking\/?$/, [c[0], c[3]], [c[1]]],

	// src/routes/ranking/ranking.svelte
	[/^\/ranking\/ranking\/?$/, [c[0], c[4]], [c[1]]],

	// src/routes/search/index.svelte
	[/^\/search\/?$/, [c[0], c[5]], [c[1]]],

	// src/routes/about.svelte
	[/^\/about\/?$/, [c[0], c[6]], [c[1]]],

	// src/routes/cards/cardprofile.svelte
	[/^\/cards\/cardprofile\/?$/, [c[0], c[7]], [c[1]]],

	// src/routes/cards/Login.svelte
	[/^\/cards\/Login\/?$/, [c[0], c[8]], [c[1]]],

	// src/routes/todos/index.json.ts
	[/^\/todos\.json$/],

	// src/routes/todos/index.svelte
	[/^\/todos\/?$/, [c[0], c[9]], [c[1]]],

	// src/routes/todos/[uid].json.ts
	[/^\/todos\/([^/]+?)\.json$/],

	// src/routes/User.svelte
	[/^\/User\/?$/, [c[0], c[10]], [c[1]]],

	// src/routes/news/index.svelte
	[/^\/news\/?$/, [c[0], c[11]], [c[1]]],

	// src/routes/news/summary.svelte
	[/^\/news\/summary\/?$/, [c[0], c[12]], [c[1]]],

	// src/routes/box/index.svelte
	[/^\/box\/?$/, [c[0], c[13]], [c[1]]]
];

export const fallback = [c[0](), c[1]()];
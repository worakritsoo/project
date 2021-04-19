const { tailwindExtractor } = require('tailwindcss/lib/lib/purgeUnusedStyles');
const colors = require('tailwindcss');
const plugin = require('tailwindcss/plugin');

module.exports = {
	mode: 'jit',
	purge: {
		content: ['./src/**/*.{html,js,svelte,ts}'],
		options: {
			defaultExtractor: (content) => [
				// If this stops working, please open an issue at https://github.com/svelte-add/tailwindcss/issues rather than bothering Tailwind Labs about it
				...tailwindExtractor(content),
				// Match Svelte class: directives (https://github.com/tailwindlabs/tailwindcss/discussions/1731)
				...[...content.matchAll(/(?:class:)*([\w\d-/:%.]+)/gm)].map(
					([_match, group, ..._rest]) => group
				)
			]
		}
	},
	theme: {
		fill: (theme) => ({
			gray: theme('colors.gray')
		}),
		extends: {
			colors: {
				transparent: 'transparent',
				current: 'currentColor',
				primary: colors.indigo,
				emeral: colors.emeral
			},
			screens: {
				'3xl': '1600px'
			}
		}
	},
	variants: {
		extend: {}
	},
	plugins: []
};

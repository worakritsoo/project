const { tailwindExtractor } = require("tailwindcss/lib/lib/purgeUnusedStyles");
const { colors } = require('tailwindcss')
const plugin = require('tailwindcss/plugin')


module.exports = {
	mode: "jit",
	purge: {
		content: [
			"./src/**/*.{html,js,svelte,ts}",
		],
		options: {
			defaultExtractor: (content) => [
				// If this stops working, please open an issue at https://github.com/svelte-add/tailwindcss/issues rather than bothering Tailwind Labs about it
				...tailwindExtractor(content),
				// Match Svelte class: directives (https://github.com/tailwindlabs/tailwindcss/discussions/1731)
				...[...content.matchAll(/(?:class:)*([\w\d-/:%.]+)/gm)].map(([_match, group, ..._rest]) => group),
			],
		},
	},
	theme: {
		fill: theme => ({
      		gray: theme('colors.gray')
		}),
		extends: {
			 screens: {
        '3xl': '1600px',
      },
		}
	},
	variants: {
		extend: {},
	},
	plugins: [ plugin(function({ addComponents, theme }) {
      const buttons = {
        '.btn': {
          padding: `${theme('spacing.2')} ${theme('spacing.4')}`,
          borderRadius: theme('borderRadius.md'),
          fontWeight: theme('fontWeight.600'),
        },
        '.btn-indigo': {
          backgroundColor: theme('colors.indigo.500'),
          color: theme('colors.white'),
          '&:hover': {
            backgroundColor: theme('colors.indigo.600')
          },
        },
      }

      addComponents(buttons)
	})
	],
	 darkMode: 'media',
};

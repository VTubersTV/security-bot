/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/server/views/**/*.ejs'],
	darkMode: 'media',
	theme: {
		extend: {
			colors: {
				discord: {
					primary: '#7289da',
					'primary-dark': '#5b6eae',
					'primary-light': '#8ea1e1',
					success: '#43b581',
					danger: '#f04747',
					warning: '#faa61a',
					info: '#3498db',
					dark: {
						100: '#36393f',
						200: '#2f3136',
						300: '#202225',
						400: '#18191c',
					},
				},
			},
			fontFamily: {
				sans: [
					'Inter',
					'ui-sans-serif',
					'system-ui',
					'-apple-system',
					'BlinkMacSystemFont',
					'Segoe UI',
					'Roboto',
					'Helvetica Neue',
					'Arial',
					'sans-serif',
				],
			},
			animation: {
				'slide-in': 'slide-in 0.3s ease-out',
				'slide-up': 'slide-up 0.4s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
			},
			keyframes: {
				'slide-in': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(0)' },
				},
				'slide-up': {
					'0%': { transform: 'translateY(20px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' },
				},
				'fade-in': {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
			},
			backdropBlur: {
				xs: '2px',
			},
		},
	},
	plugins: [
		require('@tailwindcss/forms')({
			strategy: 'class',
		}),
	],
}

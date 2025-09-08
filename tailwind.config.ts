import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'inter': ['Inter', 'sans-serif'],
			},
			colors: {
				/* OKLCH Color System Integration */
				border: 'var(--border)',
				input: 'var(--input)',
				ring: 'var(--ring)',
				background: 'var(--background)',
				foreground: 'var(--foreground)',
				
				/* Primary brand colors with full OKLCH scale */
				primary: {
					DEFAULT: 'var(--primary)',
					foreground: 'var(--primary-foreground)',
					hover: 'var(--primary-hover)',
					light: 'var(--primary-light)',
					50: 'var(--primary-50)',
					100: 'var(--primary-100)',
					200: 'var(--primary-200)',
					300: 'var(--primary-300)',
					400: 'var(--primary-400)',
					500: 'var(--primary-500)',
					600: 'var(--primary-600)',
					700: 'var(--primary-700)',
					800: 'var(--primary-800)',
					900: 'var(--primary-900)'
				},
				
				secondary: {
					DEFAULT: 'var(--secondary)',
					foreground: 'var(--secondary-foreground)',
					hover: 'var(--secondary-hover)'
				},
				
				/* Status colors with semantic naming */
				destructive: {
					DEFAULT: 'var(--destructive)',
					foreground: 'var(--destructive-foreground)',
					hover: 'var(--destructive-hover)',
					light: 'var(--destructive-light)',
					700: 'var(--destructive-700)'
				},
				
				success: {
					DEFAULT: 'var(--success)',
					foreground: 'var(--success-foreground)',
					light: 'var(--success-light)',
					700: 'var(--success-700)'
				},
				
				warning: {
					DEFAULT: 'var(--warning)',
					foreground: 'var(--warning-foreground)',
					light: 'var(--warning-light)',
					700: 'var(--warning-700)'
				},
				
				info: {
					DEFAULT: 'var(--info)',
					foreground: 'var(--info-foreground)',
					light: 'var(--info-light)',
					700: 'var(--info-700)'
				},
				
				muted: {
					DEFAULT: 'var(--muted)',
					foreground: 'var(--muted-foreground)'
				},
				
				accent: {
					DEFAULT: 'var(--accent)',
					foreground: 'var(--accent-foreground)',
					hover: 'var(--accent-hover)'
				},
				
				popover: {
					DEFAULT: 'var(--popover)',
					foreground: 'var(--popover-foreground)'
				},
				
				card: {
					DEFAULT: 'var(--card)',
					foreground: 'var(--card-foreground)'
				},
				
				/* Legacy purple mapping - DEPRECATED, use primary instead */
        purple: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
          secondary: 'var(--primary-200)',
          'secondary-foreground': 'var(--primary-700)',
          muted: 'var(--primary-100)',
          'muted-foreground': 'var(--primary-600)'
        },
        
				sidebar: {
					DEFAULT: 'var(--sidebar-background)',
					foreground: 'var(--sidebar-foreground)',
					primary: 'var(--sidebar-primary)',
					'primary-foreground': 'var(--sidebar-primary-foreground)',
					accent: 'var(--sidebar-accent)',
					'accent-foreground': 'var(--sidebar-accent-foreground)',
					border: 'var(--sidebar-border)',
					ring: 'var(--sidebar-ring)'
				}
			},
			fontSize: {
				// Deprecated text-xs - replaced with sm for WCAG compliance
				'xs': '0.875rem', // 14px - No longer 12px for accessibility
				// Enhanced typography scale
				'readable-xs': 'var(--text-readable-xs)',
				'readable-sm': 'var(--text-readable-sm)', 
				'readable-base': 'var(--text-readable-base)',
				'readable-lg': 'var(--text-readable-lg)',
				// Semantic typography
				'display': 'var(--text-display)',
				'h1': 'var(--text-headline-1)',
				'h2': 'var(--text-headline-2)',
				'h3': 'var(--text-headline-3)',
				'body': 'var(--text-body)',
				'body-sm': 'var(--text-body-sm)',
				'label': 'var(--text-label)',
			},
			borderRadius: {
				lg: 'var(--radius-lg)',
				md: 'var(--radius)',
				sm: 'var(--radius-sm)'
			},
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
				'128': '32rem'
			},
			boxShadow: {
				'soft': 'var(--shadow-sm)',
				'elevation': 'var(--shadow-md)',
				'floating': 'var(--shadow-lg)',
				'depth': 'var(--shadow-xl)',
				'massive': 'var(--shadow-2xl)',
				'colored': 'var(--shadow-colored)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				shimmer: {
					'100%': {
						transform: 'translateX(100%)'
					}
				},
				'fade-in-up': {
					from: {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					to: {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'scale-in': {
					from: {
						opacity: '0',
						transform: 'scale(0.9)'
					},
					to: {
						opacity: '1',
						transform: 'scale(1)'
					}
				},
				'gentle-bounce': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-2px)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
				'scale-in': 'scale-in 0.3s ease-out forwards',
				'gentle-bounce': 'gentle-bounce 2s ease-in-out infinite',
				'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

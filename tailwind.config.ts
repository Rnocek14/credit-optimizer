import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	safelist: [
		'bg-accent-cyan','text-accent-cyan-foreground',
		'bg-accent-gold','text-accent-gold-foreground', 
		'bg-accent-lime','text-accent-lime-foreground',
		'bg-risk-low','bg-risk-medium','bg-risk-high','bg-risk-critical',
		'gradient-primary', 'lp-swatch', 'lp-grid',
		{ pattern: /chip--(accepted|pending|rejected|unknown|locked|completed)/ },
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
			
			/* PHASE 3: Spacing System - 8pt Grid + Safe Areas */
			spacing: {
				'0': '0rem',        // 0px
				'1': '0.25rem',     // 4px - half step
				'2': '0.5rem',      // 8px - base unit
				'3': '0.75rem',     // 12px - half step  
				'4': '1rem',        // 16px - double base
				'5': '1.25rem',     // 20px - golden ratio
				'6': '1.5rem',      // 24px - triple base
				'8': '2rem',        // 32px - quad base
				'10': '2.5rem',     // 40px - 5x base
				'12': '3rem',       // 48px - 6x base
				'16': '4rem',       // 64px - 8x base
				'20': '5rem',       // 80px - 10x base
				'24': '6rem',       // 96px - 12x base
				'32': '8rem',       // 128px - 16x base
				'40': '10rem',      // 160px - 20x base
				'48': '12rem',      // 192px - 24x base
				
				// Legacy spacing (maintain compatibility)
				'18': '4.5rem',
				'88': '22rem', 
				'128': '32rem',
				
				// Touch target compliance
				'11': '2.75rem',    // 44px minimum touch target
				'13': '3.25rem',    // 52px generous touch target
			},
			
			/* Motion System Tokens */
			transitionDuration: {
				'instant': '0ms',
				'fast': '100ms',    // Micro-interactions
				'normal': '200ms',  // Standard transitions
				'slow': '300ms',    // Layout changes
				'slower': '500ms',  // Page transitions
				'slowest': '800ms', // Dramatic reveals
			},
			
			transitionTimingFunction: {
				'standard': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
				'decelerate': 'cubic-bezier(0.0, 0.0, 0.2, 1)', 
				'accelerate': 'cubic-bezier(0.4, 0.0, 1, 1)',
				'sharp': 'cubic-bezier(0.4, 0.0, 0.6, 1)',
				'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
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
					hover: 'var(--accent-hover)',
					cyan: 'var(--accent-cyan)',
					'cyan-foreground': 'var(--accent-cyan-foreground)',
					gold: 'var(--accent-gold)',
					'gold-foreground': 'var(--accent-gold-foreground)', 
					lime: 'var(--accent-lime)',
					'lime-foreground': 'var(--accent-lime-foreground)'
				},
				
				/* Risk matrix semantic colors */
				risk: {
					low: 'var(--risk-low)',
					'low-foreground': 'var(--risk-low-foreground)',
					medium: 'var(--risk-medium)',
					'medium-foreground': 'var(--risk-medium-foreground)',
					high: 'var(--risk-high)',
					'high-foreground': 'var(--risk-high-foreground)',
					critical: 'var(--risk-critical)',
					'critical-foreground': 'var(--risk-critical-foreground)'
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
				
				/* Phase 3 Motion Keyframes */
				'fade-in-up': {
					'0%': {
						opacity: '0',
						transform: 'translateY(8px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				
				'fade-in-scale': {
					'0%': {
						opacity: '0',
						transform: 'scale(0.96)'
					},
					'100%': {
						opacity: '1',
						transform: 'scale(1)'
					}
				},
				
				'slide-in-left': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(0)' }
				},
				
				'slide-in-right': {
					'0%': { transform: 'translateX(100%)' },
					'100%': { transform: 'translateX(0)' }
				},
				
				'lift-hover': {
					'0%': { 
						transform: 'translateY(0) scale(1)',
						boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
					},
					'100%': { 
						transform: 'translateY(-2px) scale(1.01)',
						boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
					}
				},
				
				shimmer: {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(200%)' }
				},
				
				'gentle-bounce': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-2px)' }
				},
				
				'gentle-pulse': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.7' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				
				/* Phase 3 Enhanced Animations */
				'fade-in-up': 'fade-in-up 0.3s cubic-bezier(0.0, 0.0, 0.2, 1) forwards',
				'fade-in-scale': 'fade-in-scale 0.2s cubic-bezier(0.0, 0.0, 0.2, 1) forwards',
				'scale-in': 'fade-in-scale 0.2s cubic-bezier(0.0, 0.0, 0.2, 1) forwards',
				
				'slide-in-left': 'slide-in-left 0.3s cubic-bezier(0.0, 0.0, 0.2, 1)',
				'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.0, 0.0, 0.2, 1)',
				
				'lift-hover': 'lift-hover 0.2s cubic-bezier(0.4, 0.0, 0.2, 1) forwards',
				'shimmer': 'shimmer 1.5s cubic-bezier(0.4, 0.0, 0.2, 1) infinite',
				'gentle-bounce': 'gentle-bounce 2s cubic-bezier(0.4, 0.0, 0.2, 1) infinite',
				'gentle-pulse': 'gentle-pulse 2s cubic-bezier(0.4, 0.0, 0.2, 1) infinite',
				
				// Legacy support
				'pulse-soft': 'gentle-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
			}
		}
	},
	plugins: [
		require("tailwindcss-animate"),
			// Plugin to ensure OKLCH utilities are always available
		({ addUtilities }) => {
			addUtilities({
				// Brand utilities
				'.bg-brand-primary': { 
					'background': 'oklch(var(--brand-primary))', 
					'color': 'oklch(var(--brand-primary-foreground))' 
				},
				'.bg-brand-primary-hover': { 
					'background': 'oklch(var(--brand-primary-hover))', 
					'color': 'oklch(var(--brand-primary-foreground))' 
				},
				
				// AI/Maya accent utilities
				'.bg-accent-cyan': { 
					'background': 'oklch(var(--accent-cyan))', 
					'color': 'oklch(var(--accent-cyan-foreground))' 
				},
				'.bg-accent-cyan-hover': { 
					'background': 'oklch(var(--accent-cyan-hover))', 
					'color': 'oklch(var(--accent-cyan-foreground))' 
				},
				
				// Supporting accents with full utility set
				'.bg-accent-gold': { 
					'background': 'oklch(var(--accent-gold))', 
					'color': 'oklch(var(--accent-gold-foreground))' 
				},
				'.border-accent-gold': { 
					'border-color': 'oklch(var(--accent-gold))' 
				},
				'.text-accent-gold': { 
					'color': 'oklch(var(--accent-gold))' 
				},
				'.text-accent-gold-foreground': { 
					'color': 'oklch(var(--accent-gold-foreground))' 
				},
				'.ring-accent-gold': { 
					'--tw-ring-color': 'oklch(var(--accent-gold))' 
				},
				'.shadow-accent-gold': { 
					'--tw-shadow-color': 'oklch(var(--accent-gold))' 
				},
				'.bg-accent-lime': { 
					'background': 'oklch(var(--accent-lime))', 
					'color': 'oklch(var(--accent-lime-foreground))' 
				},
				
				// Risk matrix
				'.bg-risk-low': { 'background': 'oklch(var(--risk-low))', 'color': 'white' },
				'.bg-risk-medium': { 'background': 'oklch(var(--risk-medium))', 'color': 'black' },
				'.bg-risk-high': { 'background': 'oklch(var(--risk-high))', 'color': 'white' },
				'.bg-risk-critical': { 'background': 'oklch(var(--risk-critical))', 'color': 'white' },
				
				// Gradient
				'.gradient-primary': { 
					'background-image': 'linear-gradient(135deg, oklch(var(--primary)), oklch(var(--primary-hover)))' 
				}
			})
		}
	],
} satisfies Config;

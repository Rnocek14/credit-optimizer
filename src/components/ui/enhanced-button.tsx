/**
 * Enhanced Button Component - Phase 3 Implementation
 * Demonstrates full design system integration with OKLCH colors, spacing, states, and motion
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base styles with Phase 3 design system integration
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-fast ease-standard focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 touch-target interactive",
  {
    variants: {
      variant: {
        // Primary: Full OKLCH brand colors with proper states
        default: [
          "bg-primary text-primary-foreground shadow-sm",
          "hover:bg-primary-600 hover:shadow-md",
          "active:bg-primary-700", 
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        ].join(" "),
        
        // Destructive: Semantic status colors
        destructive: [
          "bg-destructive text-destructive-foreground shadow-sm",
          "hover:bg-destructive-700 hover:shadow-md",
          "active:bg-destructive-700",
          "focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2",
        ].join(" "),
        
        // Outline: Proper border states with OKLCH
        outline: [
          "border border-primary bg-background text-primary shadow-sm",
          "hover:bg-primary-50 hover:border-primary-600",
          "active:bg-primary-100",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "dark:hover:bg-primary-700/20 dark:active:bg-primary-700/30",
        ].join(" "),
        
        // Secondary: Muted appearance with consistent states
        secondary: [
          "bg-secondary text-secondary-foreground shadow-sm",
          "hover:bg-secondary-hover hover:shadow-md",
          "active:bg-accent",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        ].join(" "),
        
        // Ghost: Minimal styling with hover states
        ghost: [
          "text-foreground",
          "hover:bg-accent hover:text-accent-foreground",
          "active:bg-accent-hover",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        ].join(" "),
        
        // Link: Text-like appearance with underline
        link: [
          "text-primary underline-offset-4",
          "hover:underline hover:text-primary-600",
          "active:text-primary-700",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        ].join(" "),
        
        // Success: Status color variant
        success: [
          "bg-success text-success-foreground shadow-sm",
          "hover:bg-success-700 hover:shadow-md",
          "active:bg-success-700",
          "focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2",
        ].join(" "),
        
        // Warning: Status color variant  
        warning: [
          "bg-warning text-warning-foreground shadow-sm",
          "hover:bg-warning-700 hover:shadow-md",
          "active:bg-warning-700",
          "focus-visible:ring-2 focus-visible:ring-warning focus-visible:ring-offset-2",
        ].join(" "),
      },
      
      size: {
        // Sizes ensuring WCAG touch target compliance
        sm: "h-11 px-3 text-sm rounded-md", // 44px minimum height
        default: "h-12 px-4 py-2 rounded-lg", // Comfortable 48px
        lg: "h-13 px-6 text-lg rounded-xl", // Generous 52px
        icon: "h-11 w-11 rounded-lg", // Square touch target
        "icon-lg": "h-13 w-13 rounded-xl", // Large square target
      },
      
      // Loading state for async operations
      loading: {
        true: "text-transparent cursor-not-allowed",
      },
      
      // Enhanced visual emphasis
      emphasis: {
        low: "shadow-sm",
        medium: "shadow-md hover:shadow-lg",
        high: "shadow-lg hover:shadow-xl ring-1 ring-primary/10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      emphasis: "low",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, emphasis, asChild = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, loading, emphasis, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        )}
        {children}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
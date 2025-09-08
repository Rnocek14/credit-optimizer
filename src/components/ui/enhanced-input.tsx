/**
 * Enhanced Input Component - Phase 3 Implementation
 * Complete design system integration with focus states, touch targets, and semantic tokens
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  // Base styles with Phase 3 design system
  [
    "flex w-full border border-input bg-background text-foreground",
    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
    "placeholder:text-muted-foreground",
    "transition-all duration-fast ease-standard",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "touch-target", // Ensures WCAG compliance
    // Focus states with OKLCH primary colors
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "h-11 px-3 py-2 text-sm rounded-md", // 44px minimum
        default: "h-12 px-4 py-2 rounded-lg",    // Comfortable 48px
        lg: "h-13 px-6 py-3 text-lg rounded-xl", // Generous 52px
      },
      
      state: {
        default: "",
        error: [
          "border-destructive text-destructive",
          "focus-visible:ring-destructive focus-visible:ring-offset-destructive-light",
          "placeholder:text-destructive/70",
        ].join(" "),
        success: [
          "border-success text-success-foreground",
          "focus-visible:ring-success focus-visible:ring-offset-success-light",
        ].join(" "),
        warning: [
          "border-warning text-warning-foreground", 
          "focus-visible:ring-warning focus-visible:ring-offset-warning-light",
        ].join(" "),
      },
      
      variant: {
        default: "border-input",
        filled: "bg-muted border-transparent focus-visible:bg-background",
        underlined: [
          "border-0 border-b-2 border-muted rounded-none bg-transparent",
          "focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0",
        ].join(" "),
      },
    },
    defaultVariants: {
      size: "default",
      state: "default",
      variant: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  error?: boolean;
  success?: boolean;
  warning?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, state, variant, error, success, warning, ...props }, ref) => {
    // Automatically set state based on boolean props
    const computedState = error ? "error" : success ? "success" : warning ? "warning" : state;
    
    return (
      <input
        type={type}
        className={cn(inputVariants({ size, state: computedState, variant, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

// Enhanced TextArea component with same design system principles
const textareaVariants = cva(
  [
    "flex min-h-20 w-full border border-input bg-background text-foreground",
    "placeholder:text-muted-foreground resize-none",
    "transition-all duration-fast ease-standard", 
    "disabled:cursor-not-allowed disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "px-3 py-2 text-sm rounded-md",
        default: "px-4 py-3 rounded-lg", 
        lg: "px-6 py-4 text-lg rounded-xl",
      },
      state: {
        default: "",
        error: [
          "border-destructive text-destructive",
          "focus-visible:ring-destructive focus-visible:ring-offset-destructive-light",
        ].join(" "),
        success: [
          "border-success text-success-foreground",
          "focus-visible:ring-success focus-visible:ring-offset-success-light",
        ].join(" "),
      },
    },
    defaultVariants: {
      size: "default", 
      state: "default",
    },
  }
);

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textareaVariants> {
  error?: boolean;
  success?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, size, state, error, success, ...props }, ref) => {
    const computedState = error ? "error" : success ? "success" : state;
    
    return (
      <textarea
        className={cn(textareaVariants({ size, state: computedState, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Input, Textarea, inputVariants, textareaVariants };
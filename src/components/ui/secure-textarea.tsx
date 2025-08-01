import * as React from "react";
import { Textarea } from "./textarea";
import { cn } from "@/lib/utils";
import { validateAndSanitizeInput } from "@/lib/security";

export interface SecureTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  maxLength?: number;
  allowHtml?: boolean;
  onSecureChange?: (value: string, isValid: boolean, error?: string) => void;
  showValidation?: boolean;
}

const SecureTextarea = React.forwardRef<HTMLTextAreaElement, SecureTextareaProps>(
  ({ 
    className, 
    maxLength = 1000, 
    allowHtml = false, 
    onSecureChange,
    showValidation = true,
    ...props 
  }, ref) => {
    const [error, setError] = React.useState<string>();
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const { value, isValid, error: validationError } = validateAndSanitizeInput(
        e.target.value, 
        maxLength, 
        allowHtml
      );
      
      setError(validationError);
      onSecureChange?.(value, isValid, validationError);
      
      // Update the textarea value with sanitized content
      if (isValid && e.target.value !== value) {
        e.target.value = value;
      }
    };
    
    return (
      <div className="space-y-1">
        <Textarea
          className={cn(
            error && showValidation && "border-destructive",
            className
          )}
          ref={ref}
          onChange={handleChange}
          maxLength={maxLength}
          {...props}
        />
        {error && showValidation && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

SecureTextarea.displayName = "SecureTextarea";

export { SecureTextarea };
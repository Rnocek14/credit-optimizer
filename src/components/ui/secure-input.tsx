import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { validateAndSanitizeInput } from "@/lib/security";

export interface SecureInputProps
  extends Omit<React.ComponentProps<"input">, "onChange"> {
  maxLength?: number;
  allowHtml?: boolean;
  onSecureChange?: (value: string, isValid: boolean, error?: string) => void;
  showValidation?: boolean;
}

const SecureInput = React.forwardRef<HTMLInputElement, SecureInputProps>(
  ({ 
    className, 
    maxLength = 255, 
    allowHtml = false, 
    onSecureChange,
    showValidation = true,
    ...props 
  }, ref) => {
    const [error, setError] = React.useState<string>();
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value, isValid, error: validationError } = validateAndSanitizeInput(
        e.target.value, 
        maxLength, 
        allowHtml
      );
      
      setError(validationError);
      onSecureChange?.(value, isValid, validationError);
      
      // Update the input value with sanitized content
      if (isValid && e.target.value !== value) {
        e.target.value = value;
      }
    };
    
    return (
      <div className="space-y-1">
        <Input
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

SecureInput.displayName = "SecureInput";

export { SecureInput };
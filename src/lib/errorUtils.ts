export interface ParsedError {
  code: string;
  message: string;
  userFriendlyMessage: string;
  missing?: string[];
}

export function parseError(error: Error | string): ParsedError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // Extract code and message from "code: message" format
  const parts = errorMessage.split(': ');
  const code = parts.length > 1 ? parts[0] : 'unknown_error';
  const message = parts.length > 1 ? parts.slice(1).join(': ') : errorMessage;

  // Map technical errors to user-friendly messages
  const userFriendlyMessage = getUserFriendlyMessage(code, message);

  // Extract missing fields if present
  const missingMatch = message.match(/\(Missing: ([^)]+)\)/);
  const missing = missingMatch ? missingMatch[1].split(', ') : undefined;

  return {
    code,
    message,
    userFriendlyMessage,
    missing
  };
}

export function parseAnyError(err: unknown): ParsedError {
  // 1) Supabase Edge Function error (has context.json or code:message format)
  const e = err as any;
  if (e?.context?.json || /^(\w+):/.test(e?.message)) {
    return parseError(e?.message || e);
  }

  // 2) Zod errors or other runtime throws
  const name = e?.name ?? 'Error';
  const message = e?.message ?? 'Unknown error';
  const isZod = name === 'ZodError' || /Zod/.test(message) || /safeParse/.test(message);

  return {
    code: isZod ? 'schema_error' : 'unknown_error',
    message,
    userFriendlyMessage: isZod
      ? 'We received data in an unexpected format. Please retry; if this persists, we\'ll fix the response shape.'
      : 'An unexpected error occurred. Please try again.',
    missing: undefined
  };
}

function getUserFriendlyMessage(code: string, message: string): string {
  const codeMap: Record<string, string> = {
    'bad_request': 'Please check your input and try again.',
    'unauthorized': 'Please log in to continue.',
    'forbidden': 'You don\'t have permission to access this resource.',
    'not_found': 'The requested data could not be found.',
    'server_error': 'Something went wrong on our end. Please try again in a moment.',
    'no_data': 'No data was returned. Please try again.',
    'unknown_error': 'An unexpected error occurred. Please try again.'
  };

  // Special case handling for common scenarios
  if (message.includes('Both track IDs are required')) {
    return 'Please select both current and target career tracks.';
  }
  
  if (message.includes('Track does not belong to current user')) {
    return 'Please select tracks from your account.';
  }
  
  if (message.includes('One or both tracks not found')) {
    return 'One of the selected tracks is no longer available. Please choose different tracks.';
  }
  
  if (message.includes('Missing required parameters')) {
    return 'Please fill in all required fields.';
  }

  return codeMap[code] || message;
}
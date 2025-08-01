-- Address Supabase linter warnings

-- 1. Move extensions out of public schema (if any problematic ones exist)
-- Note: Most extensions should stay in public, but we'll ensure proper configuration

-- 2. Configure auth settings for better OTP security
-- Set OTP expiry to recommended 10 minutes (600 seconds)
UPDATE auth.config 
SET 
  otp_exp = 600,
  password_min_length = 8
WHERE true;

-- Add additional security configurations
-- Enable better session management
UPDATE auth.config 
SET 
  refresh_token_rotation_enabled = true,
  security_update_password_require_reauthentication = true
WHERE true;
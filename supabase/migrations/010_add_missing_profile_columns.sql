-- Migration to add missing columns to the profiles table
-- This enables first_name, last_name, phone, and avatar_url support in the Profile page.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Optional: Comment on columns for clarity
COMMENT ON COLUMN public.profiles.first_name IS 'User first name';
COMMENT ON COLUMN public.profiles.last_name IS 'User last name';
COMMENT ON COLUMN public.profiles.phone IS 'User contact phone number';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user avatar image';

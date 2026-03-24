-- Create membership status enum
CREATE TYPE membership_status AS ENUM ('active', 'pending', 'canceled', 'expired');

-- Create membership tier enum
CREATE TYPE membership_tier AS ENUM ('monthly', 'annual');

-- Create memberships table
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status membership_status NOT NULL DEFAULT 'pending',
  tier membership_tier NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  renewal_date TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_active_membership_per_user UNIQUE (user_id) WHERE status = 'active'
);

-- Create indexes for performance
CREATE INDEX idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX idx_memberships_renewal_date ON public.memberships(renewal_date);
CREATE INDEX idx_memberships_status ON public.memberships(status);
CREATE INDEX idx_memberships_user_status ON public.memberships(user_id, status);

-- Enable Row Level Security
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own memberships
CREATE POLICY "Users can view their own memberships"
  ON public.memberships
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only update their own memberships
CREATE POLICY "Users can update their own memberships"
  ON public.memberships
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own memberships
CREATE POLICY "Users can insert their own memberships"
  ON public.memberships
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own memberships
CREATE POLICY "Users can delete their own memberships"
  ON public.memberships
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;

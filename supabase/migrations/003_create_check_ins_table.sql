-- Create check-in type enum
CREATE TYPE check_in_type AS ENUM ('checkin', 'checkout', 'walkin');

-- Create check_ins table to track gym access
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
  check_in_type check_in_type NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  qr_data JSONB NOT NULL,
  validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_check_ins_user_id ON public.check_ins(user_id);
CREATE INDEX idx_check_ins_membership_id ON public.check_ins(membership_id);
CREATE INDEX idx_check_ins_check_in_time ON public.check_ins(check_in_time);
CREATE INDEX idx_check_ins_user_time ON public.check_ins(user_id, check_in_time DESC);
CREATE INDEX idx_check_ins_status ON public.check_ins(status);

-- Enable Row Level Security
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own check-ins
CREATE POLICY "Users can view their own check-ins"
  ON public.check_ins
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT id FROM auth.users WHERE email LIKE '%@admin%'
  ));

-- RLS Policy: Admins can insert check-ins
CREATE POLICY "Admins can insert check-ins"
  ON public.check_ins
  FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email LIKE '%@admin%'
  ));

-- RLS Policy: Admins can update check-ins
CREATE POLICY "Admins can update check-ins"
  ON public.check_ins
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email LIKE '%@admin%'
  ))
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email LIKE '%@admin%'
  ));

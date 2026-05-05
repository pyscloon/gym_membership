-- Create audit_logs table for tracking sensitive operations and system changes
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for system actions
  action_type VARCHAR(100) NOT NULL, -- e.g., 'PAYMENT_CONFIRMED', 'MEMBERSHIP_UPGRADED'
  target_id VARCHAR(255),
  target_table VARCHAR(100),
  payload JSONB, -- Stores 'before', 'after', and other context data
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_target_id ON public.audit_logs(target_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email LIKE '%@admin%'
  ));

-- RLS Policy: Authenticated users can insert audit logs (so the app can log standard user actions)
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
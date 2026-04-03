-- Crowd estimation tables for session tracking and peak-hour analytics

CREATE TABLE public.crowd_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_equipment INTEGER NOT NULL DEFAULT 50,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

INSERT INTO public.crowd_settings (id, total_equipment)
VALUES (1, 50)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.crowd_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_out_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_crowd_sessions_user_id ON public.crowd_sessions(user_id);
CREATE INDEX idx_crowd_sessions_check_in_time ON public.crowd_sessions(check_in_time DESC);
CREATE INDEX idx_crowd_sessions_check_out_time ON public.crowd_sessions(check_out_time);
CREATE INDEX idx_crowd_sessions_active ON public.crowd_sessions(check_in_time DESC) WHERE check_out_time IS NULL;

CREATE TABLE public.crowd_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  active_users INTEGER NOT NULL,
  total_equipment INTEGER NOT NULL,
  crowd_level NUMERIC(6,4) NOT NULL,
  crowd_status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_crowd_snapshots_timestamp ON public.crowd_snapshots(timestamp DESC);

ALTER TABLE public.crowd_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crowd_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crowd_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view crowd settings"
  ON public.crowd_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update crowd settings"
  ON public.crowd_settings
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email LIKE '%@admin%'
  ))
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email LIKE '%@admin%'
  ));

CREATE POLICY "Authenticated users can view crowd snapshots"
  ON public.crowd_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage crowd sessions"
  ON public.crowd_sessions
  FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email LIKE '%@admin%'
  ))
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email LIKE '%@admin%'
  ));
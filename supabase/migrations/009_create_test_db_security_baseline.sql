-- Test cave migration.
-- Use same file in API test DB and E2E test DB.
-- Big idea: same schema, different cave.

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  has_profiles boolean;
  has_is_admin boolean;
  has_role boolean;
  admin_flag boolean := false;
  role_value text := null;
BEGIN
  SELECT to_regclass('public.profiles') IS NOT NULL INTO has_profiles;

  IF NOT has_profiles OR target_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'is_admin'
  ) INTO has_is_admin;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
  ) INTO has_role;

  IF has_is_admin THEN
    EXECUTE $sql$
      SELECT COALESCE(is_admin, false)
      FROM public.profiles
      WHERE id = $1
      LIMIT 1
    $sql$
    INTO admin_flag
    USING target_user_id;
  END IF;

  IF has_role THEN
    EXECUTE $sql$
      SELECT role::text
      FROM public.profiles
      WHERE id = $1
      LIMIT 1
    $sql$
    INTO role_value
    USING target_user_id;
  END IF;

  RETURN COALESCE(admin_flag, false) OR lower(COALESCE(role_value, '')) = 'admin';
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_user(auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.membership_expiration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expired_count integer NOT NULL DEFAULT 0,
  executed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'success',
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.edge_function_registry (
  name text PRIMARY KEY,
  require_jwt boolean NOT NULL DEFAULT true,
  admin_only boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_edge_function_registry_updated_at ON public.edge_function_registry;
CREATE TRIGGER update_edge_function_registry_updated_at
BEFORE UPDATE ON public.edge_function_registry
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.edge_function_registry (name, require_jwt, admin_only, notes)
VALUES
  ('payment-transactions', true, false, 'Member submit. Admin verify. Service role do heavy lifting.'),
  ('expire-memberships', true, true, 'Cron cave. Human not poke.')
ON CONFLICT (name) DO UPDATE
SET
  require_jwt = EXCLUDED.require_jwt,
  admin_only = EXCLUDED.admin_only,
  notes = EXCLUDED.notes,
  updated_at = now();

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.walk_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crowd_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crowd_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crowd_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.membership_expiration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.edge_function_registry ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own profiles" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert their own profiles" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own profiles" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles';
    EXECUTE 'DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles';

    EXECUTE $sql$
      CREATE POLICY "profiles_select_self"
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "profiles_select_admin"
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING (public.current_user_is_admin())
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "profiles_insert_self"
      ON public.profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "profiles_update_self"
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "profiles_update_admin"
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (public.current_user_is_admin())
      WITH CHECK (public.current_user_is_admin())
    $sql$;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.memberships') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own memberships" ON public.memberships';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own memberships" ON public.memberships';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert their own memberships" ON public.memberships';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete their own memberships" ON public.memberships';
    EXECUTE 'DROP POLICY IF EXISTS "memberships_select_self" ON public.memberships';
    EXECUTE 'DROP POLICY IF EXISTS "memberships_select_admin" ON public.memberships';
    EXECUTE 'DROP POLICY IF EXISTS "memberships_insert_self" ON public.memberships';
    EXECUTE 'DROP POLICY IF EXISTS "memberships_insert_admin" ON public.memberships';
    EXECUTE 'DROP POLICY IF EXISTS "memberships_update_self" ON public.memberships';
    EXECUTE 'DROP POLICY IF EXISTS "memberships_update_admin" ON public.memberships';
    EXECUTE 'DROP POLICY IF EXISTS "memberships_delete_admin" ON public.memberships';

    EXECUTE $sql$
      CREATE POLICY "memberships_select_self"
      ON public.memberships
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "memberships_select_admin"
      ON public.memberships
      FOR SELECT
      TO authenticated
      USING (public.current_user_is_admin())
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "memberships_insert_self"
      ON public.memberships
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "memberships_insert_admin"
      ON public.memberships
      FOR INSERT
      TO authenticated
      WITH CHECK (public.current_user_is_admin())
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "memberships_update_self"
      ON public.memberships
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "memberships_update_admin"
      ON public.memberships
      FOR UPDATE
      TO authenticated
      USING (public.current_user_is_admin())
      WITH CHECK (public.current_user_is_admin())
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "memberships_delete_admin"
      ON public.memberships
      FOR DELETE
      TO authenticated
      USING (public.current_user_is_admin())
    $sql$;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.transactions') IS NOT NULL THEN
    EXECUTE $sql$DROP POLICY IF EXISTS "transactions_select_self" ON public.transactions$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "transactions_select_admin" ON public.transactions$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "transactions_insert_self" ON public.transactions$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "transactions_update_self" ON public.transactions$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "transactions_update_admin" ON public.transactions$sql$;

    EXECUTE $sql$
      CREATE POLICY "transactions_select_self"
      ON public.transactions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "transactions_select_admin"
      ON public.transactions
      FOR SELECT
      TO authenticated
      USING (public.current_user_is_admin())
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "transactions_insert_self"
      ON public.transactions
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "transactions_update_self"
      ON public.transactions
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "transactions_update_admin"
      ON public.transactions
      FOR UPDATE
      TO authenticated
      USING (public.current_user_is_admin())
      WITH CHECK (public.current_user_is_admin())
    $sql$;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.walk_ins') IS NOT NULL THEN
    EXECUTE $sql$DROP POLICY IF EXISTS "walk_ins_select_self" ON public.walk_ins$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "walk_ins_select_admin" ON public.walk_ins$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "walk_ins_insert_admin" ON public.walk_ins$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "walk_ins_update_admin" ON public.walk_ins$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "walk_ins_delete_admin" ON public.walk_ins$sql$;

    EXECUTE $sql$
      CREATE POLICY "walk_ins_select_self"
      ON public.walk_ins
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "walk_ins_select_admin"
      ON public.walk_ins
      FOR SELECT
      TO authenticated
      USING (public.current_user_is_admin())
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "walk_ins_insert_admin"
      ON public.walk_ins
      FOR INSERT
      TO authenticated
      WITH CHECK (public.current_user_is_admin())
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "walk_ins_update_admin"
      ON public.walk_ins
      FOR UPDATE
      TO authenticated
      USING (public.current_user_is_admin())
      WITH CHECK (public.current_user_is_admin())
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "walk_ins_delete_admin"
      ON public.walk_ins
      FOR DELETE
      TO authenticated
      USING (public.current_user_is_admin())
    $sql$;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.check_ins') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own check-ins" ON public.check_ins';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can insert check-ins" ON public.check_ins';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can update check-ins" ON public.check_ins';
    EXECUTE $sql$DROP POLICY IF EXISTS "check_ins_select_self" ON public.check_ins$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "check_ins_select_admin" ON public.check_ins$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "check_ins_manage_admin" ON public.check_ins$sql$;

    EXECUTE $sql$
      CREATE POLICY "check_ins_select_self"
      ON public.check_ins
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "check_ins_select_admin"
      ON public.check_ins
      FOR SELECT
      TO authenticated
      USING (public.current_user_is_admin())
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "check_ins_manage_admin"
      ON public.check_ins
      FOR ALL
      TO authenticated
      USING (public.current_user_is_admin())
      WITH CHECK (public.current_user_is_admin())
    $sql$;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.crowd_settings') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view crowd settings" ON public.crowd_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can update crowd settings" ON public.crowd_settings';
    EXECUTE $sql$DROP POLICY IF EXISTS "crowd_settings_select_all" ON public.crowd_settings$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "crowd_settings_insert_admin" ON public.crowd_settings$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "crowd_settings_update_admin" ON public.crowd_settings$sql$;

    EXECUTE $sql$
      CREATE POLICY "crowd_settings_select_all"
      ON public.crowd_settings
      FOR SELECT
      TO authenticated
      USING (true)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "crowd_settings_insert_admin"
      ON public.crowd_settings
      FOR INSERT
      TO authenticated
      WITH CHECK (public.current_user_is_admin())
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "crowd_settings_update_admin"
      ON public.crowd_settings
      FOR UPDATE
      TO authenticated
      USING (public.current_user_is_admin())
      WITH CHECK (public.current_user_is_admin())
    $sql$;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.crowd_sessions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage crowd sessions" ON public.crowd_sessions';
    EXECUTE $sql$DROP POLICY IF EXISTS "crowd_sessions_select_self" ON public.crowd_sessions$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "crowd_sessions_select_admin" ON public.crowd_sessions$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "crowd_sessions_manage_admin" ON public.crowd_sessions$sql$;

    EXECUTE $sql$
      CREATE POLICY "crowd_sessions_select_self"
      ON public.crowd_sessions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "crowd_sessions_select_admin"
      ON public.crowd_sessions
      FOR SELECT
      TO authenticated
      USING (public.current_user_is_admin())
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "crowd_sessions_manage_admin"
      ON public.crowd_sessions
      FOR ALL
      TO authenticated
      USING (public.current_user_is_admin())
      WITH CHECK (public.current_user_is_admin())
    $sql$;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.crowd_snapshots') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view crowd snapshots" ON public.crowd_snapshots';
    EXECUTE $sql$DROP POLICY IF EXISTS "crowd_snapshots_select_all" ON public.crowd_snapshots$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "crowd_snapshots_manage_admin" ON public.crowd_snapshots$sql$;

    EXECUTE $sql$
      CREATE POLICY "crowd_snapshots_select_all"
      ON public.crowd_snapshots
      FOR SELECT
      TO authenticated
      USING (true)
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "crowd_snapshots_manage_admin"
      ON public.crowd_snapshots
      FOR ALL
      TO authenticated
      USING (public.current_user_is_admin())
      WITH CHECK (public.current_user_is_admin())
    $sql$;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs';
    EXECUTE $sql$DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "audit_logs_insert_actor" ON public.audit_logs$sql$;

    EXECUTE $sql$
      CREATE POLICY "audit_logs_select_admin"
      ON public.audit_logs
      FOR SELECT
      TO authenticated
      USING (public.current_user_is_admin())
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "audit_logs_insert_actor"
      ON public.audit_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (actor_id IS NULL OR actor_id = auth.uid())
    $sql$;
  END IF;
END
$$;

DO $$
BEGIN
  EXECUTE $sql$DROP POLICY IF EXISTS "membership_expiration_logs_select_admin" ON public.membership_expiration_logs$sql$;
  EXECUTE $sql$DROP POLICY IF EXISTS "membership_expiration_logs_insert_admin" ON public.membership_expiration_logs$sql$;

  EXECUTE $sql$
    CREATE POLICY "membership_expiration_logs_select_admin"
    ON public.membership_expiration_logs
    FOR SELECT
    TO authenticated
    USING (public.current_user_is_admin())
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "membership_expiration_logs_insert_admin"
    ON public.membership_expiration_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_is_admin())
  $sql$;
END
$$;

DO $$
BEGIN
  EXECUTE $sql$DROP POLICY IF EXISTS "edge_function_registry_select_reader" ON public.edge_function_registry$sql$;
  EXECUTE $sql$DROP POLICY IF EXISTS "edge_function_registry_manage_admin" ON public.edge_function_registry$sql$;

  EXECUTE $sql$
    CREATE POLICY "edge_function_registry_select_reader"
    ON public.edge_function_registry
    FOR SELECT
    TO authenticated
    USING (NOT admin_only OR public.current_user_is_admin())
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "edge_function_registry_manage_admin"
    ON public.edge_function_registry
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin())
  $sql$;
END
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'uploads',
    'uploads',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/jpg', 'image/png']
  ),
  (
    'flex-republic-assets',
    'flex-republic-assets',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authenticated users can upload to uploads bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view uploads bucket" ON storage.objects;
DROP POLICY IF EXISTS "uploads_select" ON storage.objects;
DROP POLICY IF EXISTS "uploads_insert" ON storage.objects;
DROP POLICY IF EXISTS "uploads_update" ON storage.objects;
DROP POLICY IF EXISTS "uploads_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;

CREATE POLICY "uploads_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'uploads');

CREATE POLICY "uploads_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "uploads_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.current_user_is_admin()
  )
)
WITH CHECK (
  bucket_id = 'uploads'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.current_user_is_admin()
  )
);

CREATE POLICY "uploads_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.current_user_is_admin()
  )
);

CREATE POLICY "avatars_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'flex-republic-assets');

CREATE POLICY "avatars_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'flex-republic-assets'
  AND name LIKE 'avatars/' || auth.uid()::text || '.%'
);

CREATE POLICY "avatars_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'flex-republic-assets'
  AND (
    name LIKE 'avatars/' || auth.uid()::text || '.%'
    OR public.current_user_is_admin()
  )
)
WITH CHECK (
  bucket_id = 'flex-republic-assets'
  AND (
    name LIKE 'avatars/' || auth.uid()::text || '.%'
    OR public.current_user_is_admin()
  )
);

CREATE POLICY "avatars_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'flex-republic-assets'
  AND (
    name LIKE 'avatars/' || auth.uid()::text || '.%'
    OR public.current_user_is_admin()
  )
);

GRANT SELECT, INSERT, UPDATE ON public.edge_function_registry TO authenticated;
GRANT SELECT ON public.membership_expiration_logs TO authenticated;

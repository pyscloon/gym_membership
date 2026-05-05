ALTER TABLE IF EXISTS public.transactions
ADD COLUMN IF NOT EXISTS discount_id_proof_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authenticated users can upload to uploads bucket" ON storage.objects;
CREATE POLICY "Authenticated users can upload to uploads bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "Authenticated users can view uploads bucket" ON storage.objects;
CREATE POLICY "Authenticated users can view uploads bucket"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'uploads');

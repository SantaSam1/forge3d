-- Create storage bucket for 3D models
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'models',
  'models',
  true,
  52428800, -- 50MB
  ARRAY['model/gltf-binary', 'model/gltf+json', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read models"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'models');

CREATE POLICY "Service role can upload models"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'models');

CREATE POLICY "Service role can update models"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'models');

-- Add generation_count helper (optional denormalized column for fast checks)
ALTER TABLE models ADD COLUMN IF NOT EXISTS generation_index integer;

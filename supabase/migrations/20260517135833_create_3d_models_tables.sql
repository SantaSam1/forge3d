/*
  # 3D Design Service - Initial Schema

  ## New Tables

  1. `models`
     - `id` (uuid, primary key)
     - `user_id` (uuid, references auth.users - nullable for anonymous)
     - `name` (text) - model display name
     - `prompt` (text) - AI prompt used to generate
     - `status` (text) - pending | processing | ready | failed
     - `source_type` (text) - ai_generated | uploaded | library
     - `file_url` (text) - Supabase Storage URL
     - `thumbnail_url` (text)
     - `format` (text) - glb, obj, gltf, usdz, stl
     - `file_size` (bigint)
     - `metadata` (jsonb)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  2. `library_models`
     - Pre-built models available to all users
     - `id`, `name`, `category`, `file_url`, `thumbnail_url`, `tags`, `created_at`

  ## Security
  - RLS enabled on both tables
  - Users can only view/edit their own models
  - Library models are publicly readable
*/

CREATE TABLE IF NOT EXISTS models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  prompt text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  source_type text NOT NULL DEFAULT 'ai_generated',
  file_url text DEFAULT '',
  thumbnail_url text DEFAULT '',
  format text DEFAULT 'glb',
  file_size bigint DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS library_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'misc',
  file_url text NOT NULL DEFAULT '',
  thumbnail_url text DEFAULT '',
  tags text[] DEFAULT '{}',
  downloads integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own models"
  ON models FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anonymous can view public models by session"
  ON models FOR SELECT
  TO anon
  USING (user_id IS NULL);

CREATE POLICY "Users can insert own models"
  ON models FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anon can insert models without user"
  ON models FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Users can update own models"
  ON models FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own models"
  ON models FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Library models are public readable"
  ON library_models FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO library_models (name, category, file_url, thumbnail_url, tags) VALUES
  ('Simple Cube', 'primitives', '', 'https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?w=400', ARRAY['cube', 'basic', 'primitive']),
  ('Low Poly Tree', 'nature', '', 'https://images.pexels.com/photos/1179229/pexels-photo-1179229.jpeg?w=400', ARRAY['tree', 'nature', 'low-poly']),
  ('Sci-Fi Helmet', 'characters', '', 'https://images.pexels.com/photos/355948/pexels-photo-355948.jpeg?w=400', ARRAY['helmet', 'sci-fi', 'armor']),
  ('Abstract Sculpture', 'art', '', 'https://images.pexels.com/photos/2123337/pexels-photo-2123337.jpeg?w=400', ARRAY['abstract', 'art', 'sculpture']),
  ('Modern Chair', 'furniture', '', 'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?w=400', ARRAY['chair', 'furniture', 'modern']),
  ('Robot Character', 'characters', '', 'https://images.pexels.com/photos/2599244/pexels-photo-2599244.jpeg?w=400', ARRAY['robot', 'character', 'sci-fi']);
